// Shared combat helpers used by the sim and by every job: damage pipeline, status effects
// with the GDD caps, entity spawning and collision. Integer math only.
import * as C from "./constants";
import { BEH, JOBS, type Hit, type JobDef, type SetDef } from "./registry";
import { K, S, type Entity, type Fighter, type State } from "./types";

// ---------------- basics ----------------
export const SUB = C.SUB;
export const px = (n: number) => n * SUB;
export const min = (a: number, b: number) => (a < b ? a : b);
export const max = (a: number, b: number) => (a > b ? a : b);
export const abs = (a: number) => (a < 0 ? -a : a);
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const pm = (v: number, permille: number) => Math.trunc((v * permille) / 1000);

/** Seeded LCG stored in the state, so both peers draw the same numbers. */
export function rnd(s: State): number {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng >>> 8;
}
export const rndInt = (s: State, n: number) => rnd(s) % n;

export function jobOf(f: Fighter): JobDef {
  const j = JOBS[f.job];
  if (!j) throw new Error(`job ${f.job} not implemented`);
  return j;
}
export const setOf = (f: Fighter): SetDef => jobOf(f).sets[f.set];
export const opp = (i: number) => 1 - i;

export function bodyH(f: Fighter) { return 30 + jobOf(f).weight * 2; } // px: 32..40
export const BODY_W = 20;

export interface Box { x1: number; x2: number; y1: number; y2: number } // sub-px
export function fighterBox(f: Fighter): Box {
  const hw = px(BODY_W / 2);
  return { x1: f.x - hw, x2: f.x + hw, y1: f.y - px(bodyH(f)), y2: f.y };
}
export function entBox(e: Entity): Box {
  const hw = px(e.w) >> 1;
  // shots (PROJ) are centered on y; everything else stands on y
  if (e.k === K.PROJ) { const hh = px(e.h) >> 1; return { x1: e.x - hw, x2: e.x + hw, y1: e.y - hh, y2: e.y + hh }; }
  return { x1: e.x - hw, x2: e.x + hw, y1: e.y - px(e.h), y2: e.y };
}
export const overlap = (a: Box, b: Box) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
export function box(cx: number, bottom: number, w: number, h: number): Box {
  return { x1: cx - (px(w) >> 1), x2: cx + (px(w) >> 1), y1: bottom - px(h), y2: bottom };
}
/** Horizontal distance in px. */
export const dxPx = (a: Fighter, b: Fighter) => Math.trunc(abs(a.x - b.x) / SUB);
export const atWall = (f: Fighter) => f.x <= px(C.WALL_L + 24) || f.x >= px(C.WALL_R - 24);

// ---------------- resources ----------------
export function spendMot(f: Fighter, cost: number): boolean {
  if (f.burnout > 0) return false;
  f.mot -= cost;
  f.motIdle = 0;
  if (f.mot <= 0) { // Crunch: the action still happens, then you burn out
    f.mot = 0;
    f.burnout = C.BURNOUT_FRAMES;
    f.charging = 0; f.charge = 0; f.guarding = 0;
  }
  return true;
}
export function motMax(f: Fighter) { return C.MOT_MAX + f.st[S.PERM_MOT] * 2000; }
export function addMot(f: Fighter, n: number) { if (f.burnout === 0) f.mot = clamp(f.mot + n, 0, motMax(f)); }
export function heal(f: Fighter, n: number) { if (f.hp > 0) f.hp = min(C.HP_MAX, f.hp + n); }
export function addShield(f: Fighter, n: number, frames: number) { f.st[S.SHIELD] = max(f.st[S.SHIELD], n); f.st[S.SHIELD_T] = max(f.st[S.SHIELD_T], frames); }
export function buff(f: Fighter, kind: "dmg" | "spd" | "chg" | "regen", pct: number, frames: number) {
  const [T, V] = kind === "dmg" ? [S.DMG_BUF_T, S.DMG_BUF] : kind === "spd" ? [S.SPD_BUF_T, S.SPD_BUF] : kind === "chg" ? [S.CHG_BUF_T, S.CHG_BUF] : [S.REGEN_BUF_T, S.REGEN_BUF];
  f.st[V] = f.st[T] > 0 ? max(f.st[V], pct) : pct;
  f.st[T] = max(f.st[T], frames);
}

