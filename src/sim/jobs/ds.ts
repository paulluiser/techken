// Data Scientist (data/kits.gen.ts). Basic: 3 dots in a spread. Passive Outlier: 15 % of hits crit (x1.5).
// S1 Regression: a shot aimed where they will be, 55 dmg. S2 Confidence Band: zone for 3 s, every hit inside crits.
// S3 Remove Outliers: big blast around you, 90 dmg, deletes enemy summons, walls and zones.
import { aoe, dealDamage, other, rand, registerJob, shoot, spotOf, T, zone, zoneAt, type JobImpl } from "../core";
import { angleOf, dist } from "../fixed";
import { aimAngle, hasAim } from "../input";

export const DS = 10;
const impl: JobImpl = {
  range: 5200, arc: 0, shots: 3, shotSpeed: 300, shotR: 180,
  ai: [[0, 8], [0, 6], [0, 2.6]],
  crit: (s, i, j) => zoneAt(s, "ds.band", i, s.f[j].x, s.f[j].y) || rand(s, 100) < 15,
  skills: [
    (s, i, inp) => {
      const f = s.f[i], t = s.f[other(i)];
      let a: number;
      if (hasAim(inp)) a = aimAngle(inp);
      else { // lead the target: aim where they'll be when the shot arrives
        const frames = Math.trunc(dist(f.x, f.y, t.x, t.y) / 330);
        a = angleOf(t.x + (t.x - t.px) * frames - f.x, t.y + (t.y - t.py) * frames - f.y, f.face);
      }
      f.face = a;
      shoot(s, i, "ds.reg", a, 330, 260, 40, 55);
    },
    (s, i, inp) => { const p = spotOf(s, i, inp, 3 * T, 6 * T); zone(s, i, "ds.band", p.x, p.y, 1600, 180); },
    (s, i) => { const f = s.f[i]; aoe(s, i, f.x, f.y, 2600, 90, { hitstun: 16 }, true); },
  ],
  behaviors: {
    "ds.reg": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 55, { hitstun: 10 }); return true; }, onWall: () => true },
    "ds.band": {},
  },
};
registerJob(DS, impl);
