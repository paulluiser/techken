// Stand-in chibi models built from primitives (art direction: design/art/reference-archero2.md).
// R6 replaces these with modelled and rigged characters; the part names stay the same.
import * as THREE from "three";

export type HairStyle = "spiky" | "bun" | "bob" | "short" | "hood" | "beret" | "headset" | "ponytail" | "cap";
export interface Look { hair: string; top: string; pants: string; skin: string; shoe: string; style: HairStyle; prop?: "keyboard" | "db" | "magnifier" | "phone" }

/** One look per job, in roster order (data/kits.gen.ts). */
export const LOOKS: Look[] = [
  { hair: "#3b3570", top: "#38c98a", pants: "#2f3566", skin: "#ffd6bd", shoe: "#ffffff", style: "spiky", prop: "keyboard" },
  { hair: "#3a2a4a", top: "#ff6b9a", pants: "#2f3566", skin: "#ffdcc6", shoe: "#ffffff", style: "ponytail", prop: "phone" },
  { hair: "#ffd86b", top: "#9b6bff", pants: "#30305a", skin: "#ffdcc6", shoe: "#ffffff", style: "bob", prop: "magnifier" },
  { hair: "#4a3020", top: "#6f7dff", pants: "#2f3566", skin: "#e8b48f", shoe: "#2b2b3a", style: "short" },
  { hair: "#4a3020", top: "#4db6ff", pants: "#2f3566", skin: "#d9a07a", shoe: "#ffffff", style: "headset" },
  { hair: "#7a4526", top: "#ff9a3d", pants: "#3a3566", skin: "#f5c29c", shoe: "#3a3566", style: "bun", prop: "db" },
  { hair: "#2b2b3a", top: "#e0b03a", pants: "#3a3566", skin: "#e8b48f", shoe: "#2b2b3a", style: "cap" },
  { hair: "#f2f6ff", top: "#8fd0ff", pants: "#2f3566", skin: "#ffe0cc", shoe: "#ffffff", style: "short" },
  { hair: "#c2563a", top: "#f28fb0", pants: "#30305a", skin: "#ffd6bd", shoe: "#ffffff", style: "headset" },
  { hair: "#1f2a35", top: "#3a7d8c", pants: "#1f2a35", skin: "#ffd6bd", shoe: "#1f2a35", style: "hood" },
  { hair: "#a33b2b", top: "#5fd0c0", pants: "#30305a", skin: "#ffd6bd", shoe: "#ffffff", style: "bob" },
  { hair: "#2b2b3a", top: "#b58cff", pants: "#30305a", skin: "#e8b48f", shoe: "#ffffff", style: "short" },
  { hair: "#6b3e22", top: "#8bd45a", pants: "#30305a", skin: "#ffdcc6", shoe: "#2b2b3a", style: "bob" },
  { hair: "#2b2b3a", top: "#ff5d7a", pants: "#2f3566", skin: "#e8b48f", shoe: "#2b2b3a", style: "short" },
  { hair: "#e05a8a", top: "#ffcf4d", pants: "#3a3566", skin: "#ffe0cc", shoe: "#ffffff", style: "beret" },
  { hair: "#1c1838", top: "#c9b48a", pants: "#30305a", skin: "#ffd6bd", shoe: "#2b2b3a", style: "ponytail" },
  { hair: "#2fd3ff", top: "#ff4fd8", pants: "#30305a", skin: "#ffd6bd", shoe: "#ffffff", style: "cap" },
];

/** Palette 1 is the mirror-match alternate: shifts the outfit hue. */
export function lookFor(job: number, palette: number): Look {
  const l = LOOKS[job] ?? LOOKS[0];
  if (!palette) return l;
  const shift = (hex: string, deg: number, light = 0) => { const c = new THREE.Color(hex); const h = { h: 0, s: 0, l: 0 }; c.getHSL(h); c.setHSL((h.h + deg / 360 + 1) % 1, h.s, Math.min(0.9, Math.max(0.1, h.l + light))); return `#${c.getHexString()}`; };
  return { ...l, top: shift(l.top, 150), hair: shift(l.hair, 0, -0.08), pants: shift(l.pants, 40) };
}