// ---------------- status effects (GDD 8.1 caps) ----------------
function ccImmune(f: Fighter) { return f.st[S.CC_IMMUNE] > 0 || f.st[S.CC_IMMUNE_ITEM] > 0 || f.st[S.INVULN] > 0; }
export function cancelActions(f: Fighter) {
  f.charging = 0; f.charge = 0; f.atk = 0; f.recovery = 0; f.dash = 0; f.guarding = 0; f.st[S.CAST] = 0;
}
/** Stun / freeze / trap / lock / grab. Max 1.5 s, then 1 s immunity. */
export function stun(s: State, t: number, frames: number): boolean {
  const f = s.f[t];
  if (ccImmune(f)) return false;
  const adj = setOf(f).onCC?.(s, t, frames) ?? frames;
  f.st[S.STUN] = max(f.st[S.STUN], min(adj, C.HARD_CC_MAX));
  cancelActions(f);
  f.vx = 0;
  return true;
}
/** Can't move, can still act. Shares the hard-CC immunity. */
export function root(s: State, t: number, frames: number): boolean {
  const f = s.f[t];
  if (ccImmune(f)) return false;
  const adj = setOf(f).onCC?.(s, t, frames) ?? frames;
  f.st[S.ROOT] = max(f.st[S.ROOT], min(adj, C.HARD_CC_MAX));
  return true;
}
export function silence(s: State, t: number, frames: number): boolean {
  const f = s.f[t];
  if (f.st[S.SIL_IMMUNE] > 0 || f.st[S.CC_IMMUNE_ITEM] > 0 || f.st[S.INVULN] > 0) return false;
  const adj = setOf(f).onCC?.(s, t, frames) ?? frames;
  f.st[S.SILENCE] = max(f.st[S.SILENCE], min(adj, C.SILENCE_MAX));
  return true;
}
export function slow(s: State, t: number, pct: number, frames: number) {
  const f = s.f[t];
  if (f.st[S.CC_IMMUNE_ITEM] > 0 || f.st[S.INVULN] > 0) return;
  pct = min(pct, C.SLOW_MAX);
  if (f.st[S.SLOW_T] <= 0 || pct >= f.st[S.SLOW_PCT]) f.st[S.SLOW_PCT] = pct;
  f.st[S.SLOW_T] = max(f.st[S.SLOW_T], frames);
}
export function invert(s: State, t: number, frames: number): boolean {
  const f = s.f[t];
  if (ccImmune(f)) return false;
  f.st[S.INVERT] = max(f.st[S.INVERT], min(frames, C.HARD_CC_MAX));
  return true;
}
/** Cooldown denial, capped at +5 s per skill in total. */
export function pushCd(f: Fighter, k: number, frames: number) {
  const room = C.CD_PUSH_MAX - f.cdPushed[k];
  const add = clamp(frames, 0, room);
  f.cd[k] += add; f.cdPushed[k] += add;
}

// ---------------- damage ----------------
const KB_WEIGHT = [0, 1300, 1150, 1000, 800, 600];

