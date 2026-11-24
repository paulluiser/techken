// Technical Writer (data/kits.gen.ts). Passive Track Changes: full-charge hits leave ink for 5 s:
// you +15 % speed inside, them -15 %. S1 RTFM: heavy manual, 60 dmg, knockback.
// S2 Paragraph: a text wall for 6 s. S3 Redact: a black bar on a spot, 40 dmg, Silence 2 s.
import * as C from "../constants";
import { aimOf, aoe, dealDamage, delayed, inZone, other, registerJob, shoot, slow, speedBuff, spotOf, T, wall, zone, type JobImpl } from "../core";
import { angleOf } from "../fixed";

export const TW = 15;
const impl: JobImpl = {
  range: 5000, arc: 0, shotSpeed: 280, shotR: 240,
  ai: [[0, 6], [0, 5], [0, 6]],
  onLand(s, i, info) { if (info.basic && info.full) zone(s, i, "tw.ink", info.x, info.y, 1000, 300); },
  skills: [
    (s, i, inp) => { shoot(s, i, "tw.manual", aimOf(s, i, inp), 230, 300, 35, 60); },
    (s, i, inp) => { wall(s, i, "tw.para", aimOf(s, i, inp), 1500, 3000, 400, 360, 250); },
    (s, i, inp) => { const p = spotOf(s, i, inp, 4 * T, 6 * T); delayed(s, i, "tw.redact", p.x, p.y, 1100, 30); },
  ],
  behaviors: {
    "tw.manual": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 60, { hitstun: 16, knockA: angleOf(e.vx, e.vy), knockSpeed: 120, knockFrames: 10, interrupt: true }); return true; }, onWall: () => true },
    "tw.para": {},
    "tw.ink": {
      step(s, e) {
        const me = s.f[e.o], t = s.f[other(e.o)];
        if (inZone(e, me.x, me.y)) speedBuff(me, 15, 10);
        if (inZone(e, t.x, t.y)) slow(t, 15, 10);
      },
    },
    "tw.redact": { onExpire: (s, e) => { aoe(s, e.o, e.x, e.y, e.r, 40, { silence: C.sec(2) }); } },
  },
};
registerJob(TW, impl);
