// three.js view of the sim. Reads Driver.state every animation frame and never changes it.
import * as THREE from "three";
import * as C from "../sim/constants";
import { ARENAS } from "../sim/arenas";
import { IMPL } from "../sim/core";
import { KITS } from "../sim/data/kits.gen";
import { cosA, sinA } from "../sim/fixed";
import { FX, S, type Fighter, type State } from "../sim/types";
import type { Driver } from "../game/driver";
import type { AimPreview } from "../game/input-sources";
import type { Settings } from "../ui/settings";
import { buildArena } from "./arena3d";
import { buildChibi, lookFor, type Chibi } from "./models";
import { Hud } from "./hud";
import { EntityArt, JOB_ACCENT, type EntView } from "./entities3d";

const TAU = Math.PI * 2;
/** Stand-in chibis are about 2.2 units tall; this keeps them readable next to 1-tile-wide hitboxes. */
export const MODEL_SCALE = 0.72;
const angRad = (a: number) => (a / 64) * TAU;

function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d")!, g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function textTexture(t: string, color: string): THREE.Texture {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.font = "bold 76px 'Lilita One', Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.lineWidth = 12; x.strokeStyle = "#1a1636"; x.strokeText(t, 64, 68); x.fillStyle = color; x.fillText(t, 64, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

interface FighterView {
  key: string; chibi: Chibi; team: THREE.Mesh; charge: THREE.Mesh; slash: THREE.Group; slashMat: THREE.MeshBasicMaterial;
  glow: THREE.Sprite; stars: THREE.Sprite; zzz: THREE.Sprite; target: THREE.Mesh; trail: THREE.Sprite[];
  lastX: number; lastZ: number; walk: number; yaw: number;
}
interface Transient { obj: THREE.Object3D; t: number; life: number; tick: (k: number, o: THREE.Object3D) => void }

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 200);
  private arenaKey = "";
  private arenaGroup: THREE.Group | null = null;
  private views: (FighterView | null)[] = [null, null];
  private ents = new Map<number, EntView & { b: string }>();
  private art: EntityArt;
  private fxSeen = new Set<string>();
  private transients: Transient[] = [];
  private shake = 0;
  private glowTex = glowTexture();
  private chargeGeos: THREE.RingGeometry[] = [];
  private ray = new THREE.Raycaster();
  private floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private sun: THREE.DirectionalLight;
  private portraitGl: THREE.WebGLRenderer | null = null;
  private portraits = new Map<string, string>();
  readonly hud: Hud;
  aim: () => AimPreview = () => ({ on: false, kind: "mouse", slot: 0, angle: 0, dist: 0 });
  private aimGuide: THREE.Mesh;
  private lockRing: THREE.Mesh;
  private reachRing: THREE.Mesh;
  /** Basic attacks auto-aim (Control Panel → Controls → Attack aim). */
  autoAttack: () => boolean = () => true;
  private aimSpot: THREE.Mesh;

  constructor(private host: HTMLElement, private driver: Driver, private settings: () => Settings) {
    const q = settings().quality;
    this.gl = new THREE.WebGLRenderer({ antialias: q === "high", powerPreference: "high-performance" });
    this.gl.setPixelRatio(Math.min(devicePixelRatio, q === "high" ? 2 : 1));
    this.gl.toneMapping = THREE.ACESFilmicToneMapping; this.gl.toneMappingExposure = 1.0;
    this.gl.shadowMap.enabled = q === "high"; this.gl.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(this.gl.domElement);
    this.art = new EntityArt(this.scene, this.glowTex, textTexture);
    this.hud = new Hud(host);

    this.scene.add(new THREE.HemisphereLight("#fff4e6", "#5a52b8", 1.6));
    this.sun = new THREE.DirectionalLight("#fff1dc", 2.4);
    this.sun.position.set(4, 14, 8); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -11, right: 11, top: 9, bottom: -9, near: 1, far: 40 });
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun);
    const rim = new THREE.DirectionalLight("#8fe8ff", 1.2); rim.position.set(-3, 6, -10); this.scene.add(rim);

    for (let k = 0; k <= 24; k++) this.chargeGeos.push(new THREE.RingGeometry(0.62, 0.78, 40, 1, Math.PI / 2, (k / 24) * TAU));
    this.aimGuide = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.22), new THREE.MeshBasicMaterial({ color: "#fff1a6", transparent: true, opacity: 0.55, depthWrite: false }));
    this.aimGuide.rotation.x = -Math.PI / 2; this.aimGuide.renderOrder = 2;
    this.aimSpot = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 32), new THREE.MeshBasicMaterial({ color: "#fff1a6", transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
    this.aimSpot.rotation.x = -Math.PI / 2;
    this.scene.add(this.aimGuide, this.aimSpot);
    const flatRing = (inner: number, outer: number, color: string, op: number) => { const m = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 56), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
    this.lockRing = flatRing(0.62, 0.78, "#ff5a4d", 0.9);
    this.reachRing = flatRing(0.97, 1.0, "#ffffff", 0.7);
    this.scene.add(this.lockRing, this.reachRing);

    addEventListener("resize", () => this.resize());
    this.resize();
  }

  private resize() {
    const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight;
    this.gl.setSize(w, h);
    this.camera.aspect = w / h;
    // fit the whole arena (about 17 x 11 world units including walls) whatever the aspect ratio
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 2;
    const d = Math.max(17.5 / (this.camera.aspect * t), 12.4 / t);
    const dir = new THREE.Vector3(0, 0.82, 0.57).normalize();
    this.camera.position.copy(dir.multiplyScalar(d)).add(new THREE.Vector3(0, 0, 0.6));
    this.camera.lookAt(0, 0, 0.75);
    this.camera.updateProjectionMatrix();
    this.hud.resize(w, h);
  }

  /** Converts a screen point to sim floor coordinates (milli-tiles), for mouse aiming. */
  screenToFloor = (cx: number, cy: number): { x: number; y: number } | null => {
    const r = this.gl.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), this.camera);
    const p = new THREE.Vector3();
    if (!this.ray.ray.intersectPlane(this.floor, p)) return null;
    const a = ARENAS[this.driver.state.cfg.arena];
    return { x: Math.round((p.x + a.w / C.TILE / 2) * C.TILE), y: Math.round((p.z + a.h / C.TILE / 2) * C.TILE) };
  };

  private world(s: State, x: number, y: number) {
    const a = ARENAS[s.cfg.arena];
    return { x: x / C.TILE - a.w / C.TILE / 2, z: y / C.TILE - a.h / C.TILE / 2 };
  }
  private project(v: THREE.Vector3): [number, number] {
    const p = v.clone().project(this.camera);
    return [((p.x + 1) / 2) * this.hud.w, ((1 - p.y) / 2) * this.hud.h];
  }

  /** A head-and-shoulders portrait of a job as a data URL (cached). */
  portrait(job: number, palette = 0): string {
    const key = `${job}:${palette}`;
    const hit = this.portraits.get(key);
    if (hit) return hit;
    if (!this.portraitGl) { this.portraitGl = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); this.portraitGl.setSize(128, 128); this.portraitGl.toneMapping = THREE.ACESFilmicToneMapping; }
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight("#ffffff", "#7a70c8", 2.2));
    const l = new THREE.DirectionalLight("#ffffff", 2); l.position.set(2, 3, 4); sc.add(l);
    const c = buildChibi(lookFor(job, palette), "high");
    c.root.rotation.y = 0.35; sc.add(c.root);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20); cam.position.set(0.3, 1.75, 3.6); cam.lookAt(0, 1.45, 0);
    this.portraitGl.render(sc, cam);
    const url = this.portraitGl.domElement.toDataURL("image/png");
    this.portraits.set(key, url);
    return url;
  }

  // ---------- per-frame ----------
  frame() {
    const s = this.driver.state, q = this.settings().quality;
    const aKey = `${s.cfg.arena}:${q}`;
    if (aKey !== this.arenaKey) {
      if (this.arenaGroup) this.scene.remove(this.arenaGroup);
      const a = buildArena(ARENAS[s.cfg.arena], q);
      this.arenaGroup = a.group; this.scene.add(a.group); this.scene.background = a.bg; this.arenaKey = aKey;
      this.clearEnts();
    }
    const local = this.driver.mode === "attract" ? -1 : this.driver.mode === "online" ? this.driver.me : 0;
    for (const i of [0, 1]) this.updateFighter(s, i, local);
    this.updateEntities(s);
    this.updateFx(s);
    this.updateAim(s, local);
    for (let k = this.transients.length - 1; k >= 0; k--) {
      const t = this.transients[k];
      t.t++;
      t.tick(t.t / t.life, t.obj);
      if (t.t >= t.life) { this.scene.remove(t.obj); this.transients.splice(k, 1); }
    }
    const base = this.camera.position.clone();
    if (this.shake > 0 && this.settings().shake) { this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.25; this.camera.position.z += (Math.random() - 0.5) * this.shake * 0.25; this.shake *= 0.85; if (this.shake < 0.05) this.shake = 0; }
    this.gl.render(this.scene, this.camera);
    this.camera.position.copy(base);
    this.hud.draw({
      s, local, names: this.driver.view.names, mode: this.driver.mode, settings: this.settings(),
      project: (x, y, h) => { const w = this.world(s, x, y); return this.project(new THREE.Vector3(w.x, h, w.z)); },
      portrait: (j, p) => this.portrait(j, p), palettes: this.driver.view.palettes,
    });
  }

  private makeView(f: Fighter, i: number, palette: number): FighterView {
    const chibi = buildChibi(lookFor(f.job, palette), this.settings().quality);
    chibi.root.scale.setScalar(MODEL_SCALE);
    this.scene.add(chibi.root);
    const flat = (geo: THREE.BufferGeometry, color: string, op = 0.9) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; return m; };
    const team = flat(new THREE.RingGeometry(0.5, 0.6, 40), i === 0 ? "#5fe08a" : "#ff7a6b", 0.85);
    const charge = flat(this.chargeGeos[0], "#ffd34d", 0.95); charge.position.y = 0.04;
    chibi.root.add(team, charge);
    const impl = IMPL[f.job], range = (impl?.range ?? 1600) / C.TILE, arc = ((impl?.arc ?? 11) / 64) * TAU;
    const slashMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const slashMesh = new THREE.Mesh(new THREE.RingGeometry(0.55, range, 24, 1, -arc, 2 * arc), slashMat); slashMesh.rotation.x = -Math.PI / 2;
    const slash = new THREE.Group(); slash.add(slashMesh); slash.position.y = 0.6; this.scene.add(slash);
    slash.visible = !KITS[f.job].ranged;
    const spr = (tex: THREE.Texture, color: string, size: number, additive = true) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); sp.scale.set(size, size, 1); return sp; };
    const glow = spr(this.glowTex, "#ffd34d", 2.2); glow.position.y = 1.2; chibi.root.add(glow);
    const stars = spr(textTexture("★", "#ffe14d"), "#ffffff", 0.8, false); stars.position.y = 2.75; chibi.root.add(stars);
    const zzz = spr(textTexture("z", "#c9c6ff"), "#ffffff", 0.7, false); zzz.position.set(0.5, 2.7, 0); chibi.root.add(zzz);
    const target = flat(new THREE.RingGeometry(1.5, 1.8, 48), "#ff7a3d", 0.8); this.scene.add(target);
    const trail = [0, 1, 2, 3].map(() => { const t = spr(this.glowTex, i === 0 ? "#7dffcf" : "#ffb38a", 1.4); this.scene.add(t); return t; });
    return { key: `${f.job}:${palette}`, chibi, team, charge, slash, slashMat, glow, stars, zzz, target, trail, lastX: 0, lastZ: 0, walk: 0, yaw: 0 };
  }

  private dropView(v: FighterView) {
    this.scene.remove(v.chibi.root, v.slash, v.target, ...v.trail);
  }

  private updateFighter(s: State, i: number, local: number) {
    const f = s.f[i], pal = this.driver.view.palettes[i] ?? 0;
    let v = this.views[i];
    if (!v || v.key !== `${f.job}:${pal}`) { if (v) this.dropView(v); v = this.views[i] = this.makeView(f, i, pal); }
    const c = v.chibi, kit = KITS[f.job], w = this.world(s, f.x, f.y);
    (v.team.material as THREE.MeshBasicMaterial).color.set(local < 0 ? (i === 0 ? "#3fb8ff" : "#ff7a6b") : i === local ? "#5fe08a" : "#ff7a6b");

    // position, leaps, facing
    let y = 0;
    if (f.air > 0) { const p = 1 - f.air / f.air0; y = Math.sin(p * Math.PI) * 2.0; }
    const moved = Math.hypot(w.x - v.lastX, w.z - v.lastZ);
    v.lastX = w.x; v.lastZ = w.z;
    if (moved > 0.005 && moved < 1) v.walk += moved * 6; else v.walk *= 0.9;
    const yaw = Math.atan2(cosA(f.face), sinA(f.face));
    let dyaw = yaw - v.yaw; while (dyaw > Math.PI) dyaw -= TAU; while (dyaw < -Math.PI) dyaw += TAU;
    v.yaw += dyaw * 0.35;
    c.root.position.set(w.x, y, w.z);
    c.root.rotation.set(0, v.yaw, 0);
    c.body.position.y = Math.abs(Math.sin(v.walk)) * 0.08;
    c.body.rotation.set(0, 0, 0);

    // pose
    const chargeP = f.charging ? Math.min(1, f.charge / kit.charge) : 0;
    const full = f.charging && f.charge >= kit.charge;
    const heavy = c.prop && c.prop.parent === c.body; // Database Admin carries the stack in front
    if (!heavy) { c.armR.rotation.set(0.2, 0, 0.25); c.armL.rotation.set(0.2, 0, -0.25); }
    if (f.charging) { if (heavy) c.body.rotation.x = -0.28 * chargeP; else c.armR.rotation.set(-0.3, 0, 0.25 - 2.6 * chargeP); }
    if (f.swing > 0) {
      const p = 1 - f.swing / C.SWING_FRAMES;
      if (heavy) c.body.rotation.x = 0.4 * Math.sin(p * Math.PI); else c.armR.rotation.set(-0.6, 0, -2.4 + p * 3.4);
    }
    if (f.cast > 0) c.armL.rotation.set(-0.3, 0, -2.6);
    if (f.hitstun > 0 || f.kT > 0) c.body.rotation.x = -0.3;
    if (f.hp <= 0) { c.root.rotation.x = -Math.PI / 2; c.root.position.y = 0.35; }

    // charge ring and glow
    const k = Math.round(chargeP * 24);
    v.charge.geometry = this.chargeGeos[k];
    v.charge.visible = f.charging === 1;
    (v.charge.material as THREE.MeshBasicMaterial).color.set(full ? "#ffffff" : "#ffd34d");
    v.glow.visible = !!full; if (full) (v.glow.material as THREE.SpriteMaterial).opacity = 0.5 + 0.3 * Math.sin(s.frame * 0.6);

    // swing arc
    v.slash.position.set(w.x, 0.6 + y, w.z); v.slash.rotation.y = -angRad(f.swingA);
    v.slashMat.opacity = f.swing > 0 ? (f.swing / C.SWING_FRAMES) * (f.swingFull ? 0.85 : 0.45) : 0;
    v.slashMat.color.set(f.swingFull ? "#ffe27a" : "#ffffff");

    // statuses
    v.stars.visible = f.st[S.STUN] > 0; v.stars.material.rotation = s.frame * 0.15;
    v.zzz.visible = f.burnout > 0; v.zzz.position.y = 2.6 + ((s.frame % 40) / 40) * 0.4;
    const flash = f.flash > 0 && !this.settings().reduceFlash ? f.flash / 6 : 0;
    c.mats.forEach((m, n) => {
      if (f.burnout > 0) { const g = (c.base[n].r + c.base[n].g + c.base[n].b) / 3; m.color.setRGB(g, g, g).lerp(c.base[n], 0.35); } else m.color.copy(c.base[n]);
      m.emissive.setRGB(flash, flash, flash);
    });
    // leap target
    v.target.visible = f.air > 0;
    if (f.air > 0) { const t = this.world(s, f.ax1, f.ay1); v.target.position.set(t.x, 0.05, t.z); v.target.scale.setScalar(1 + 0.15 * Math.sin(s.frame * 0.4)); }
    // dash trail
    v.trail.forEach((t, n) => { t.visible = f.dash > 0 || f.iframes > 4; t.position.set(w.x - (cosA(f.dashA) / 1024) * (n + 1) * 0.45, 1.0 + y, w.z - (sinA(f.dashA) / 1024) * (n + 1) * 0.45); (t.material as THREE.SpriteMaterial).opacity = 0.5 - n * 0.11; });
  }

  private clearEnts() { for (const e of this.ents.values()) { this.scene.remove(e.obj); if (e.line) this.scene.remove(e.line); } this.ents.clear(); }

  private updateEntities(s: State) {
    const seen = new Set<number>();
    for (const e of s.ents) {
      seen.add(e.id);
      let ev = this.ents.get(e.id);
      if (ev && ev.b !== e.b) { this.scene.remove(ev.obj); if (ev.line) this.scene.remove(ev.line); ev = undefined; } // e.g. a customer became a Manager
      if (!ev) { const m = this.art.make(e, s.f[e.o].job); ev = { ...m, b: e.b }; this.ents.set(e.id, ev); this.scene.add(m.obj); }
      const w = this.world(s, e.x, e.y);
      ev.obj.position.x = w.x; ev.obj.position.z = w.z;
      ev.tick?.(s, e, w);
      if (ev.line) { const o = this.world(s, s.f[e.o].x, s.f[e.o].y); ev.line.geometry.setFromPoints([new THREE.Vector3(o.x, 1.0, o.z), new THREE.Vector3(w.x, 1.0, w.z)]); }
    }
    for (const [id, ev] of this.ents) if (!seen.has(id)) { this.scene.remove(ev.obj); if (ev.line) this.scene.remove(ev.line); this.ents.delete(id); }
  }

  private burst(x: number, z: number, color: string, n: number, size: number, life = 18) {
    for (let k = 0; k < n; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      const a = (k / n) * TAU + Math.random(), sx = Math.cos(a), sz = Math.sin(a);
      sp.position.set(x, 1.0, z); this.scene.add(sp);
      this.transients.push({ obj: sp, t: 0, life, tick: (p, o) => { o.position.set(x + sx * p * 1.2, 1.0 + p * 0.5, z + sz * p * 1.2); o.scale.setScalar(size * (1 - p * 0.6)); ((o as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 1 - p; } });
    }
  }
  private wave(x: number, z: number, color: string, radius: number, life = 22) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.06, z); this.scene.add(m);
    this.transients.push({ obj: m, t: 0, life, tick: (p, o) => { o.scale.setScalar(0.3 + p * radius); ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1 - p; } });
  }

  private updateFx(s: State) {
    const fresh = new Set<string>();
    for (const e of s.fx) {
      if (s.frame - e.fr > 20) continue;
      const key = `${e.fr}:${e.k}:${e.x}:${e.y}:${e.v}:${e.o}`;
      fresh.add(key);
      if (this.fxSeen.has(key)) continue;
      const w = this.world(s, e.x, e.y);
      switch (e.k) {
        case FX.DMG: if (this.settings().dmgNumbers) this.hud.number(e.x, e.y, e.v, e.o, s.frame); break;
        case FX.CRIT: if (this.settings().dmgNumbers) this.hud.number(e.x, e.y, e.v, e.o, s.frame, true); this.burst(w.x, w.z, "#ffe27a", 8, 0.9); break;
        case FX.BLAST: this.wave(w.x, w.z, JOB_ACCENT[s.f[e.o].job] ?? "#ffffff", Math.max(0.6, e.v / C.TILE), 18); break;
        case FX.BREAK: this.burst(w.x, w.z, "#c9c6d8", 10, 0.8, 22); break;
        case FX.SPARK: this.burst(w.x, w.z, e.v === 2 ? "#ffe27a" : "#ffffff", e.v === 2 ? 10 : 5, e.v === 2 ? 0.9 : 0.6); if (e.v === 2) this.shake = Math.max(this.shake, 1.2); break;
        case FX.SPLAT: this.wave(w.x, w.z, "#ffffff", 2.2); this.shake = Math.max(this.shake, 2); break;
        case FX.LAND: this.wave(w.x, w.z, "#ff9a3d", 2.4, 26); this.burst(w.x, w.z, "#ffcf8a", 10, 1); this.shake = Math.max(this.shake, 2.5); break;
        case FX.BURNOUT: this.burst(w.x, w.z, "#8a86a8", 8, 0.9, 30); break;
        case FX.DASH: this.burst(w.x, w.z, "#ffffff", 4, 0.5, 12); break;
        case FX.SKILL:
          if (e.v === 2) { this.wave(w.x, w.z, "#ffd34d", 1.3, 16); this.burst(w.x, w.z, "#ffd34d", 8, 0.8); }
          else if (e.v === 1) { this.wave(w.x, w.z, "#ff9a3d", 2.0, 18); this.shake = Math.max(this.shake, 1.2); }
          else if (e.v >= 10) this.wave(w.x, w.z, JOB_ACCENT[s.f[e.o].job] ?? "#ffffff", 0.9, 14);
          break;
        case FX.KO: this.shake = 3; break;
      }
    }
    this.fxSeen = new Set([...this.fxSeen].filter((k) => fresh.has(k)));
    for (const k of fresh) this.fxSeen.add(k);
  }

  private updateAim(s: State, local: number) {
    let a = this.aim();
    const f = local >= 0 ? s.f[local] : null, o = local >= 0 ? s.f[1 - local] : null;
    // lock-on ring under the opponent, and a reach circle while charging (green = the swing will land)
    this.lockRing.visible = !!f && !!o && o.hp > 0 && o.air === 0;
    if (this.lockRing.visible && o) { const w = this.world(s, o.x, o.y); this.lockRing.position.set(w.x, 0.06, w.z); this.lockRing.scale.setScalar(1 + 0.08 * Math.sin(s.frame * 0.25)); }
    const melee = !!f && !KITS[f.job].ranged, impl = f ? IMPL[f.job] : undefined;
    this.reachRing.visible = !!f && !!o && f.charging === 1 && melee && !!impl;
    if (this.reachRing.visible && f && o && impl) {
      const reach = impl.range + C.FIGHTER_R / 2, d = Math.hypot(o.x - f.x, o.y - f.y);
      const w = this.world(s, f.x, f.y);
      this.reachRing.position.set(w.x, 0.06, w.z); this.reachRing.scale.setScalar(reach / C.TILE);
      (this.reachRing.material as THREE.MeshBasicMaterial).color.set(d <= reach + C.STEP_IN ? "#5fe08a" : "#ffffff");
    }
    if (f && o && f.charging && !melee && this.autoAttack() && !(a.on && a.kind === "attack")) a = { on: true, kind: "attack", slot: 0, angle: Math.round((Math.atan2(o.y - f.y, o.x - f.x) / (Math.PI * 2)) * 64 + 64) % 64, dist: 0 };
    const show = !!f && f.hp > 0 && (a.on && (a.kind !== "mouse" || (f.charging === 1 && !this.autoAttack())));
    this.aimGuide.visible = show; this.aimSpot.visible = show && a.kind === "skill";
    if (!show || !f) return;
    const w = this.world(s, f.x, f.y), ang = angRad(a.angle), len = a.kind === "skill" ? Math.max(1, (a.dist * 500) / C.TILE) : 2.2;
    this.aimGuide.scale.x = len;
    this.aimGuide.position.set(w.x + Math.cos(ang) * len / 2, 0.07, w.z + Math.sin(ang) * len / 2);
    this.aimGuide.rotation.set(-Math.PI / 2, 0, -ang);
    this.aimSpot.position.set(w.x + Math.cos(ang) * len, 0.08, w.z + Math.sin(ang) * len);
  }
}
