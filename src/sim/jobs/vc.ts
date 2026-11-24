// Vibe Coder (data/kits.gen.ts). Passive Context Window: the first skill after 6 s without skills does +30 %.
// S1 Autocomplete: homing shot, 25 dmg. S2 Generate: big blast, 60 dmg.
// S3 YOLO Deploy: explode around you, 100 dmg; you take 50 (it can't KO you).
import * as C from "../constants";
import { aimOf, aoe, dealDamage, fx, other, pct, registerJob, shoot, targetable, type JobImpl } from "../core";
import { angleDiff, angleOf, dx, dy, wrapA } from "../fixed";
import { FX, type State } from "../types";

export const VC = 16;
const context = (s: State, i: number) => (s.f[i].sinceSkill >= C.sec(6) ? 130 : 100);
const impl: JobImpl = {
  range: 5200, arc: 0, shotSpeed: 300,
  ai: [[0, 8], [0, 7], [0, 2]],
  skills: [
    (s, i, inp) => { shoot(s, i, "vc.auto", aimOf(s, i, inp), 260, 240, 50, 25, { mult: context(s, i) }); },
    (s, i, inp) => { shoot(s, i, "vc.gen", aimOf(s, i, inp), 230, 380, 40, 60, { mult: context(s, i) }); },
    (s, i) => {
      const f = s.f[i];
      aoe(s, i, f.x, f.y, 2000, pct(100, context(s, i)), { hitstun: 20, knockA: angleOf(s.f[other(i)].x - f.x, s.f[other(i)].y - f.y) });
      f.hp = Math.max(1, f.hp - 50);
      fx(s, FX.DMG, f.x, f.y, 50, other(i));
    },
  ],
  behaviors: {
    "vc.auto": {
      step(s, e) { // turn up to one direction step per frame toward the target
        const t = s.f[other(e.o)];
        if (!targetable(t)) return;
        const want = angleOf(t.x - e.x, t.y - e.y, e.a);
        if (angleDiff(want, e.a) > 0) e.a = wrapA(e.a + (wrapA(want - e.a) < 32 ? 1 : -1));
        e.vx = dx(e.a, 260); e.vy = dy(e.a, 260);
      },
      onHit: (s, e, j) => { dealDamage(s, e.o, j, pct(25, e.mult), { hitstun: 8 }); return true; },
      onWall: () => true,
    },
    "vc.gen": { onHit: (s, e, j) => { dealDamage(s, e.o, j, pct(60, e.mult), { hitstun: 18, interrupt: true }); return true; }, onWall: () => true },
  },
};
registerJob(VC, impl);
