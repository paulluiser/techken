// Deterministic top-down fight simulation (GAME_DESIGN.md v0.3). Rules:
//  - integers only (no floats in state, no Math.sin/cos, no Date, no Math.random)
//  - step() depends only on (state, inputs); randomness comes from state.rng
//  - the whole state is plain data so it can be cloned and checksummed every frame
import * as C from "./constants";
import { ARENAS } from "./arenas";
import { KITS } from "./data/kits.gen";
import {
  aimOf, BEH, canAct, collide, dealDamage, fx, implOf, kitOf, moveEntity, other, rand, spawn, spendMot, targetable, tickStatus,
} from "./core";
import { angleDiff, angleOf, dist, dx, dy } from "./fixed";
import { IN_ATTACK, IN_DASH, IN_SKILLS, moveAngle, type Input } from "./input";
import "./jobs";
import { FX, K, N_RES, N_ST, N_STATS, S, ST, type Entity, type Fighter, type MatchConfig, type State } from "./types";

export type { State, Fighter, Entity, MatchConfig } from "./types";

export const PHASE_INTRO = 0;
export const PHASE_FIGHT = 1;
export const PHASE_ROUND_END = 2;
export const PHASE_MATCH_END = 3;
export const OT_FRAMES = C.OT_FRAMES;

export const DEFAULT_CONFIG: MatchConfig = { jobs: [0, 5], arena: 0, seed: 20261124 };

// Ranged basics (used from R2): a plain shot.
Object.assign(BEH, {
  "basic.shot": {
    onHit(s: State, e: Entity, j: number) {
      dealDamage(s, e.o, j, e.mult, { basic: true, full: e.n === 1, hitstun: e.n === 1 ? C.FULL_HITSTUN : C.TAP_HITSTUN, knockA: e.n === 1 ? angleOf(e.vx, e.vy) : undefined });
      return true;
    },
    onWall: () => true,
  },
});

function newFighter(cfg: MatchConfig, i: 0 | 1, hp = C.HP_MAX): Fighter {
  const a = ARENAS[cfg.arena], [x, y] = a.start[i];
  return {
    job: cfg.jobs[i], x, y, face: i === 0 ? 0 : 32,
    hp, mot: C.MOT_MAX, motIdle: 0, burnout: 0,
    charging: 0, charge: 0, recovery: 0, hitstun: 0,
    swing: 0, swingFull: 0, swingA: 0,
    kx: 0, ky: 0, kT: 0, kSplat: 0,
    dash: 0, dashA: 0, dashCd: 0, iframes: 0,
    cast: 0, castSkill: 0,
    air: 0, air0: 0, ax0: 0, ay0: 0, ax1: 0, ay1: 0,
    cd: [0, 0, 0], st: new Array(N_ST).fill(0), res: new Array(N_RES).fill(0),
    prevIn: 0, flash: 0,
  };
}

export function initState(cfg: MatchConfig = DEFAULT_CONFIG): State {
  const c: MatchConfig = { ...cfg, jobs: [cfg.jobs[0], cfg.jobs[1]], arena: cfg.arena % ARENAS.length };
  return {
    frame: 0, phase: PHASE_INTRO, phaseT: C.INTRO_FRAMES,
    timer: C.ROUND_FRAMES, round: 1, ot: 0, finalRound: 0,
    wins: [0, 0], roundWinner: -1, matchWinner: -1,
    cfg: c, rng: (cfg.seed >>> 0) || 1, nextId: 1,
    f: [newFighter(c, 0), newFighter(c, 1)],
    ents: [], fx: [],
    stats: [new Array(N_STATS).fill(0), new Array(N_STATS).fill(0)],
  };
}

const cloneF = (a: Fighter): Fighter => ({ ...a, cd: a.cd.slice(), st: a.st.slice(), res: a.res.slice() });
export function cloneState(s: State): State {
  return {
    ...s,
    wins: [s.wins[0], s.wins[1]],
    cfg: { ...s.cfg, jobs: [s.cfg.jobs[0], s.cfg.jobs[1]] },
    f: [cloneF(s.f[0]), cloneF(s.f[1])],
    ents: s.ents.map((e) => ({ ...e })),
    fx: s.fx.map((e) => ({ ...e })),
    stats: [s.stats[0].slice(), s.stats[1].slice()],
  };
}

