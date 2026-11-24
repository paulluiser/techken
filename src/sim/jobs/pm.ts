// Project Manager (data/kits.gen.ts). Passive Velocity: each skill hit, -5 % cooldowns (max 4 stacks; Burnout resets).
// S1 Assign Ticket: sticks to them, explodes after 3 s for 80 (sim.tickMarkers). S2 Deadline: a bubble for 4 s,
// enemies and their shots inside are 40 % slower. S3 Code Freeze: shot, 30 dmg, Stun 1.4 s.
import * as C from "../constants";
import { aimOf, dealDamage, inZone, other, registerJob, shoot, slow, spotOf, T, targetable, zone, type JobImpl } from "../core";
import { K, S } from "../types";

export const PM = 13;
const VEL = 0;
registerJob(PM, {
  range: 1900, arc: 9,
  ai: [[0, 6], [0, 5], [0, 6]],
  cdPct: (s, i) => 100 - 5 * s.f[i].res[VEL],
  tick(s, i) { if (s.f[i].burnout > 0) s.f[i].res[VEL] = 0; },
  onLand(s, i, info) { if (!info.basic) s.f[i].res[VEL] = Math.min(4, s.f[i].res[VEL] + 1); },
  skills: [
    (s, i, inp) => { shoot(s, i, "pm.ticket", aimOf(s, i, inp), 320, 240, 30, 10); },
    (s, i, inp) => { const p = spotOf(s, i, inp, 3 * T, 6 * T); zone(s, i, "pm.deadline", p.x, p.y, 1800, 240); },
    (s, i, inp) => { shoot(s, i, "pm.freeze", aimOf(s, i, inp), 300, 260, 35, 30); },
  ],
  behaviors: {
    "pm.ticket": { onHit: (s, e, j) => { if (dealDamage(s, e.o, j, 0, { interrupt: false })) s.f[j].st[S.TICKET] = C.sec(3); return true; }, onWall: () => true },
    "pm.freeze": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 30, { stun: C.sec(1.4), interrupt: true }); return true; }, onWall: () => true },
    "pm.deadline": {
      step(s, e) {
        const t = s.f[other(e.o)];
        if (targetable(t) && inZone(e, t.x, t.y)) slow(t, 40, 10);
        for (const p of s.ents) if (p.k === K.PROJ && p.o !== e.o && inZone(e, p.x, p.y)) { p.x -= Math.trunc((p.vx * 40) / 100); p.y -= Math.trunc((p.vy * 40) / 100); }
      },
    },
  },
} satisfies JobImpl);
