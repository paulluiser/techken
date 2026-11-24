// Cloud Engineer (data/kits.gen.ts). Basic: raindrop shots. Passive Elastic: dash goes 50 % farther.
// S1 Rain Cloud: rain on a spot for 3 s, 25 dmg/s, Slows 20 %, makes them Wet. S2 Cold Start: hail on a spot,
// 50 dmg, Slow 40 % for 2 s. S3 Lightning: strike a spot after 0.5 s, 100 dmg, 200 if Wet.
import * as C from "../constants";
import { aoe, dealDamage, slow, delayed, fx, hitObjects, inZone, other, registerJob, spotOf, T, targetable, zone, type JobImpl } from "../core";
import { dist } from "../fixed";
import { FX, S } from "../types";

export const CE = 7;
registerJob(CE, {
  range: 5000, arc: 0, shotSpeed: 280, dashPct: 150,
  ai: [[0, 7], [0, 7], [0, 7]],
  skills: [
    (s, i, inp) => { const p = spotOf(s, i, inp, 4 * T, 7 * T); zone(s, i, "ce.rain", p.x, p.y, 1600, 180); },
    (s, i, inp) => { const p = spotOf(s, i, inp, 4 * T, 7 * T); delayed(s, i, "ce.hail", p.x, p.y, 1400, 18); },
    (s, i, inp) => { const p = spotOf(s, i, inp, 4 * T, 7 * T); delayed(s, i, "ce.bolt", p.x, p.y, 1100, 28); },
  ],
  behaviors: {
    "ce.rain": {
      step(s, e) {
        const t = s.f[other(e.o)];
        if (e.t % 12 !== 0 || !targetable(t) || !inZone(e, t.x, t.y)) return;
        t.st[S.WET] = 240;
        slow(t, 20, 15);
        dealDamage(s, e.o, other(e.o), 5, { dot: true });
      },
    },
    "ce.hail": { onExpire: (s, e) => { aoe(s, e.o, e.x, e.y, e.r, 50, { slowPct: 40, slowT: 120 }); } },
    "ce.bolt": {
      onExpire(s, e) {
        const t = s.f[other(e.o)];
        fx(s, FX.BLAST, e.x, e.y, e.r, e.o);
        hitObjects(s, e.o, e.x, e.y, e.r, 100);
        if (dist(e.x, e.y, t.x, t.y) <= e.r + C.FIGHTER_R / 2) dealDamage(s, e.o, other(e.o), t.st[S.WET] > 0 ? 200 : 100, { hitstun: 20, interrupt: true });
      },
    },
  },
} satisfies JobImpl);
