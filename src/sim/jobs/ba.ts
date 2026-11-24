// Business Analyst (data/kits.gen.ts). Passive Interest: each hit adds Debt (max 8). Debt deals 2 dmg/s
// per stack and fades by 1 stack every 4 s without new Debt (sim.tickMarkers).
// S1 Sticky Note: shot, 20 dmg, +3 Debt. S2 Scope Creep: a growing zone for 5 s, +1 Debt/s, Slow 20 %.
// S3 Due Date: cash in all Debt, 25 dmg each.
import * as C from "../constants";
import { aimOf, dealDamage, fx, inZone, other, registerJob, shoot, slow, spotOf, T, targetable, zone, type JobImpl } from "../core";
import { FX, S, type Fighter } from "../types";

export const BA = 12;
export const DEBT_MAX = 8;
export function addDebt(t: Fighter, n: number) { t.st[S.DEBT] = Math.min(DEBT_MAX, t.st[S.DEBT] + n); t.st[S.DEBT_T] = C.sec(6); }

registerJob(BA, {
  range: 1500, arc: 11,
  ai: [[0, 6], [0, 5], [0, 9]],
  aiWhen: (s, i, k) => k !== 2 || s.f[other(i)].st[S.DEBT] >= 4,
  onLand(s, i) { addDebt(s.f[other(i)], 1); },
  skills: [
    (s, i, inp) => { shoot(s, i, "ba.note", aimOf(s, i, inp), 320, 220, 30, 20); },
    (s, i, inp) => { const p = spotOf(s, i, inp, 3 * T, 6 * T); zone(s, i, "ba.scope", p.x, p.y, 1000, 300); },
    (s, i) => {
      const t = s.f[other(i)], n = t.st[S.DEBT];
      if (n <= 0) return;
      fx(s, FX.BLAST, t.x, t.y, 900, i);
      dealDamage(s, i, other(i), 25 * n, { hitstun: 14, interrupt: true });
      t.st[S.DEBT] = 0; // after the hit, so the passive doesn't re-add a stack
    },
  ],
  behaviors: {
    "ba.note": { onHit: (s, e, j) => { if (dealDamage(s, e.o, j, 20, { hitstun: 6 })) addDebt(s.f[j], 3); return true; }, onWall: () => true },
    "ba.scope": {
      step(s, e) {
        e.r = 1000 + (e.t0 - e.t) * 4;
        const t = s.f[other(e.o)];
        if (!targetable(t) || !inZone(e, t.x, t.y)) return;
        slow(t, 20, 15);
        if (e.t % 50 === 0) addDebt(t, 1);
      },
    },
  },
} satisfies JobImpl);
