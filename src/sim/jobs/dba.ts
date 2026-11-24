// Database Admin (kit numbers: data/kits.gen.ts, design/kits_v3.py).
// Passive Heavy: charging can't be interrupted; takes 5 % less damage.
// S1 SELECT: a hook that pulls the opponent to you. 30 dmg.
// S2 Table Lock: slam next to you. 20 dmg, Stun 1 s.
// S3 DROP TABLE: leap to a spot and land for 100 dmg in an area.
import * as C from "../constants";
import { aimOf, dealDamage, fx, hitObjects, other, registerJob, shoot, spotOf, type JobImpl } from "../core";
import { angleOf, dist, dx, dy } from "../fixed";
import { FX } from "../types";

export const DBA = 5;
const T = C.TILE;
export const LEAP_FRAMES = 36;

const impl: JobImpl = {
  range: 1450, arc: 14, armoredCharge: true, dmgTakenPct: 95,
  ai: [[2.2, 5.8], [0, 1.6], [1.8, 5]],
  skills: [
    (s, i, inp) => { // SELECT
      const f = s.f[i], a = aimOf(s, i, inp);
      f.face = a;
      shoot(s, i, "db.hook", a, 300, 280, 20, 30);
    },
    (s, i) => { // Table Lock
      const f = s.f[i], o = s.f[other(i)];
      fx(s, FX.SKILL, f.x, f.y, 1, i);
      hitObjects(s, i, f.x, f.y, 1800, 20);
      if (dist(f.x, f.y, o.x, o.y) <= 1800) dealDamage(s, i, other(i), 20, { stun: C.sec(1), interrupt: true });
    },
    (s, i, inp) => { // DROP TABLE
      const f = s.f[i], p = spotOf(s, i, inp, 4 * T, 5 * T);
      f.air = LEAP_FRAMES; f.air0 = LEAP_FRAMES; f.ax0 = f.x; f.ay0 = f.y; f.ax1 = p.x; f.ay1 = p.y;
      f.face = angleOf(p.x - f.x, p.y - f.y, f.face);
      f.charging = 0; f.charge = 0;
    },
  ],
  onAirEnd(s, i) {
    const f = s.f[i], o = s.f[other(i)];
    fx(s, FX.LAND, f.x, f.y, 0, i);
    hitObjects(s, i, f.x, f.y, 1800, 0, true); // breaks summons
    if (dist(f.x, f.y, o.x, o.y) <= 1800) dealDamage(s, i, other(i), 100, { full: true, hitstun: 20, knockA: angleOf(o.x - f.x, o.y - f.y, f.face), interrupt: true });
  },
  behaviors: {
    "db.hook": {
      onHit(s, e, j) {
        const f = s.f[e.o], t = s.f[j], a = angleOf(t.x - f.x, t.y - f.y, f.face);
        dealDamage(s, e.o, j, 30, { hitstun: 16, interrupt: true, pullX: f.x + dx(a, 1100), pullY: f.y + dy(a, 1100), pullFrames: 10 });
        return true;
      },
      onWall: () => true,
    },
  },
};
registerJob(DBA, impl);
