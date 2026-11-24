// Arena dioramas built from the sim's layout (src/sim/arenas.ts). 1 world unit = 1 tile.
// The sim's x maps to world x and the sim's y maps to world z, both centered on the arena.
import * as THREE from "three";
import { TILE } from "../sim/constants";
import type { ArenaDef } from "../sim/arenas";

interface Theme { floorA: string; floorB: string; wall: string; wallTop: string; cover: string; coverTop: string; back: string; sky: string; city: string; bg: string; glow: boolean }
const THEMES: Record<string, Theme> = {
  office: { floorA: "#4fbfae", floorB: "#45b0a0", wall: "#e3ddff", wallTop: "#ffb259", cover: "#ffb259", coverTop: "#ffd08a", back: "#3a3a86", sky: "#7ec8ff", city: "#4a63b8", bg: "#2a2a66", glow: false },
  terminal: { floorA: "#10261a", floorB: "#0c1f15", wall: "#0f2a1f", wallTop: "#1f6b45", cover: "#143a2a", coverTop: "#2a8a58", back: "#07120c", sky: "#0b2a1a", city: "#1a5a3a", bg: "#050c08", glow: true },
};

export interface ArenaScene { group: THREE.Group; bg: THREE.Color }

export function buildArena(a: ArenaDef, quality: "high" | "low"): ArenaScene {
  const th = THEMES[a.id] ?? THEMES.office;
  const g = new THREE.Group();
  const W = a.w / TILE, H = a.h / TILE;
  const wx = (x: number) => x / TILE - W / 2, wz = (y: number) => y / TILE - H / 2;
  const std = (hex: string, rough = 0.7, emissive?: string) => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, emissive: emissive ?? "#000000", emissiveIntensity: emissive ? 0.35 : 0 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, shadows = true) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = shadows; b.receiveShadow = true; g.add(b); return b;
  };

  // floor: instanced carpet tiles with tiny height jitter for a chunky look
  const tileGeo = new THREE.BoxGeometry(0.97, 0.4, 0.97);
  for (const [k, col] of [[0, th.floorA], [1, th.floorB]] as const) {
    const cells: [number, number][] = [];
    for (let x = 0; x < W; x++) for (let z = 0; z < H; z++) if ((x + z) % 2 === k) cells.push([x, z]);
    const im = new THREE.InstancedMesh(tileGeo, std(col, 0.85), cells.length);
    const m = new THREE.Matrix4();
    cells.forEach(([x, z], n) => { m.makeTranslation(x + 0.5 - W / 2, -0.2 + (((x * 73 + z * 31) % 7) - 3) * 0.006, z + 0.5 - H / 2); im.setMatrixAt(n, m); });
    im.receiveShadow = true; g.add(im);
  }
  if (th.glow) { const grid = new THREE.GridHelper(Math.max(W, H), Math.max(W, H), "#39ff7a", "#1d6a40"); grid.position.y = 0.01; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35; g.add(grid); }

  // walls: a ring of low cubicle blocks
  const wallM = std(th.wall, 0.75), topM = std(th.wallTop, 0.5, th.glow ? th.wallTop : undefined);
  const ring = (x: number, z: number, w: number, d: number) => { box(w, 1.0, d, wallM, x, 0.5, z); box(w + 0.04, 0.12, d + 0.04, topM, x, 1.06, z, false); };
  for (let x = -W / 2 - 0.5; x <= W / 2 + 0.5; x += 1) { ring(x, -H / 2 - 0.5, 0.96, 0.96); ring(x, H / 2 + 0.5, 0.96, 0.96); }
  for (let z = -H / 2 + 0.5; z <= H / 2 - 0.5; z += 1) { ring(-W / 2 - 0.5, z, 0.96, 0.96); ring(W / 2 + 0.5, z, 0.96, 0.96); }

  // cover: desks (office) or glowing blocks (terminal)
  const coverM = std(th.cover, 0.55), coverTopM = std(th.coverTop, 0.45, th.glow ? th.coverTop : undefined);
  for (const [x1, y1, x2, y2] of a.cover) {
    const w = (x2 - x1) / TILE, d = (y2 - y1) / TILE, cx = wx((x1 + x2) / 2), cz = wz((y1 + y2) / 2);
    box(w, 0.72, d, coverM, cx, 0.36, cz);
    box(w + 0.06, 0.1, d + 0.06, coverTopM, cx, 0.77, cz);
    if (!th.glow && w >= 1.5) {
      const mon = box(0.8, 0.5, 0.06, std("#2a2b5a", 0.4), cx, 1.1, cz - d / 2 + 0.25);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshBasicMaterial({ color: "#7dffcf" })); scr.position.set(0, 0, 0.035); mon.add(scr);
    }
  }

  // backdrop behind the far wall: windows with a skyline (office) or code rain (terminal)
  const back = box(W + 6, 7, 0.4, std(th.back, 0.9), 0, 3.5, -H / 2 - 2.2, false);
  back.receiveShadow = false;
  for (let k = -2; k <= 2; k++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), new THREE.MeshBasicMaterial({ color: th.sky }));
    win.position.set(k * 3.4, 3.6, -H / 2 - 1.98); g.add(win);
    for (let b = 0; b < 4; b++) {
      const h = 0.6 + ((k * 7 + b * 13 + 40) % 5) * 0.25;
      const bld = new THREE.Mesh(new THREE.PlaneGeometry(0.5, h), new THREE.MeshBasicMaterial({ color: th.city }));
      bld.position.set(k * 3.4 - 0.95 + b * 0.63, 2.4 + h / 2, -H / 2 - 1.97); g.add(bld);
    }
  }
  if (quality === "high" && !th.glow) {
    for (const sx of [-1, 1]) { // plants in the far corners
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.5, 16), std("#ff7a5c")); pot.position.set(sx * (W / 2 + 0.5), 1.3, -H / 2 - 0.5); pot.castShadow = true; g.add(pot);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), std("#3fae6a")); leaf.position.set(sx * (W / 2 + 0.5), 1.85, -H / 2 - 0.5); leaf.castShadow = true; g.add(leaf);
    }
  }
  return { group: g, bg: new THREE.Color(th.bg) };
}
