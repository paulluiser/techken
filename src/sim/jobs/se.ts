// Software Engineer (kit numbers: data/kits.gen.ts, design/kits_v3.py).
// Passive Compiler: every 3rd hit, the next skill does +25 % damage.
// S1 Semicolon Strike: dash forward, 50 dmg, interrupts.
// S2 Brace Cage: braces snap shut on a spot after 0.5 s. 30 dmg, Stun 1.2 s.
// S3 Recursion: a shot that bounces off walls and hits up to 3 times for 35.
import * as C from "../constants";
import { aimOf, collide, dealDamage, fx, other, registerJob, spawn, spotOf, type JobImpl } from "../core";
import { dist, dx, dy } from "../fixed";
import { FX, K, type State } from "../types";

export const SE = 0;
const R = { HITS: 0, COMPILED: 1, STRIKE_T: 2, STRIKE_A: 3, STRIKE_HIT: 4, MULT: 5 } as const;
const T = C.TILE;

/** Consumes Compiler: returns the damage multiplier (percent) for this skill. */
function compiled(s: State, i: number): number {
  const r = s.f[i].res;
  if (!r[R.COMPILED]) return 100;
  r[R.COMPILED] = 0;
  return 125;
}
const pct = (v: number, m: number) => Math.trunc((v * m) / 100);

const impl: JobImpl = {
  range: 1750, arc: 11,
  skills: [
    (s, i, inp) => { // Semicolon Strike
      const f = s.f[i];
      f.res[R.STRIKE_T] = 10; f.res[R.STRIKE_A] = aimOf(s, i, inp); f.res[R.STRIKE_HIT] = 0; f.res[R.MULT] = compiled(s, i);
      f.face = f.res[R.STRIKE_A];
    },
    (s, i, inp) => { // Brace Cage
      const p = spotOf(s, i, inp, 4 * T, 6 * T);
      spawn(s, { k: K.DELAYED, b: "se.cage", o: i, x: p.x, y: p.y, vx: 0, vy: 0, r: 1100, t: 30, mult: compiled(s, i) });
    },
    (s, i, inp) => { // Recursion
      const f = s.f[i], a = aimOf(s, i, inp);
      f.face = a;
      spawn(s, { k: K.PROJ, b: "se.recursion", o: i, x: f.x + dx(a, 500), y: f.y + dy(a, 500), vx: dx(a, 240), vy: dy(a, 240), r: 260, t: 180, mult: compiled(s, i) });
    },
  ],
  tick(s, i) {
    const f = s.f[i], r = f.res;
    if (r[R.STRIKE_T] <= 0) return;
    r[R.STRIKE_T]--;
    const c = collide(s, f.x + dx(r[R.STRIKE_A], 320), f.y + dy(r[R.STRIKE_A], 320), C.FIGHTER_R);
    f.x = c.x; f.y = c.y;
    const o = s.f[other(i)];
    if (!r[R.STRIKE_HIT] && dist(f.x, f.y, o.x, o.y) < C.FIGHTER_R * 2 + 200) {
      r[R.STRIKE_HIT] = 1; r[R.STRIKE_T] = 0;
      dealDamage(s, i, other(i), pct(50, r[R.MULT]), { hitstun: 18, interrupt: true });
    }
  },
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
        if (!dealDamage(s, e.o, j, pct(35, e.mult), { hitstun: 10, interrupt: true })) return false;
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