export function dealDamage(s: State, a: number, t: number, base: number, h: Hit): number {
  const T = s.f[t];
  const A = a >= 0 ? s.f[a] : null;
  if (T.hp <= 0 || s.phase !== 0 || base <= 0) return 0;
  const reactive = h.kind !== "dot" && h.kind !== "mirror";
  if (reactive && (T.st[S.INVULN] > 0 || (T.iframes > 0 && h.kind !== "env"))) return 0;

  // finally { } counter stance
  if (A && reactive && h.kind !== "counter" && T.st[S.COUNTER] > 0) {
    const cdmg = T.st[S.COUNTER_DMG];
    T.st[S.COUNTER] = 0;
    dealDamage(s, t, a!, cdmg, { kind: "counter", melee: true, hitstun: 24, kbx: T.facing * px(4), unreflectable: true });
    return 0;
  }
  // Mirror Protocol reflect
  if (A && reactive && h.kind !== "counter" && !h.unreflectable && T.st[S.REFLECT] > 0) {
    if (h.proj) { dealDamage(s, t, a!, base, { kind: "counter", proj: true, hitstun: 12, unreflectable: true }); return 0; }
    if (h.melee) { const half = base >> 1; dealDamage(s, t, a!, half, { kind: "counter", hitstun: 12, unreflectable: true }); base = base - half; }
  }

  let dmg = base;
  if (reactive) {
    if (A) {
      dmg = pm(dmg, 1000 + A.st[S.PERM_DMG] * 80);
      if (A.st[S.DMG_BUF_T] > 0) dmg = pm(dmg, 1000 + A.st[S.DMG_BUF]);
      const mo = setOf(A).modOut?.(s, a, t, h); if (mo) dmg = pm(dmg, mo);
      if (A.st[S.RATE_LIMIT] > 0) dmg = pm(dmg, 700);
    }
    if (h.crit) dmg = pm(dmg, 1500);
    if (T.st[S.WEAK] > 0) dmg = pm(dmg, 1200);
    dmg = pm(dmg, 1000 - T.st[S.PERM_ARMOR] * 100);
    const mi = setOf(T).modIn?.(s, t, a, h); if (mi) dmg = pm(dmg, mi);
    if (T.st[S.RATE_LIMIT] > 0) dmg = pm(dmg, 1150);
    if (A && T.st[S.UNHANDLED] > 0) { dmg += 30; T.st[S.UNHANDLED] = 0; }
  }

  // guard
  let guarded = false;
  if (reactive && A && T.guarding && !h.noGuard) {
    if (h.full && h.kind === "basic") {
      T.guarding = 0; T.st[S.GUARD_BREAK] = C.GUARD_BREAK_STUN;
    } else {
      const block = T.burnout > 0 ? C.GUARD_BLOCK_BURNOUT : jobOf(T).guard ?? C.GUARD_BLOCK;
      dmg = pm(dmg, 1000 - block);
      guarded = true;
      const cost = guardCost(s, t);
      if (cost > 0) spendMot(T, cost);
    }
  }
  // shield
  if (T.st[S.SHIELD] > 0 && dmg > 0) {
    const ab = min(dmg, T.st[S.SHIELD]);
    T.st[S.SHIELD] -= ab; dmg -= ab;
  }
  dmg = max(0, dmg);
  T.hp -= dmg;
  if (dmg > 0) T.lastDmg = dmg;
  if (reactive) { T.flash = 6; T.st[S.HURT_IDLE] = 0; }
  if (h.kind === "basic" && A) { addMot(A, C.MOT_ON_HIT); addMot(T, C.MOT_ON_HURT); }

  // hitstun + knockback
  if (reactive && !guarded && (h.hitstun ?? 0) > 0) {
    const armored = jobOf(T).superArmor && T.charging && T.charge >= chargeFull(s, t);
    if (!armored) {
      const kbm = KB_WEIGHT[jobOf(T).weight];
      T.hitstun = max(T.hitstun, h.hitstun ?? 0);
      if (h.kbx) T.vx = pm(h.kbx, kbm);
      if (h.kby) { T.vy = pm(h.kby, kbm); T.onGround = 0; }
      T.charging = 0; T.charge = 0; T.atk = 0; T.recovery = 0; T.dash = 0; T.guarding = 0; T.st[S.CAST] = 0;
    }
  }
  if (T.st[S.GUARD_BREAK] > 0 && h.full) { T.hitstun = max(T.hitstun, T.st[S.GUARD_BREAK]); T.st[S.GUARD_BREAK] = 0; }

  if (A && reactive) setOf(A).onDealt?.(s, a, t, dmg, h);
  if (reactive) setOf(T).onTaken?.(s, t, a, dmg, h);

  // JOIN: 40 % of damage either fighter takes is mirrored to the other
  if (h.kind !== "mirror" && dmg > 0 && (T.st[S.JOIN] > 0 || s.f[opp(t)].st[S.JOIN] > 0)) {
    dealDamage(s, -1, opp(t), pm(dmg, 400), { kind: "mirror" });
  }
  if (T.hp <= 0) {
    if (!setOf(T).onLethal?.(s, t)) T.hp = 0;
  }
  return dmg;
}

/** Cybersecurity's first block every 3 s is free; set by its job file via res[7]. */
export function guardCost(s: State, t: number): number {
  const f = s.f[t];
  if (jobOf(f).id === "cs" && f.res[7] <= 0) { f.res[7] = C.sec(3); return 0; }
  return C.GUARD_COST;
}