export interface Chibi {
  root: THREE.Group; body: THREE.Group; head: THREE.Group; armR: THREE.Group; armL: THREE.Group;
  prop: THREE.Object3D | null;
  mats: THREE.MeshStandardMaterial[];
  base: THREE.Color[];
}

/** Builds a chibi about 2.2 units tall, facing +z, feet at y = 0. */
export function buildChibi(look: Look, quality: "high" | "low" = "high"): Chibi {
  const seg = quality === "high" ? 28 : 14;
  const mats: THREE.MeshStandardMaterial[] = [], base: THREE.Color[] = [];
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  const M = (hex: string, rough = 0.55) => {
    const k = hex + rough;
    let m = cache.get(k);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: rough }); cache.set(k, m); mats.push(m); base.push(m.color.clone()); }
    return m;
  };
  const basic = (hex: string) => new THREE.MeshBasicMaterial({ color: hex });
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; };
  const sph = (r: number, mat: THREE.Material, s: [number, number, number] = [1, 1, 1]) => { const m = mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.7)), mat); m.scale.set(...s); return m; };
  const cyl = (rt: number, rb: number, h: number, mat: THREE.Material) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  const box = (w: number, h: number, d: number, mat: THREE.Material) => mesh(new THREE.BoxGeometry(w, h, d), mat);
  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };

  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  root.add(body);
  for (const sx of [-1, 1]) { body.add(at(cyl(0.12, 0.13, 0.3, M(look.pants)), sx * 0.15, 0.27, 0)); body.add(at(sph(0.17, M(look.shoe, 0.4), [1, 0.62, 1.35]), sx * 0.16, 0.1, 0.06)); }
  body.add(at(cyl(0.3, 0.4, 0.52, M(look.top)), 0, 0.66, 0));
  body.add(at(sph(0.34, M(look.top), [1, 0.42, 1]), 0, 0.92, 0));
  head.position.set(0, 1.55, 0); body.add(head);
  head.add(sph(0.7, M(look.skin, 0.6), [1.06, 0.94, 1]));
  const hair = M(look.hair, 0.35);
  if (look.style !== "hood") {
    const cap = mesh(new THREE.SphereGeometry(0.74, seg, seg, 0, Math.PI * 2, 0, look.style === "short" || look.style === "cap" ? 1.35 : 1.65), hair);
    cap.position.set(0, 0.05, -0.04); head.add(cap);
    if (look.style !== "short" && look.style !== "cap") head.add(at(sph(0.7, hair), 0, 0, -0.16));
  }
  for (const sx of [-1, 1]) {
    head.add(at(sph(0.15, M("#1c1838", 0.2), [0.78, 1.15, 0.35]), sx * 0.26, -0.06, 0.64));
    head.add(at(sph(0.05, basic("#ffffff")), sx * 0.26 - 0.04, 0.03, 0.7));
    head.add(at(sph(0.022, basic("#ffffff")), sx * 0.26 + 0.04, -0.12, 0.7));
    head.add(at(sph(0.09, M("#ff8fa8", 0.8), [1.4, 0.55, 0.3]), sx * 0.42, -0.24, 0.55));
  }
  switch (look.style) {
    case "spiky":
      for (const [x, y, z, rz, rx] of [[-0.35, 0.62, 0.1, 0.7, 0.2], [0.05, 0.75, 0.05, 0.1, 0.3], [0.38, 0.6, 0.1, -0.6, 0.2], [-0.1, 0.5, 0.45, 0.2, 0.9], [0.25, 0.5, 0.42, -0.3, 0.9]]) { const t = sph(0.22, hair, [0.7, 1.5, 0.7]); t.position.set(x, y, z); t.rotation.set(rx, 0, rz); head.add(t); }
      break;
    case "bun": head.add(at(sph(0.26, hair), 0, 0.74, -0.2)); head.add(at(sph(0.52, hair, [1, 0.6, 0.8]), 0, -0.4, 0.16)); break;
    case "bob": for (const sx of [-1, 1]) head.add(at(sph(0.32, hair, [0.8, 1.3, 0.9]), sx * 0.6, -0.25, 0.05)); break;
    case "ponytail": { const p = sph(0.24, hair, [0.8, 1.6, 0.8]); p.position.set(0, 0.1, -0.85); p.rotation.x = -0.6; head.add(p); break; }
    case "hood": { const h = mesh(new THREE.SphereGeometry(0.8, seg, seg, 0, Math.PI * 2, 0, 2.2), M(look.top, 0.7)); h.position.set(0, 0.04, -0.08); h.rotation.x = -0.35; head.add(h); break; }
    case "beret": head.add(at(sph(0.6, M("#d6336c", 0.7), [1.1, 0.35, 1.1]), 0.1, 0.62, -0.05)); break;
    case "cap": { head.add(at(sph(0.76, M(look.top, 0.6), [1, 0.55, 1]), 0, 0.32, -0.02)); head.add(at(box(0.7, 0.06, 0.45, M(look.top, 0.6)), 0, 0.33, 0.6)); break; }
    case "headset": { const r = mesh(new THREE.TorusGeometry(0.78, 0.05, 10, seg, Math.PI), M("#2b2b3a")); r.position.y = 0.05; head.add(r); for (const sx of [-1, 1]) head.add(at(sph(0.18, M("#2b2b3a"), [0.6, 1, 1]), sx * 0.76, -0.05, 0)); break; }
  }
  const arm = (sx: number) => { const p = new THREE.Group(); p.position.set(sx * 0.42, 0.84, 0); p.add(at(cyl(0.1, 0.1, 0.36, M(look.top)), 0, -0.18, 0)); p.add(at(sph(0.15, M(look.skin, 0.6)), 0, -0.4, 0)); body.add(p); return p; };
  const armR = arm(-1), armL = arm(1);
  let prop: THREE.Object3D | null = null;
  if (look.prop === "keyboard") {
    const kb = new THREE.Group(); kb.add(box(0.95, 0.1, 0.34, M("#3a3f62", 0.4)));
    for (let k = 0; k < 6; k++) kb.add(at(box(0.12, 0.07, 0.12, M(["#ffcf4d", "#ff6b9a", "#6fd8ff"][k % 3], 0.4)), -0.38 + k * 0.15, 0.08, 0));
    kb.position.set(0, -0.62, 0.1); kb.rotation.set(0.2, 0, 1.45); armR.add(kb); prop = kb;
  } else if (look.prop === "db") {
    const d = new THREE.Group();
    for (let k = 0; k < 3; k++) { d.add(at(cyl(0.42, 0.42, 0.2, M("#3f7fe0", 0.35)), 0, k * 0.24, 0)); d.add(at(sph(0.04, basic("#6dff9a")), 0.28, k * 0.24, 0.32)); }
    d.position.set(0, 0.5, 0.72); body.add(d); prop = d;
    armR.rotation.set(-1.2, 0, 0.3); armL.rotation.set(-1.2, 0, -0.3);
  } else if (look.prop === "magnifier") {
    const mg = new THREE.Group(); mg.add(mesh(new THREE.TorusGeometry(0.22, 0.05, 10, seg), M("#ffcf4d", 0.3)));
    mg.add(at(cyl(0.05, 0.05, 0.4, M("#7a4526")), 0, -0.4, 0)); mg.position.set(0, -0.75, 0.25); armR.add(mg); prop = mg;
  } else if (look.prop === "phone") {
    const ph = box(0.3, 0.5, 0.06, M("#2b2b3a", 0.3)); ph.position.set(0, -0.6, 0.15); armR.add(ph); prop = ph;
  }
  return { root, body, head, armR, armL, prop, mats, base };
}
