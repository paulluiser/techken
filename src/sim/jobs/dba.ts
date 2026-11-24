// Database Admin (kit numbers: data/kits.gen.ts, design/kits_v3.py).
// Passive Heavy: charging can't be interrupted; takes 10 % less damage.
// S1 SELECT: a hook that pulls the opponent to you. 30 dmg.
// S2 Table Lock: slam next to you. 20 dmg, Stun 1.2 s.
// S3 DROP TABLE: leap to a spot and land for 130 dmg in an area.
import * as C from "../constants";
import { aimOf, dealDamage, fx, other, registerJob, spawn, spotOf, type JobImpl } from "../core";
import { angleOf, dist, dx, dy } from "../fixed";
import { FX, K } from "../types";

export const DBA = 5;
const T = C.TILE;
export const LEAP_FRAMES = 36;

const impl: JobImpl = {
  range: 1450, arc: 14, armoredCharge: true, dmgTakenPct: 90,
  skills: [
    (s, i, inp) => { // SELECT
      const f = s.f[i], a = aimOf(s, i, inp);
      f.face = a;
      spawn(s, { k: K.PROJ, b: "db.hook", o: i, x: f.x + dx(a, 500), y: f.y + dy(a, 500), vx: dx(a, 300), vy: dy(a, 300), r: 280, t: 20, mult: 100 });
    },
    (s, i) => { // Table Lock
      const f = s.f[i], o = s.f[other(i)];
      fx(s, FX.SKILL, f.x, f.y, 1, i);
      if (dist(f.x, f.y, o.x, o.y) <= 1800) dealDamage(s, i, other(i), 20, { stun: C.sec(1.2), interrupt: true });
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
    if (dist(f.x, f.y, o.x, o.y) <= 1800) dealDamage(s, i, other(i), 130, { full: true, hitstun: 20, knockA: angleOf(o.x - f.x, o.y - f.y, f.face), interrupt: true });
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
