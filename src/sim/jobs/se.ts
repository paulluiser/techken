// Software Engineer (kit numbers: data/kits.gen.ts, design/kits_v3.py).
// Passive Compiler: every 3rd hit, the next skill does +25 % damage.
// S1 Semicolon Strike: dash forward, 50 dmg, interrupts.
// S2 Brace Cage: braces snap shut on a spot after 0.4 s. 30 dmg, Stun 1.2 s.
// S3 Recursion: a shot that bounces off walls and hits up to 3 times for 40.
import * as C from "../constants";
import { aimOf, dealDamage, delayed, fx, lunge, other, pct, registerJob, shoot, spotOf, T, type JobImpl } from "../core";
import { dist } from "../fixed";
import { FX, type State } from "../types";

export const SE = 0;
const R = { HITS: 0, COMPILED: 1 } as const;

/** Consumes Compiler: returns the damage multiplier (percent) for this skill. */
function compiled(s: State, i: number): number {
  const r = s.f[i].res;
  if (!r[R.COMPILED]) return 100;
  r[R.COMPILED] = 0;
  return 125;
}

const impl: JobImpl = {
  range: 1750, arc: 11,
  ai: [[1.4, 3.6], [0, 6], [0, 8]],
  skills: [
    (s, i, inp) => lunge(s.f[i], aimOf(s, i, inp), 10, 320, pct(50, compiled(s, i)), true),
    (s, i, inp) => { const p = spotOf(s, i, inp, 4 * T, 6 * T); delayed(s, i, "se.cage", p.x, p.y, 1100, 24, { mult: compiled(s, i) }); },
    (s, i, inp) => { const a = aimOf(s, i, inp); s.f[i].face = a; shoot(s, i, "se.recursion", a, 240, 260, 180, 40, { mult: compiled(s, i) }); },
  ],
  onLand(s, i) {
    const r = s.f[i].res;
    if (++r[R.HITS] >= 3) { r[R.HITS] = 0; r[R.COMPILED] = 1; }
  },
  behaviors: {
    "se.cage": {
      onExpire(s, e) {
        const t = s.f[other(e.o)];
        fx(s, FX.SKILL, e.x, e.y, 2, e.o);
        if (dist(e.x, e.y, t.x, t.y) <= e.r + C.FIGHTER_R / 2) dealDamage(s, e.o, other(e.o), pct(30, e.mult), { stun: C.sec(1.2), interrupt: true });
      },
    },
    "se.recursion": {
      onHit(s, e, j) {
        // hitCd stays above 0 while the shot overlaps the target, so each pass hits once
        if (e.hitCd > 0) { e.hitCd = 2; return false; }
        if (!dealDamage(s, e.o, j, pct(40, e.mult), { hitstun: 10, interrupt: true })) return false;
        e.hitCd = 2;
        return ++e.n >= 3;
      },
      onWall(_s, e, nx, ny) {
        if (nx !== 0) e.vx = -e.vx;
        if (ny !== 0) e.vy = -e.vy;
        return false;
      },
    },
  },
};
registerJob(SE, impl);
