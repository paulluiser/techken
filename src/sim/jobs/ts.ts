// Technical Support (data/kits.gen.ts). Passive Hold Music: enemies near your customers are Slowed 15 %.
// S1 Ticket Fan: 3 tickets in a fan, 12 each. S2 Angry Customer: a customer pet for 6 s (max 2).
// S3 Escalate: turns a customer into a Manager whose slam Stuns 0.5 s (or summons a customer).
import { aimOf, chase, dealDamage, fx, other, pet, petsOf, registerJob, shoot, slow, type JobImpl } from "../core";
import { angleOf, dist, dx, dy } from "../fixed";
import { FX, type Entity, type State } from "../types";

export const TS = 8;
function holdMusic(s: State, e: Entity) {
  const t = s.f[other(e.o)];
  if (dist(e.x, e.y, t.x, t.y) <= 2000) slow(t, 15, 20);
}
function customer(s: State, i: number, a: number) {
  const mine = petsOf(s, i).filter((e) => e.b === "ts.customer" || e.b === "ts.manager");
  if (mine.length >= 2) mine[0].hp = 0; // max 2: the oldest leaves
  const f = s.f[i];
  return pet(s, i, "ts.customer", f.x + dx(a, 700), f.y + dy(a, 700), 320, 360, 60);
}
registerJob(TS, {
  range: 5000, arc: 0,
  ai: [[0, 5], [0, 8], [0, 8]],
  skills: [
    (s, i, inp) => { const a = aimOf(s, i, inp); for (const k of [-4, 0, 4]) shoot(s, i, "ts.ticket", a + k, 300, 220, 30, 12); },
    (s, i, inp) => { customer(s, i, aimOf(s, i, inp)); },
    (s, i, inp) => {
      const c = petsOf(s, i, "ts.customer")[0];
      if (!c) { customer(s, i, aimOf(s, i, inp)); return; }
      c.b = "ts.manager"; c.hp = 150; c.t = 600; c.t0 = 600; c.r = 420;
      fx(s, FX.SKILL, c.x, c.y, 3, i);
    },
  ],
  behaviors: {
    "ts.ticket": { onHit: (s, e, j) => { dealDamage(s, e.o, j, 12, { hitstun: 6 }); return true; }, onWall: () => true },
    "ts.customer": {
      step(s, e) {
        holdMusic(s, e);
        const d = chase(s, e, 65, 750);
        const t = s.f[other(e.o)];
        if (d < 950 && e.hitCd === 0) { e.hitCd = 60; dealDamage(s, e.o, other(e.o), 10, { hitstun: 8, knockA: angleOf(t.x - e.x, t.y - e.y), knockSpeed: 70, knockFrames: 6 }); }
      },
    },
    "ts.manager": {
      step(s, e) {
        holdMusic(s, e);
        const d = chase(s, e, 55, 850);
        if (d < 1150 && e.hitCd === 0) { e.hitCd = 90; fx(s, FX.BLAST, e.x, e.y, 1100, e.o); dealDamage(s, e.o, other(e.o), 40, { stun: 30, interrupt: true }); }
      },
    },
  },
} satisfies JobImpl);
