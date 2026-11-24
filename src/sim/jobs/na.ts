// Network Admin (data/kits.gen.ts). Passive Access Point: a router at round start; +15 % damage near it.
// S1 Ping: fast shot, 30 dmg, Slow 20 % for 1.5 s. S2 Packet Loss: zone for 5 s that deletes enemy
// shots; enemies inside deal -30 % (handled in core.dealDamage). S3 Broadcast Storm: 3 rings, 40 each.
import { ARENAS } from "../arenas";
import { aimOf, dealDamage, inZone, registerJob, shoot, spawn, zone, type JobImpl } from "../core";
import { dist } from "../fixed";
import { K } from "../types";

export const NA = 4;
registerJob(NA, {
  range: 5200, arc: 0, shotSpeed: 280,
  ai: [[0, 8], [0, 3], [0, 4.5]],
  roundStart(s, i) {
    const a = ARENAS[s.cfg.arena], [x, y] = a.start[i];
    spawn(s, { k: K.ANCHOR, b: "na.router", o: i, x: x + (x < a.w / 2 ? 900 : -900), y, r: 400, t: 1 });
  },
  outPct: (s, i) => (s.ents.some((e) => e.b === "na.router" && e.o === i && dist(e.x, e.y, s.f[i].x, s.f[i].y) <= 3000) ? 115 : 100),
  skills: [
    (s, i, inp) => { shoot(s, i, "na.ping", aimOf(s, i, inp), 380, 220, 30, 30); },
    (s, i) => { const f = s.f[i]; zone(s, i, "na.loss", f.x, f.y, 2000, 300); },
    (s, i) => { const f = s.f[i]; for (let k = 0; k < 3; k++) spawn(s, { k: K.RING, b: "ring", o: i, x: f.x, y: f.y, r: 0, t: 200, vx: 110, w: 5000, n: k * 15, mult: 40 }); },
  ],
  behaviors: {
    "na.router": {},
    "na.ping": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 30, { slowPct: 20, slowT: 90, hitstun: 6 }); return true; }, onWall: () => true },
    "na.loss": {
      step(s, e) {
        for (const p of s.ents) if (p.k === K.PROJ && p.o !== e.o && p.t > 0 && inZone(e, p.x, p.y)) { p.t = 0; p.vx = 0; p.vy = 0; }
      },
    },
  },
} satisfies JobImpl);