export function chargeFull(s: State, i: number): number {
  const f = s.f[i], j = jobOf(f);
  let c = j.chargeFull;
  c = pm(c, 1000 - f.st[S.PERM_CHARGE] * 150);
  if (f.st[S.CHG_BUF_T] > 0) c = pm(c, 1000 - f.st[S.CHG_BUF]);
  const m = setOf(f).chargeMul?.(s, i); if (m) c = pm(c, m);
  return max(12, c);
}

// ---------------- entities ----------------
export function spawn(s: State, e: Partial<Entity> & { b: string; o: number; k: number }): Entity {
  const ent: Entity = {
    id: s.nextId++, k: e.k, b: e.b, o: e.o,
    x: e.x ?? 0, y: e.y ?? 0, vx: e.vx ?? 0, vy: e.vy ?? 0, w: e.w ?? 8, h: e.h ?? 8,
    hp: e.hp ?? 1, life: e.life ?? 60, t: 0, dmg: e.dmg ?? 0, p1: e.p1 ?? 0, p2: e.p2 ?? 0, p3: e.p3 ?? 0, hits: 0,
  };
  s.ents.push(ent);
  return ent;
}
export const ownEnts = (s: State, o: number, b: string) => s.ents.filter((e) => e.o === o && e.b === b && e.hp > 0);
export function kill(e: Entity) { e.hp = 0; e.life = 0; }

/** Fire a shot from fighter i, in front of it at chest height. */
export function shoot(s: State, i: number, b: string, o: { speed: number; dmg: number; life: number; w?: number; h?: number; vy?: number; p1?: number; p2?: number; p3?: number; dy?: number }): Entity {
  const f = s.f[i];
  return spawn(s, {
    k: K.PROJ, b, o: i, x: f.x + f.facing * px(14), y: f.y - px(o.dy ?? 20),
    vx: f.facing * o.speed, vy: o.vy ?? 0, w: o.w ?? 8, h: o.h ?? 6, life: o.life, dmg: o.dmg, p1: o.p1 ?? 0, p2: o.p2 ?? 0, p3: o.p3 ?? 0,
  });
}

/** Default projectile movement + hit. `onHit` returns true to keep the projectile alive. */
export function projStep(s: State, e: Entity, onHit?: (s: State, e: Entity, t: number) => boolean, hit?: Hit): boolean {
  e.x += e.vx; e.y += e.vy; e.t++;
  if (--e.life <= 0 || e.x < px(C.WALL_L) || e.x > px(C.WALL_R) || e.y > px(C.H + 20) || e.y < -px(60)) return false;
  const b = entBox(e);
  // blocked by the opponent's walls
  for (const w of s.ents) if (w.k === K.WALL && w.o !== e.o && w.hp > 0 && overlap(b, entBox(w))) { w.hp -= e.dmg; if (w.hp <= 0) kill(w); return false; }
  const t = opp(e.o), T = s.f[t];
  if (overlap(b, fighterBox(T))) {
    const keep = onHit ? onHit(s, e, t) : (dealDamage(s, e.o, t, e.dmg, hit ?? { kind: "skill", proj: true, hitstun: 10, kbx: (e.vx > 0 ? 1 : -1) * px(1) }), false);
    return keep;
  }
  return true;
}

/** Generic ground summon: walks toward the opponent, attacks when close. */
export function walkerStep(s: State, e: Entity, speed: number, onClose: (s: State, e: Entity, t: number) => void, reach = 18, every = 45): boolean {
  if (--e.life <= 0 || e.hp <= 0) return false;
  e.t++;
  const t = opp(e.o), T = s.f[t];
  const dir = T.x > e.x ? 1 : -1;
  if (abs(T.x - e.x) > px(reach)) e.x += dir * speed;
  e.x = clamp(e.x, px(C.WALL_L + 6), px(C.WALL_R - 6));
  e.p3 = dir;
  if (e.p2 > 0) e.p2--;
  if (abs(T.x - e.x) <= px(reach + 4) && abs(T.y - e.y) < px(30) && e.p2 === 0) { onClose(s, e, t); e.p2 = every; }
  return true;
}

export function runBehavior(s: State, e: Entity): boolean {
  const fn = BEH[e.b];
  if (!fn) return --e.life > 0;
  return fn(s, e);
}
