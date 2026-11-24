// AI/ML Engineer (data/kits.gen.ts). Passive Learning: the bot levels up as it hits (max level 3).
// S1 Deploy Bot: a bot pet for 12 s (150 HP) that bites 16 dmg/s. S2 Drones: 2 drones orbit you for 6 s and
// shoot when you attack. S3 Agentic Loop: all your pets rush them for 4 s with +50 % damage.
import { chase, dealDamage, other, pct, pet, petsOf, registerJob, spawn, targetable, type JobImpl } from "../core";
import { angleOf, dx, dy } from "../fixed";
import { K, type Entity, type State } from "../types";

export const AI = 11;
const RUSH = 0; // res slot: Agentic Loop timer
const rushing = (s: State, e: Entity) => s.f[e.o].res[RUSH] > 0;
function droneShot(s: State, e: Entity, a: number) {
  spawn(s, { k: K.PROJ, b: "ai.dshot", o: e.o, x: e.x, y: e.y, vx: dx(a, 300), vy: dy(a, 300), r: 160, t: 30, dmg: 8, a, mult: rushing(s, e) ? 150 : 100 });
}
registerJob(AI, {
  range: 5200, arc: 0,
  ai: [[0, 8], [0, 6], [0, 9]],
  aiWhen: (s, i, k) => k !== 2 || petsOf(s, i).length > 0,
  tick(s, i) { if (s.f[i].res[RUSH] > 0) s.f[i].res[RUSH]--; },
  onRelease(s, i, a) { for (const d of petsOf(s, i, "ai.drone")) droneShot(s, d, a); },
  skills: [
    (s, i) => {
      for (const b of petsOf(s, i, "ai.bot")) b.hp = 0; // one bot at a time
      const f = s.f[i];
      pet(s, i, "ai.bot", f.x + dx(f.face, 700), f.y + dy(f.face, 700), 380, 720, 150, { n: 1 });
    },
    (s, i) => { const f = s.f[i]; for (const k of [0, 32]) pet(s, i, "ai.drone", f.x, f.y, 220, 360, 30, { a: k }); },
    (s, i) => { s.f[i].res[RUSH] = 240; },
  ],
  behaviors: {
    "ai.bot": {
      step(s, e) {
        const fast = rushing(s, e);
        const d = chase(s, e, fast ? 140 : 70, 750);
        if (d < 1000 && e.hitCd === 0) {
          e.hitCd = 45;
          const dmg = pct(12 + 4 * (e.n - 1), fast ? 150 : 100);
          if (dealDamage(s, e.o, other(e.o), dmg, { hitstun: 4, interrupt: false }) && ++e.w % 3 === 0) e.n = Math.min(3, e.n + 1);
        }
      },
    },
    "ai.drone": {
      step(s, e) {
        const f = s.f[e.o], t = s.f[other(e.o)];
        if (rushing(s, e)) {
          chase(s, e, 110, 1500);
          if (e.hitCd === 0 && targetable(t)) { e.hitCd = 30; droneShot(s, e, angleOf(t.x - e.x, t.y - e.y)); }
          return;
        }
        e.a = (e.a + 1) % 64;
        e.x = f.x + dx(e.a, 900); e.y = f.y + dy(e.a, 900);
      },
    },
    "ai.dshot": { onHit: (s, e, j) => { dealDamage(s, e.o, j, pct(8, e.mult), { hitstun: 4 }); return true; }, onWall: () => true },
  },
} satisfies JobImpl);
