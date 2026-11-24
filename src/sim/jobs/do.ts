// DevOps Engineer (data/kits.gen.ts). Passive Pipeline: every 3 skills, 5 s of +20 % speed and +15 % damage.
// S1 Container: a crate lands on a spot (40 dmg, shove), then stays as a wall (150 HP). S2 Conveyor: a belt for 6 s that pulls enemies toward you and Slows them 30 %.
// S3 Push to Prod: a crate falls on a spot after 0.6 s. 130 dmg.
import * as C from "../constants";
import { aoe, collide, slow, spawn, delayed, inZone, other, registerJob, speedBuff, spotOf, T, targetable, zone, type JobImpl } from "../core";
import { angleOf, dx, dy } from "../fixed";
import { K, S } from "../types";

export const DO = 6;
registerJob(DO, {
  range: 1700, arc: 11,
  ai: [[0, 5], [1.5, 6], [0, 6]],
  outPct: (s, i) => (s.f[i].st[S.SPD_T] > 0 ? 115 : 100),
  onCast(s, i) {
    const f = s.f[i];
    if (++f.res[0] >= 3) { f.res[0] = 0; speedBuff(f, 20, C.sec(5)); }
  },
  skills: [
    (s, i, inp) => { // the crate lands on a spot: 30 dmg and a shove, then it stays as a wall
      const p = spotOf(s, i, inp, 3 * T, 5 * T), t = s.f[other(i)];
      aoe(s, i, p.x, p.y, 1100, 40, { knockA: angleOf(t.x - p.x, t.y - p.y), knockSpeed: 140, knockFrames: 8 });
      spawn(s, { k: K.WALL, b: "do.crate", o: i, x: p.x, y: p.y, r: 500, t: 600, hp: 150, w: 500, h: 500 });
    },
    (s, i, inp) => { const p = spotOf(s, i, inp, 3.5 * T, 6 * T); zone(s, i, "do.belt", p.x, p.y, 1500, 360); },
    (s, i, inp) => { const p = spotOf(s, i, inp, 4 * T, 6 * T); delayed(s, i, "do.prod", p.x, p.y, 1300, 36); },
  ],
  behaviors: {
    "do.crate": {},
    "do.belt": {
      step(s, e) {
        const t = s.f[other(e.o)], me = s.f[e.o];
        if (!targetable(t) || !inZone(e, t.x, t.y) || t.dash > 0) return;
        slow(t, 30, 10);
        const a = angleOf(me.x - t.x, me.y - t.y);
        const c = collide(s, t.x + dx(a, 60), t.y + dy(a, 60), C.FIGHTER_R);
        t.x = c.x; t.y = c.y;
      },
    },
    "do.prod": { onExpire: (s, e) => { aoe(s, e.o, e.x, e.y, e.r, 130, { stun: 24 }); } },
  },
} satisfies JobImpl);
