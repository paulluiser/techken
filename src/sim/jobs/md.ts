// Mobile Developer (data/kits.gen.ts). Passive Two Bars: 2 dash charges.
// S1 Swipe: dash through them, 50 dmg. S2 Camera Flash: cone, 45 dmg, Slow 30 % for 2 s.
// S3 Deploy to Device: a phone turret for 6 s that shoots 15 dmg every 0.8 s.
import { aimOf, dealDamage, fx, inCone, lunge, other, pet, registerJob, spawn, targetable, type JobImpl } from "../core";
import { angleOf, dist, dx, dy } from "../fixed";
import { FX, K } from "../types";

export const MD = 1;
registerJob(MD, {
  range: 1500, arc: 11, dashCharges: 2,
  ai: [[1.2, 4], [0, 3], [0, 7]],
  skills: [
    (s, i, inp) => lunge(s.f[i], aimOf(s, i, inp), 12, 320, 50, false),
    (s, i, inp) => {
      const f = s.f[i], a = aimOf(s, i, inp);
      f.face = a;
      fx(s, FX.BLAST, f.x + dx(a, 1500), f.y + dy(a, 1500), 1500, i);
      if (inCone(s, i, a, 3000, 6)) dealDamage(s, i, other(i), 45, { slowPct: 30, slowT: 120, hitstun: 10, interrupt: true });
    },
    (s, i, inp) => { const f = s.f[i], a = aimOf(s, i, inp); pet(s, i, "md.turret", f.x + dx(a, 700), f.y + dy(a, 700), 320, 360, 100, { hitCd: 30 }); },
  ],
  behaviors: {
    "md.turret": {
      step(s, e) {
        const t = s.f[other(e.o)];
        if (e.hitCd > 0 || !targetable(t) || dist(e.x, e.y, t.x, t.y) > 7000) return;
        e.hitCd = 50;
        const a = angleOf(t.x - e.x, t.y - e.y);
        e.a = a;
        spawn(s, { k: K.PROJ, b: "md.zap", o: e.o, x: e.x + dx(a, 350), y: e.y + dy(a, 350), vx: dx(a, 300), vy: dy(a, 300), r: 180, t: 30, dmg: 15, a });
      },
    },
    "md.zap": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 15, { hitstun: 6 }); return true; }, onWall: () => true },
  },
} satisfies JobImpl);