/** FNV-1a over the whole state. Used once per second by the netcode to detect desyncs. */
export function checksum(s: State): number {
  const str = JSON.stringify(s);
  let h = 0x811c9dc5;
  for (let k = 0; k < str.length; k++) { h ^= str.charCodeAt(k); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// ---------- fighters ----------
function release(s: State, i: number, inp: Input) {
  const f = s.f[i], kit = kitOf(f), impl = implOf(f);
  const c = Math.min(f.charge, kit.charge);
  const full = c >= kit.charge, tap = c * 100 < kit.charge * C.TAP_PCT;
  const dmg = full ? kit.full : tap ? kit.tap : kit.tap + Math.trunc(((kit.full - kit.tap) * c) / kit.charge);
  const a = aimOf(s, i, inp);
  f.face = a; f.swing = C.SWING_FRAMES; f.swingFull = full ? 1 : 0; f.swingA = a;
  f.charging = 0; f.charge = 0;
  f.recovery = full ? C.FULL_RECOVERY : tap ? C.TAP_RECOVERY + Math.trunc(kit.charge / 3) : C.MID_RECOVERY;
  if (kit.ranged) {
    spawn(s, { k: K.PROJ, b: "basic.shot", o: i, x: f.x + dx(a, 450), y: f.y + dy(a, 450), vx: dx(a, C.SHOT_SPEED), vy: dy(a, C.SHOT_SPEED), r: 220, t: 45, mult: dmg, n: full ? 1 : 0 });
    return;
  }
  const o = s.f[other(i)];
  if (!targetable(o)) return;
  const d = dist(f.x, f.y, o.x, o.y);
  const inArc = angleDiff(angleOf(o.x - f.x, o.y - f.y, a), a) <= impl.arc;
  if (d <= impl.range + C.FIGHTER_R / 2 && (inArc || d <= C.FIGHTER_R * 2)) {
    dealDamage(s, i, other(i), dmg, { basic: true, full, light: tap, hitstun: full ? C.FULL_HITSTUN : tap ? C.TAP_HITSTUN : 18, knockA: full ? a : undefined, interrupt: true });
  }
}

/** Decides fighter i's actions for this frame. Hits and skills are returned and resolved after both fighters moved. */
function stepFighter(s: State, i: number, inp: Input): number {
  const f = s.f[i], kit = kitOf(f), impl = implOf(f);
  const press = inp & ~f.prevIn;
  f.prevIn = inp;
  tickStatus(f);
  if (f.flash > 0) f.flash--;
  if (f.swing > 0) f.swing--;
  if (f.dashCd > 0) f.dashCd--;
  if (f.iframes > 0) f.iframes--;
  if (f.cast > 0) f.cast--;
  if (f.recovery > 0) f.recovery--;
  if (f.hitstun > 0) f.hitstun--;
  for (let k = 0; k < 3; k++) if (f.cd[k] > 0) f.cd[k]--;
  if (f.burnout > 0 && --f.burnout === 0) f.mot = C.BURNOUT_RECOVER;
  if (++f.motIdle > C.MOT_REGEN_DELAY && f.burnout === 0) f.mot = Math.min(C.MOT_MAX, f.mot + C.MOT_REGEN);
  if (f.hp <= 0) return 0;

  // leaps (DROP TABLE): move along the arc, untargetable until landing
  if (f.air > 0) {
    const p = f.air0 - f.air + 1;
    f.x = f.ax0 + Math.trunc(((f.ax1 - f.ax0) * p) / f.air0);
    f.y = f.ay0 + Math.trunc(((f.ay1 - f.ay0) * p) / f.air0);
    if (--f.air === 0) { const c = collide(s, f.x, f.y, C.FIGHTER_R); f.x = c.x; f.y = c.y; return PEND_LAND; }
    return 0;
  }
  // knockback and pulls
  if (f.kT > 0) {
    const c = collide(s, f.x + f.kx, f.y + f.ky, C.FIGHTER_R);
    f.x = c.x; f.y = c.y; f.kT--;
    if (c.hit && f.kSplat) { f.kT = 0; f.hitstun = Math.max(f.hitstun, C.WALL_SPLAT); fx(s, FX.SPLAT, f.x, f.y, 0, i); }
  }
  impl.tick?.(s, i);
  if (f.dash > 0) {
    const c = collide(s, f.x + dx(f.dashA, C.DASH_SPEED), f.y + dy(f.dashA, C.DASH_SPEED), C.FIGHTER_R);
    f.x = c.x; f.y = c.y; f.dash--;
  }
  if (f.st[S.STUN] > 0 || f.hitstun > 0 || f.kT > 0) return 0;

  // walking
  const m = moveAngle(inp);
  if (m >= 0 && f.st[S.ROOT] === 0 && f.dash === 0 && f.cast === 0) {
    let sp = C.SPEEDS[kit.speed];
    if (f.charging) sp = Math.trunc((sp * C.CHARGE_MOVE_PCT) / 100);
    if (f.burnout > 0) sp = Math.trunc((sp * C.BURNOUT_MOVE_PCT) / 100);
    if (f.st[S.SLOW_T] > 0) sp = Math.trunc((sp * (100 - f.st[S.SLOW_PCT])) / 100);
    const c = collide(s, f.x + dx(m, sp), f.y + dy(m, sp), C.FIGHTER_R);
    f.x = c.x; f.y = c.y;
    if (!f.charging) f.face = m;
  }
  if (f.charging) f.face = aimOf(s, i, inp);

  // dash
  if (press & IN_DASH && f.dashCd === 0 && f.burnout === 0 && f.st[S.ROOT] === 0 && f.cast === 0 && f.dash === 0 && f.mot >= C.DASH_COST) {
    f.dash = C.DASH_FRAMES; f.dashA = m >= 0 ? m : f.face; f.iframes = C.DASH_IFRAMES; f.dashCd = C.DASH_CD;
    f.charging = 0; f.charge = 0; f.recovery = 0;
    spendMot(s, i, C.DASH_COST);
    s.stats[i][ST.DASHES]++;
    fx(s, FX.DASH, f.x, f.y, f.dashA, i);
    return 0;
  }

  // skills (casting cancels a charge; a skill you can't afford is a Crunch Cast)
  for (let k = 0; k < 3; k++) {
    if (!(press & IN_SKILLS[k]) || f.cd[k] > 0 || f.st[S.SILENCE] > 0) continue;
    if (f.recovery > 0 || f.dash > 0 || f.cast > 0 || f.burnout > 0) break;
    f.charging = 0; f.charge = 0;
    f.cd[k] = kit.skills[k].cd; f.cast = C.CAST_LOCK; f.castSkill = k + 1;
    return PEND_SKILL + k;
  }

  // basic attack: hold to charge, release to swing
  if (!canAct(f)) return 0;
  if (inp & IN_ATTACK) {
    if (!f.charging) { f.charging = 1; f.charge = 0; }
    f.charge++;
    if (f.charge >= kit.charge + C.CHARGE_HOLD) return PEND_RELEASE;
  } else if (f.charging) return PEND_RELEASE;
  return 0;
}

const PEND_RELEASE = 1, PEND_LAND = 2, PEND_SKILL = 10;
/** Resolves what stepFighter decided, after both fighters have moved, so P1 isn't disadvantaged. */
function resolve(s: State, i: number, pend: number, inp: Input) {
  const f = s.f[i];
  if (pend === PEND_RELEASE) release(s, i, inp);
  else if (pend === PEND_LAND) implOf(f).onAirEnd?.(s, i);
  else if (pend >= PEND_SKILL) {
    const k = pend - PEND_SKILL, sk = kitOf(f).skills[k], crunch = f.mot < sk.cost;
    s.stats[i][ST.SKILLS]++;
    fx(s, FX.SKILL, f.x, f.y, 10 + k, i);
    implOf(f).skills[k](s, i, inp);
    spendMot(s, i, crunch ? f.mot : sk.cost);
  }
}

function stepEntities(s: State) {
  const keep: Entity[] = [];
  for (const e of s.ents) {
    if (e.hitCd > 0) e.hitCd--;
    e.t--;
    const b = BEH[e.b];
    let gone = false;
    if (e.k === K.PROJ) {
      gone = moveEntity(s, e);
      const j = other(e.o), t = s.f[j];
      if (!gone && targetable(t) && dist(e.x, e.y, t.x, t.y) < e.r + C.FIGHTER_R) gone = b?.onHit ? b.onHit(s, e, j) : true;
      if (!gone && e.t <= 0) { b?.onExpire?.(s, e); gone = true; }
    } else if (e.k === K.DELAYED) {
      if (e.t <= 0) { b?.onExpire?.(s, e); gone = true; }
    }
    if (!gone) keep.push(e);
  }
  s.ents = keep;
}

/** Fighters can't overlap: push them apart. */
function separate(s: State) {
  const [a, b] = s.f;
  if (!targetable(a) || !targetable(b)) return;
  const min = C.FIGHTER_R * 2, d = dist(a.x, a.y, b.x, b.y);
  if (d >= min) return;
  const ang = angleOf(b.x - a.x, b.y - a.y, 0), push = ((min - d) >> 1) + 1;
  const ca = collide(s, a.x - dx(ang, push), a.y - dy(ang, push), C.FIGHTER_R);
  const cb = collide(s, b.x + dx(ang, push), b.y + dy(ang, push), C.FIGHTER_R);
  a.x = ca.x; a.y = ca.y; b.x = cb.x; b.y = cb.y;
}

// ---------- round flow ----------
function resetRound(s: State) {
  const hp = s.finalRound ? C.HP_MAX / 2 : C.HP_MAX;
  s.f = [newFighter(s.cfg, 0, hp), newFighter(s.cfg, 1, hp)];
  s.ents = [];
  s.timer = C.ROUND_FRAMES; s.ot = 0; s.roundWinner = -1;
  s.phase = PHASE_INTRO; s.phaseT = C.INTRO_FRAMES;
  for (const st of s.stats) st[ST.COMBO] = 0;
}

function endRound(s: State, w: number) {
  s.roundWinner = w;
  if (w === 2) { s.wins[0]++; s.wins[1]++; } else s.wins[w]++;
  s.phase = PHASE_ROUND_END; s.phaseT = C.ROUND_END_FRAMES;
  fx(s, FX.KO, 0, 0, w, 0);
}

function afterRound(s: State) {
  const [a, b] = s.wins, need = C.WINS_NEEDED;
  if (s.finalRound) s.matchWinner = s.roundWinner;
  else if (a >= need && b >= need) { s.finalRound = 1; }
  else if (a >= need) s.matchWinner = 0;
  else if (b >= need) s.matchWinner = 1;
  if (s.matchWinner >= 0) { s.phase = PHASE_MATCH_END; s.phaseT = C.MATCH_END_FRAMES; return; }
  s.round++;
  resetRound(s);
}

const hpPct = (f: Fighter) => f.hp; // equal max HP, so raw HP compares fairly

/** Advances the match by one frame. */
export function step(s: State, inputs: [Input, Input]) {
  s.frame++;
  switch (s.phase) {
    case PHASE_INTRO:
      if (--s.phaseT <= 0) s.phase = PHASE_FIGHT;
      for (const f of s.f) f.prevIn = 0;
      return;
    case PHASE_ROUND_END:
      if (--s.phaseT <= 0) afterRound(s);
      return;
    case PHASE_MATCH_END:
      if (--s.phaseT <= 0 && s.cfg.loop) {
        const cfg = { ...s.cfg, seed: rand(s, 2 ** 30) + 1 };
        Object.assign(s, initState(cfg));
      }
      return;
  }
  const p0 = stepFighter(s, 0, inputs[0]), p1 = stepFighter(s, 1, inputs[1]);
  resolve(s, 0, p0, inputs[0]);
  resolve(s, 1, p1, inputs[1]);
  stepEntities(s);
  separate(s);

  const ko0 = s.f[0].hp <= 0, ko1 = s.f[1].hp <= 0;
  if (ko0 || ko1) { endRound(s, ko0 && ko1 ? 2 : ko0 ? 1 : 0); return; }
  if (s.roundWinner >= 0) { endRound(s, s.roundWinner); return; } // overtime hit
  if (--s.timer > 0) return;
  const h0 = hpPct(s.f[0]), h1 = hpPct(s.f[1]);
  if (h0 !== h1) { endRound(s, h0 > h1 ? 0 : 1); return; }
  if (!s.ot) { s.ot = 1; s.timer = C.OT_FRAMES; return; }
  endRound(s, 2);
}

export { KITS };
