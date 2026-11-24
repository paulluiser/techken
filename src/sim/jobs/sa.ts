// System Analyst (data/kits.gen.ts). Passive Critical Path: +25 % damage to Stunned or Rooted targets.
// S1 Arrow Connector: blink to a spot, 50 dmg to anyone on the way. S2 Swimlane: a wall for 5 s.
// S3 UML Box: a box drops on a spot after 0.5 s. 40 dmg, Stun 1.5 s.
import * as C from "../constants";
import { KITS } from "../data/kits.gen";
import { aimOf, blink, dealDamage, delayed, fx, other, registerJob, segDist, spotOf, T, wall, type JobImpl } from "../core";
import { dist } from "../fixed";
import { FX, S } from "../types";

export const SA = 3;
registerJob(SA, {
  range: 2000, arc: 9,
  ai: [[1.5, 3.5], [3, 7], [0, 6]],
  aiWhen: (s, i, k) => k !== 1 || KITS[s.f[other(i)].job].ranged, // walls only help against shots
  outPct: (s, i, j) => (s.f[j].st[S.STUN] > 0 || s.f[j].st[S.ROOT] > 0 ? 125 : 100),
  skills: [
    (s, i, inp) => {
      const p = spotOf(s, i, inp, 3 * T, 3.5 * T), f = s.f[i], t = s.f[other(i)];
      const from = blink(s, i, p.x, p.y);
      fx(s, FX.DASH, from.x, from.y, 0, i);
      if (segDist(t.x, t.y, from.x, from.y, f.x, f.y) < C.FIGHTER_R + 380) dealDamage(s, i, other(i), 50, { hitstun: 12, interrupt: true });
    },
    (s, i, inp) => { wall(s, i, "sa.lane", aimOf(s, i, inp), 1600, 3000, 400, 300, 250); },
    (s, i, inp) => { const p = spotOf(s, i, inp, 4 * T, 6 * T); delayed(s, i, "sa.uml", p.x, p.y, 1000, 30); },
  ],
  behaviors: {
    "sa.lane": {},
    "sa.uml": {
      onExpire(s, e) {
        const t = s.f[other(e.o)];
        fx(s, FX.BLAST, e.x, e.y, e.r, e.o);
        if (dist(e.x, e.y, t.x, t.y) <= e.r + C.FIGHTER_R / 2) dealDamage(s, e.o, other(e.o), 40, { stun: C.sec(1.5), interrupt: true });
      },
    },
  },
} satisfies JobImpl);
