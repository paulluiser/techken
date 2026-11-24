// 3D visuals for sim entities: shots, warning circles, zones, walls, pets, rings and the router.
// Stand-ins built from primitives (art direction: design/art/reference-archero2.md); R6 replaces them.
import * as THREE from "three";
import * as C from "../sim/constants";
import { K, type Entity, type State } from "../sim/types";
import { buildChibi, LOOKS } from "./models";

/** Accent color per job (roster order), used for shots, zones and walls. */
export const JOB_ACCENT = ["#c08bff", "#ff6b9a", "#9b6bff", "#6f7dff", "#4db6ff", "#6fb8ff", "#ffb04d", "#8fd0ff", "#f28fb0", "#ff8a3d", "#5fd0c0", "#b58cff", "#8bd45a", "#ff5d7a", "#ffcf4d", "#e8e0c8", "#ff4fd8"];

export interface EntView { obj: THREE.Object3D; line?: THREE.Line; tick?: (s: State, e: Entity, w: { x: number; z: number }) => void }

export class EntityArt {
  constructor(private scene: THREE.Scene, private glowTex: THREE.Texture, private textTex: (t: string, c: string) => THREE.Texture) {}

  private glow(color: string, size: number, op = 1) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.set(size, size, 1); return sp;
  }
  private text(t: string, color: string, size: number) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textTex(t, color), transparent: true, depthWrite: false }));
    sp.scale.set(size, size, 1); return sp;
  }
  private flat(geo: THREE.BufferGeometry, color: string, op: number) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  private std(color: string, rough = 0.5, emissive?: string, op = 1) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, emissive: emissive ?? "#000000", emissiveIntensity: emissive ? 0.6 : 0, transparent: op < 1, opacity: op });
  }
  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material, shadow = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; return m; }

  /** Builds the visual for an entity. `job` is the owner's job. */
  make(e: Entity, job: number): EntView {
    const g = new THREE.Group(), accent = JOB_ACCENT[job] ?? "#ffffff";
    const tr = (e.r / C.TILE) || 0.3;
    switch (e.k) {
      case K.PROJ: return this.shot(e, g, accent);
      case K.DELAYED: return this.warning(e, g, accent, tr);
      case K.ZONE: return this.zone(e, g, accent);
      case K.WALL: return this.wall(e, g, accent);
      case K.PET: return this.pet(e, g, accent);
      case K.RING: {
        const ring = this.mesh(new THREE.TorusGeometry(1, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.9 }), false);
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.5; g.add(ring);
        return { obj: g, tick: (_s, en) => { ring.visible = en.n === 0 && en.r > 0; ring.scale.setScalar(Math.max(0.01, en.r / C.TILE)); } };
      }
      case K.ANCHOR: { // Network Admin's router and its +damage radius
        g.add(this.mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), this.std("#2b2b3a", 0.4)));
        for (const sx of [-0.25, 0.25]) { const a = this.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), this.std("#3a3a4a")); a.position.set(sx, 0.4, -0.15); g.add(a); }
        const led = this.glow("#39ff7a", 0.5); led.position.set(0, 0.25, 0.3); g.add(led);
        const area = this.flat(new THREE.RingGeometry(2.92, 3.0, 64), "#4db6ff", 0.35); area.position.y = 0.04; g.add(area);
        g.position.y = 0.15;
        return { obj: g, tick: (s) => { (led.material as THREE.SpriteMaterial).opacity = 0.6 + 0.4 * Math.sin(s.frame * 0.2); } };
      }
    }
    g.add(this.glow(accent, 0.8));
    return { obj: g };
  }

  private shot(e: Entity, g: THREE.Group, accent: string): EntView {
    g.position.y = 1.0;
    switch (e.b) {
      case "se.recursion": {
        g.add(this.glow("#ffd34d", 1.6));
        g.add(this.mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: "#fff6c9" }), false));
        const ring = this.mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 24), new THREE.MeshBasicMaterial({ color: "#c08bff" }), false); g.add(ring);
        return { obj: g, tick: (s) => ring.rotation.set(s.frame * 0.2, s.frame * 0.3, 0) };
      }
      case "db.hook": {
        const head = this.mesh(new THREE.ConeGeometry(0.18, 0.4, 12), this.std("#9fb0d0", 0.3)); head.rotation.z = -Math.PI / 2; g.add(head); g.add(this.glow("#6fb8ff", 0.9));
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: "#c9d6f0" }));
        this.scene.add(line);
        return { obj: g, line, tick: (_s, en) => { head.rotation.y = -Math.atan2(en.vy, en.vx); } };
      }
      case "tw.manual": case "pm.ticket": case "ba.note": case "ts.ticket": {
        const col = e.b === "ba.note" ? "#ffe066" : e.b === "tw.manual" ? "#5b3a8a" : "#fdfdf8";
        const sz = e.b === "tw.manual" ? [0.5, 0.15, 0.4] : [0.32, 0.04, 0.24];
        const card = this.mesh(new THREE.BoxGeometry(sz[0], sz[1], sz[2]), this.std(col, 0.6)); g.add(card); g.add(this.glow(accent, 0.7, 0.6));
        return { obj: g, tick: (s) => { card.rotation.y = s.frame * 0.3; } };
      }
      case "qa.net": {
        const net = this.mesh(new THREE.TorusGeometry(0.34, 0.03, 6, 24), new THREE.MeshBasicMaterial({ color: "#c9c6ff" }), false); net.rotation.x = Math.PI / 2; g.add(net);
        g.add(this.glow(accent, 1.0, 0.5)); return { obj: g };
      }
      case "pm.freeze": g.add(this.glow("#9fe8ff", 1.4)); g.add(this.mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: "#e8fbff" }), false)); return { obj: g };
      case "vc.gen": g.add(this.glow("#ff4fd8", 2.4)); g.add(this.mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffd6f5" }), false)); return { obj: g };
      default: g.add(this.glow(accent, e.b === "basic.shot" ? 0.9 : 1.2)); g.add(this.mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }), false)); return { obj: g };
    }
  }

  private warning(e: Entity, g: THREE.Group, accent: string, tr: number): EntView {
    const edge = this.flat(new THREE.RingGeometry(tr * 0.9, tr, 48), accent, 0.95); edge.position.y = 0.05; g.add(edge);
    const fill = this.flat(new THREE.CircleGeometry(tr, 48), accent, 0.25); fill.position.y = 0.04; g.add(fill);
    let tick: EntView["tick"] = (_s, en) => fill.scale.setScalar(Math.max(0.05, 1 - en.t / en.t0));
    if (e.b === "se.cage") {
      const l = this.text("{", "#ffd34d", 1.1), r = this.text("}", "#ffd34d", 1.1); g.add(l, r);
      tick = (_s, en) => { const p = 1 - en.t / en.t0; fill.scale.setScalar(Math.max(0.05, p)); const off = 1.4 * (1 - p) + 0.3; l.position.set(-off, 0.8, 0); r.position.set(off, 0.8, 0); };
    } else if (e.b === "do.prod" || e.b === "sa.uml" || e.b === "tw.redact") {
      const col = e.b === "do.prod" ? "#b07a45" : e.b === "sa.uml" ? "#e6e1ff" : "#111118";
      const block = this.mesh(new THREE.BoxGeometry(tr * 1.4, 0.6, tr * (e.b === "tw.redact" ? 0.6 : 1.4)), this.std(col, 0.6)); g.add(block);
      tick = (_s, en) => { const p = 1 - en.t / en.t0; fill.scale.setScalar(Math.max(0.05, p)); block.position.y = 0.3 + 5 * (1 - p); };
    } else if (e.b === "ce.bolt" || e.b === "ce.hail") {
      const cloud = this.mesh(new THREE.SphereGeometry(tr * 0.7, 16, 10), this.std(e.b === "ce.bolt" ? "#5a6280" : "#c9e6ff", 0.9)); cloud.scale.set(1.3, 0.45, 1); cloud.position.y = 3.2; g.add(cloud);
      const bolt = this.glow(e.b === "ce.bolt" ? "#fff6a0" : "#c9f0ff", 1.5); g.add(bolt);
      tick = (s, en) => { const p = 1 - en.t / en.t0; fill.scale.setScalar(Math.max(0.05, p)); bolt.position.y = 3 - 2.6 * p; (bolt.material as THREE.SpriteMaterial).opacity = p > 0.7 ? 1 : 0.4 + 0.2 * Math.sin(s.frame); };
    }
    return { obj: g, tick };
  }

  private zone(e: Entity, g: THREE.Group, accent: string): EntView {
    const look: Record<string, [string, number]> = { "ce.rain": ["#5fb8ff", 0.28], "na.loss": ["#4db6ff", 0.2], "pm.deadline": ["#b58cff", 0.25], "ba.scope": ["#8bd45a", 0.25], "do.belt": ["#ffb04d", 0.3], "ds.band": ["#5fd0c0", 0.25], "tw.ink": ["#1a1636", 0.55] };
    const [col, op] = look[e.b] ?? [accent, 0.25];
    const disc = this.flat(new THREE.CircleGeometry(1, 48), col, op); disc.position.y = 0.03; g.add(disc);
    const edge = this.flat(new THREE.RingGeometry(0.95, 1, 48), col, 0.9); edge.position.y = 0.04; g.add(edge);
    const extra: THREE.Object3D[] = [];
    if (e.b === "ce.rain") { const cloud = this.mesh(new THREE.SphereGeometry(0.9, 16, 10), this.std("#9fb0d0", 0.9)); cloud.scale.set(1.4, 0.4, 1.1); cloud.position.y = 3; g.add(cloud); for (let k = 0; k < 6; k++) { const d = this.glow("#9fdcff", 0.35); g.add(d); extra.push(d); } }
    if (e.b === "pm.deadline") { const dome = this.mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, depthWrite: false }), false); g.add(dome); extra.push(dome); }
    if (e.b === "na.loss") { const dome = this.mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.35 }), false); g.add(dome); extra.push(dome); }
    if (e.b === "do.belt") { for (let k = 0; k < 3; k++) { const a = this.text(">", "#ffffff", 0.6); a.position.y = 0.2; g.add(a); extra.push(a); } }
    return {
      obj: g,
      tick: (s, en) => {
        const r = en.r / C.TILE;
        disc.scale.setScalar(r); edge.scale.setScalar(r);
        if (en.b === "pm.deadline" || en.b === "na.loss") extra[0].scale.setScalar(r);
        if (en.b === "ce.rain") extra.forEach((d, k) => { const ph = ((s.frame + k * 9) % 30) / 30, a = k * 1.05; d.position.set(Math.cos(a) * r * 0.6, 3 - ph * 3, Math.sin(a) * r * 0.6); });
        if (en.b === "do.belt") { const me = s.f[en.o], ang = Math.atan2(me.y - en.y, me.x - en.x); extra.forEach((a, k) => { const t = (((s.frame * 0.02 + k / 3) % 1) - 0.5) * 2 * r * 0.8; a.position.set(Math.cos(ang) * t, 0.25, Math.sin(ang) * t); }); }
        const fade = Math.min(1, en.t / 20);
        (disc.material as THREE.MeshBasicMaterial).opacity = op * fade; (edge.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
      },
    };
  }

  private wall(e: Entity, g: THREE.Group, accent: string): EntView {
    const w = (e.w * 2) / C.TILE, d = (e.h * 2) / C.TILE;
    const kind: Record<string, [string, number, string?]> = { "sa.lane": ["#8fa0ff", 0.75], "cs.fire": ["#ff8a3d", 0.6, "#ff5a1a"], "tw.para": ["#fdfdf8", 1], "do.crate": ["#b07a45", 1] };
    const [col, op, em] = kind[e.b] ?? [accent, 0.8];
    const h = e.b === "do.crate" ? 0.9 : 1.2;
    const body = this.mesh(new THREE.BoxGeometry(w, h, d), this.std(col, 0.6, em, op)); body.position.y = h / 2; g.add(body);
    if (e.b === "tw.para") for (let k = 0; k < 3; k++) { const line = this.mesh(new THREE.BoxGeometry(w * 0.98, 0.05, d * 1.02), this.std("#3a3550")); line.position.y = 0.3 + k * 0.3; g.add(line); }
    if (e.b === "do.crate") { const band = this.mesh(new THREE.BoxGeometry(w * 1.02, 0.12, d * 1.02), this.std("#6b4226")); band.position.y = 0.45; g.add(band); }
    return { obj: g, tick: (s, en) => { const low = en.hp < 60 ? 0.5 + 0.5 * Math.abs(Math.sin(s.frame * 0.3)) : 1; (body.material as THREE.MeshStandardMaterial).opacity = op * low; body.material.transparent = op < 1 || low < 1; } };
  }

  private pet(e: Entity, g: THREE.Group, accent: string): EntView {
    let tick: EntView["tick"];
    switch (e.b) {
      case "md.turret": {
        const stand = this.mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.8, 10), this.std("#3a3a4a")); stand.position.y = 0.4; g.add(stand);
        const phone = this.mesh(new THREE.BoxGeometry(0.4, 0.65, 0.06), this.std("#2b2b3a", 0.3)); phone.position.y = 1.0; g.add(phone);
        const scr = this.mesh(new THREE.PlaneGeometry(0.34, 0.56), new THREE.MeshBasicMaterial({ color: "#ff9ed2" }), false); scr.position.set(0, 1.0, 0.035); g.add(scr);
        tick = (_s, en) => { g.rotation.y = Math.PI / 2 - (en.a / 64) * Math.PI * 2; };
        break;
      }
      case "qa.bug": {
        const body = this.mesh(new THREE.SphereGeometry(0.32, 16, 10), this.std("#5cc95c", 0.4)); body.scale.set(1.2, 0.75, 1); body.position.y = 0.3; g.add(body);
        const head = this.mesh(new THREE.SphereGeometry(0.17, 12, 8), this.std("#2a2f45")); head.position.set(0.38, 0.32, 0); g.add(head);
        tick = (s, en) => { g.rotation.y = -(en.a / 64) * Math.PI * 2; body.position.y = 0.3 + Math.abs(Math.sin(s.frame * 0.5)) * 0.06; };
        break;
      }
      case "ts.customer": case "ts.manager": {
        const mgr = e.b === "ts.manager";
        const c = buildChibi({ ...LOOKS[mgr ? 13 : 8], top: mgr ? "#2a2f45" : "#8a9ab8", hair: mgr ? "#d9c08a" : "#6b3e22", style: "short" }, "low");
        c.root.scale.setScalar(mgr ? 0.62 : 0.48); g.add(c.root);
        const angry = this.text("!", "#ff5a4d", 0.6); angry.position.y = mgr ? 1.9 : 1.5; g.add(angry);
        tick = (s, en) => { c.root.rotation.y = Math.atan2(Math.cos((en.a / 64) * Math.PI * 2), Math.sin((en.a / 64) * Math.PI * 2)); c.body.position.y = Math.abs(Math.sin(s.frame * 0.3)) * 0.06; };
        g.userData.key = e.b; // rebuilt when a customer is escalated
        break;
      }
      case "ai.bot": {
        const body = this.mesh(new THREE.BoxGeometry(0.6, 0.55, 0.6), this.std("#6a2bd9", 0.35)); body.position.y = 0.45; g.add(body);
        const eye = this.glow("#ff4fd8", 0.5); eye.position.set(0, 0.5, 0.32); g.add(eye);
        tick = (s, en) => { g.rotation.y = Math.atan2(Math.cos((en.a / 64) * Math.PI * 2), Math.sin((en.a / 64) * Math.PI * 2)); body.position.y = 0.45 + Math.sin(s.frame * 0.25) * 0.05; body.scale.setScalar(0.9 + 0.1 * en.n); };
        break;
      }
      case "ai.drone": {
        const core = this.mesh(new THREE.SphereGeometry(0.15, 12, 8), this.std("#c0a8ff", 0.3)); g.add(core);
        const ring = this.mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 20), this.std("#7d8596")); ring.rotation.x = Math.PI / 2; g.add(ring);
        g.position.y = 1.4;
        tick = (s) => { ring.rotation.z = s.frame * 0.4; };
        break;
      }
      default: g.add(this.glow(accent, 1));
    }
    const shadow = this.flat(new THREE.CircleGeometry(((e.r / C.TILE) || 0.3) * 0.9, 20), "#000000", 0.25); shadow.position.y = 0.02; g.add(shadow);
    return { obj: g, tick };
  }
}
