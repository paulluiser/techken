// QA Analyst (data/kits.gen.ts). Passive Found a Bug: every 4th hit makes them Weak for 4 s.
// S1 Magnify: beam, 45 dmg and Weak 4 s. S2 Bug Net: 30 dmg, Root 1 s.
// S3 Release the Bug: a bug pet for 8 s that chases, bites and slows.
import { aimOf, chase, dealDamage, other, pet, registerJob, shoot, weak, type JobImpl } from "../core";
import { dx, dy } from "../fixed";

export const QA = 2;
registerJob(QA, {
  range: 1600, arc: 13,
  ai: [[0, 6], [0, 5], [0, 7]],
  skills: [
    (s, i, inp) => { shoot(s, i, "qa.beam", aimOf(s, i, inp), 420, 260, 20, 45); },
    (s, i, inp) => { shoot(s, i, "qa.net", aimOf(s, i, inp), 260, 380, 28, 30); },
    (s, i, inp) => { const f = s.f[i], a = aimOf(s, i, inp); pet(s, i, "qa.bug", f.x + dx(a, 700), f.y + dy(a, 700), 300, 480, 80); },
  ],
  onLand(s, i) {
    const r = s.f[i].res;
    if (++r[0] >= 4) { r[0] = 0; weak(s.f[other(i)], 240); }
  },
  behaviors: {
    "qa.beam": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 45, { weak: 240, hitstun: 8 }); return true; }, onWall: () => true },
    "qa.net": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 30, { root: 60, hitstun: 6 }); return true; }, onWall: () => true },
    "qa.bug": {
      step(s, e) {
        const d = chase(s, e, 70, 700);
        if (d < 950 && e.hitCd === 0) { e.hitCd = 60; dealDamage(s, e.o, other(e.o), 15, { slowPct: 20, slowT: 60, hitstun: 4, interrupt: false }); }
      },
    },
  },
} satisfies JobImpl);
