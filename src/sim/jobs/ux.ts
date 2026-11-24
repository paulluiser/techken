// UI/UX Designer (data/kits.gen.ts). Passive Flow State: each hit in a row, +5 % speed (max 25 %); getting hit resets it.
// S1 Grid Snap: blink, your next hit crits. S2 Drag & Drop: grab and throw, 50 dmg; into a wall +20 and Stun.
// S3 Make It Pop: 5 fast stabs, 20 each; the last one knocks back.
import * as C from "../constants";
import { aimOf, blink, dealDamage, inCone, other, registerJob, speedBuff, targetable, type JobImpl } from "../core";
import { angleOf, dist, dx, dy } from "../fixed";
import { hasAim } from "../input";
import { S } from "../types";

export const UX = 14;
const FLOW = 0, POP = 1, POP_A = 2;
registerJob(UX, {
  range: 1500, arc: 11,
  ai: [[1, 4], [0, 1.7], [0, 1.6]],
  onLand(s, i) { const f = s.f[i]; f.res[FLOW] = Math.min(5, f.res[FLOW] + 1); speedBuff(f, 5 * f.res[FLOW], C.sec(10)); f.st[S.SPD_PCT] = 5 * f.res[FLOW]; },
  tick(s, i) {
    const f = s.f[i];
    if (f.quiet === 1 && f.res[FLOW] > 0) { f.res[FLOW] = 0; f.st[S.SPD_T] = 0; f.st[S.SPD_PCT] = 0; }
    if (f.res[POP] > 0) {
      const k = --f.res[POP];
      if (k % 6 === 0 && inCone(s, i, f.res[POP_A], 1700, 12)) {
        const last = k === 0;
        dealDamage(s, i, other(i), 20, { hitstun: 10, melee: true, knockA: last ? f.res[POP_A] : undefined, interrupt: true });
      }
    }
  },
  skills: [
    (s, i, inp) => {
      const f = s.f[i], t = s.f[other(i)], a = aimOf(s, i, inp);
      const len = hasAim(inp) ? 2500 : Math.max(600, Math.min(2500, dist(f.x, f.y, t.x, t.y) - 900));
      blink(s, i, f.x + dx(a, len), f.y + dy(a, len));
      f.face = a; f.st[S.CRIT_NEXT] = 1;
    },
    (s, i, inp) => {
      const f = s.f[i], t = s.f[other(i)];
      if (!targetable(t) || t.iframes > 0 || dist(f.x, f.y, t.x, t.y) > 1700) return;
      const a = hasAim(inp) ? aimOf(s, i, inp) : angleOf(t.x - f.x, t.y - f.y, f.face);
      if (!dealDamage(s, i, other(i), 50, { interrupt: true, melee: true })) return;
      t.kx = dx(a, 240); t.ky = dy(a, 240); t.kT = 14; t.kSplat = 1; t.kSplatDmg = 20; t.kSplatStun = 30; t.dash = 0; t.lunge = 0;
    },
    (s, i, inp) => { const f = s.f[i]; f.res[POP] = 30; f.res[POP_A] = aimOf(s, i, inp); f.cast = 30; },
  ],
} satisfies JobImpl);
