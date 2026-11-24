// Shared combat rules and the kit library: collision, damage, status effects, Motivation,
// entities (shots, warning circles, zones, walls, pets, rings). Job files (jobs/*.ts) build
// their skills from these (GAME_DESIGN.md v0.3 sections 1 and 3).
import * as C from "./constants";
import { ARENAS } from "./arenas";
import { KITS, type KitData } from "./data/kits.gen";
import { angleDiff, angleOf, clamp, dist, dx, dy, isqrt } from "./fixed";
import { aimAngle, aimDist, hasAim, type Input } from "./input";
import { FX, K, S, ST, type Entity, type Fighter, type State } from "./types";

// ---------- job behavior registry ----------
export interface Behavior {
  /** Shot touched the opponent. Return true to remove the shot. */
  onHit?(s: State, e: Entity, target: number): boolean;
  /** Shot touched a wall or cover. nx/ny is the surface normal (-1, 0, 1). Return true to remove it. */
  onWall?(s: State, e: Entity, nx: number, ny: number): boolean;
  /** Warning circle went off, a shot ran out of time, or a zone/pet/wall ended. */
  onExpire?(s: State, e: Entity): void;
  /** Zones, pets and rings: runs every frame. */
  step?(s: State, e: Entity): void;
}
export interface LandInfo { basic: boolean; full: boolean; x: number; y: number }
export interface JobImpl {
  /** Melee reach, center to center (units), and half-width of the swing arc (0-32 angle steps). */
  range: number; arc: number;
  /** Ranged basics: how many shots per release (spread), shot speed and radius. */
  shots?: number; shotSpeed?: number; shotR?: number;
  /** Database Admin: charging can't be interrupted. */
  armoredCharge?: boolean;
  /** Damage taken, in percent (Heavy = 90). */
  dmgTakenPct?: number;
  /** Mobile Developer: 2 dash charges. Cloud Engineer: dash distance in percent. */
  dashCharges?: number; dashPct?: number;
  /** The three skills. Called after the cost is paid. */
  skills: [(s: State, i: number, inp: Input) => void, (s: State, i: number, inp: Input) => void, (s: State, i: number, inp: Input) => void];
  /** CPU hints: when each skill is worth using, as [min, max] distance to the opponent in tiles. */
  ai: [[number, number], [number, number], [number, number]];
  /** Extra CPU condition for skill k (for example: only cash in Debt when there is some). */
  aiWhen?(s: State, i: number, k: number): boolean;
  /** CPU hint: melee kits that should still keep this distance (tiles), like the Cloud Engineer. */
  aiKeep?: number;
  /** Called once per frame for each fighter of this job. */
  tick?(s: State, i: number): void;
  /** The fighter landed a hit (any source). */
  onLand?(s: State, i: number, info: LandInfo): void;
  /** The fighter released a basic attack at angle a. */
  onRelease?(s: State, i: number, a: number): void;
  /** Outgoing damage modifier (percent of base) against fighter j. */
  outPct?(s: State, i: number, j: number): number;
  /** This hit crits (x1.5)? */
  crit?(s: State, i: number, j: number): boolean;
  /** Cooldown in percent (Project Manager's Velocity). */
  cdPct?(s: State, i: number): number;
  /** A skill was cast (after it ran). */
  onCast?(s: State, i: number, k: number): void;
  /** A leap (Fighter.air) just ended. */
  onAirEnd?(s: State, i: number): void;
  /** Round start (Network Admin places the router). */
  roundStart?(s: State, i: number): void;
  behaviors?: Record<string, Behavior>;
}
export const IMPL: (JobImpl | undefined)[] = [];
export const BEH: Record<string, Behavior> = {};
export function registerJob(job: number, impl: JobImpl) {
  IMPL[job] = impl;
  Object.assign(BEH, impl.behaviors ?? {});
}
export const kitOf = (f: Fighter): KitData => KITS[f.job];
export const implOf = (f: Fighter): JobImpl => IMPL[f.job]!;
/** Entity flags. */
export const TAG = { OWN_PASS: 1, PIERCE: 2, BREAKS: 4 } as const;
export const T = C.TILE;

// ---------- helpers ----------
export const other = (i: number) => 1 - i;
export const pct = (v: number, p: number) => Math.trunc((v * p) / 100);
/** xorshift32 on the state's seed. Returns 0..n-1. */
export function rand(s: State, n: number): number {
  let x = s.rng | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  s.rng = x >>> 0;
  return s.rng % n;
}
export function fx(s: State, k: number, x: number, y: number, v = 0, o = 0) {
  s.fx.push({ fr: s.frame, k, x, y, v, o });
  if (s.fx.length > 64) s.fx.splice(0, s.fx.length - 64);
}
type NewEnt = Omit<Entity, "id" | "t0" | "n" | "hitCd" | "mult" | "hp" | "dmg" | "w" | "h" | "a" | "tag" | "vx" | "vy"> & Partial<Entity>;
export function spawn(s: State, e: NewEnt): Entity {
  const ent: Entity = { vx: 0, vy: 0, n: 0, hitCd: 0, mult: 100, hp: 0, dmg: 0, w: 0, h: 0, a: 0, tag: 0, ...e, id: s.nextId++, t0: e.t };
  s.ents.push(ent);
  return ent;
}
export const targetable = (f: Fighter) => f.air === 0 && f.hp > 0;
export const canAct = (f: Fighter) =>
  f.hp > 0 && f.st[S.STUN] === 0 && f.hitstun === 0 && f.burnout === 0 && f.cast === 0 && f.recovery === 0 && f.air === 0 && f.dash === 0 && f.kT === 0 && f.lunge === 0;
/** Distance from point (px, py) to segment (x1, y1)-(x2, y2). */
export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const vx = x2 - x1, vy = y2 - y1, l2 = vx * vx + vy * vy;
  if (l2 === 0) return dist(px, py, x1, y1);
  const tt = clamp(Math.trunc((((px - x1) * vx + (py - y1) * vy) * 1024) / l2), 0, 1024);
  return dist(px, py, x1 + Math.trunc((vx * tt) / 1024), y1 + Math.trunc((vy * tt) / 1024));
}
/** Is (x, y) inside zone entity e? */
export const inZone = (e: Entity, x: number, y: number) => dist(e.x, e.y, x, y) <= e.r;
/** Zones of a behavior owned by player o containing (x, y). */
export const zoneAt = (s: State, b: string, o: number, x: number, y: number) => s.ents.some((e) => e.k === K.ZONE && e.b === b && e.o === o && inZone(e, x, y));

// ---------- arena collision ----------
/** Pushes a circle out of walls, cover and wall entities. Shots of `owner` pass that owner's OWN_PASS walls. */
export function collide(s: State, x: number, y: number, r: number, owner = -1): { x: number; y: number; nx: number; ny: number; hit: boolean; wall: Entity | null } {
  const a = ARENAS[s.cfg.arena];
  let nx = 0, ny = 0, hit = false, wall: Entity | null = null;
  if (x < r) { x = r; nx = 1; hit = true; } else if (x > a.w - r) { x = a.w - r; nx = -1; hit = true; }
  if (y < r) { y = r; ny = 1; hit = true; } else if (y > a.h - r) { y = a.h - r; ny = -1; hit = true; }
  const push = (x1: number, y1: number, x2: number, y2: number): boolean => {
    const cx = clamp(x, x1, x2), cy = clamp(y, y1, y2);
    const ddx = x - cx, ddy = y - cy;
    if (ddx * ddx + ddy * ddy >= r * r) return false;
    if (ddx === 0 && ddy === 0) {
      const pl = x - x1 + r, pr = x2 - x + r, pt = y - y1 + r, pb = y2 - y + r, m = Math.min(pl, pr, pt, pb);
      if (m === pl) { x = x1 - r; nx = -1; } else if (m === pr) { x = x2 + r; nx = 1; } else if (m === pt) { y = y1 - r; ny = -1; } else { y = y2 + r; ny = 1; }
      return true;
    }
    const d = dist(0, 0, ddx, ddy) || 1;
    x = cx + Math.trunc((ddx * r) / d); y = cy + Math.trunc((ddy * r) / d);
    if (Math.abs(ddx) >= Math.abs(ddy)) nx = ddx > 0 ? 1 : -1; else ny = ddy > 0 ? 1 : -1;
    return true;
  };
  for (const [x1, y1, x2, y2] of a.cover) if (push(x1, y1, x2, y2)) hit = true;
  for (const e of s.ents) {
    if (e.k !== K.WALL || (owner >= 0 && e.o === owner && e.tag & TAG.OWN_PASS)) continue;
    if (push(e.x - e.w, e.y - e.h, e.x + e.w, e.y + e.h)) { hit = true; wall = e; }
  }
  return { x, y, nx, ny, hit, wall };
}

// ---------- aiming ----------
/** Where skill/basic i aims: the manual angle if the player is aiming, else straight at the opponent. */
export function aimOf(s: State, i: number, inp: Input): number {
  const f = s.f[i], o = s.f[other(i)];
  return hasAim(inp) ? aimAngle(inp) : angleOf(o.x - f.x, o.y - f.y, f.face);
}
/** Target point for a "cast on a spot" skill, clamped to maxRange and the arena. */
export function spotOf(s: State, i: number, inp: Input, defRange: number, maxRange: number): { x: number; y: number } {
  const f = s.f[i], o = s.f[other(i)], a = ARENAS[s.cfg.arena];
  let tx: number, ty: number;
  if (hasAim(inp)) {
    const len = Math.min(aimDist(inp) || defRange, maxRange), ang = aimAngle(inp);
    tx = f.x + dx(ang, len); ty = f.y + dy(ang, len);
  } else {
    const d = dist(f.x, f.y, o.x, o.y);
    if (d <= maxRange) { tx = o.x; ty = o.y; } else { const ang = angleOf(o.x - f.x, o.y - f.y); tx = f.x + dx(ang, maxRange); ty = f.y + dy(ang, maxRange); }
  }
  return { x: clamp(tx, 300, a.w - 300), y: clamp(ty, 300, a.h - 300) };
}

// ---------- Motivation ----------
/** Spends Motivation. Going to exactly 0 starts Burnout. */
export function spendMot(s: State, i: number, amount: number) {
  const f = s.f[i];
  f.mot = Math.max(0, f.mot - amount);
  f.motIdle = 0;
  if (f.mot === 0 && f.burnout === 0) {
    f.burnout = C.BURNOUT_FRAMES;
    f.charging = 0; f.charge = 0;
    s.stats[i][ST.BURNOUTS]++;
    fx(s, FX.BURNOUT, f.x, f.y, 0, i);
  }
}
export const gainMot = (f: Fighter, n: number) => { if (f.burnout === 0) f.mot = Math.min(C.MOT_MAX, f.mot + n); };

// ---------- status effects ----------
/** Stun: can't move or act. Capped at 1.5 s, then 1 s of immunity to Stun and Root. */
export function stun(f: Fighter, frames: number) {
  if (f.st[S.CC_IMM] > 0) return false;
  f.st[S.STUN] = Math.max(f.st[S.STUN], Math.min(frames, C.HARD_CC_MAX));
  f.charging = 0; f.charge = 0; f.dash = 0; f.lunge = 0;
  return true;
}
/** Root: can't move, can still attack. Shares Stun's cap and immunity. */
export function root(f: Fighter, frames: number) {
  if (f.st[S.CC_IMM] > 0) return false;
  f.st[S.ROOT] = Math.max(f.st[S.ROOT], Math.min(frames, C.HARD_CC_MAX));
  return true;
}
/** Slow: the strongest one wins, max 40 %. */
export function slow(f: Fighter, p: number, frames: number) {
  if (p >= f.st[S.SLOW_PCT] || f.st[S.SLOW_T] === 0) f.st[S.SLOW_PCT] = Math.min(p, C.SLOW_MAX);
  f.st[S.SLOW_T] = Math.max(f.st[S.SLOW_T], frames);
}
export const silence = (f: Fighter, frames: number) => { f.st[S.SILENCE] = Math.max(f.st[S.SILENCE], Math.min(frames, C.SILENCE_MAX)); };
export const weak = (f: Fighter, frames: number) => { f.st[S.WEAK] = Math.max(f.st[S.WEAK], frames); };
export const speedBuff = (f: Fighter, p: number, frames: number) => { f.st[S.SPD_PCT] = Math.max(p, f.st[S.SPD_T] > 0 ? f.st[S.SPD_PCT] : 0); f.st[S.SPD_T] = Math.max(f.st[S.SPD_T], frames); };
/** Counts statuses down. When Stun or Root ends, immunity starts. */
export function tickStatus(f: Fighter) {
  const st = f.st;
  for (const k of [S.STUN, S.ROOT]) if (st[k] > 0 && --st[k] === 0 && st[S.STUN] === 0 && st[S.ROOT] === 0) st[S.CC_IMM] = C.CC_IMMUNE;
  for (const k of [S.CC_IMM, S.SILENCE, S.WEAK, S.WET, S.REFLECT]) if (st[k] > 0) st[k]--;
  if (st[S.SLOW_T] > 0 && --st[S.SLOW_T] === 0) st[S.SLOW_PCT] = 0;
  if (st[S.SPD_T] > 0 && --st[S.SPD_T] === 0) st[S.SPD_PCT] = 0;
}

// ---------- damage ----------
export interface HitOpts {
  basic?: boolean; full?: boolean;
  stun?: number; root?: number; hitstun?: number;
  slowPct?: number; slowT?: number; silence?: number; weak?: number;
  /** Push away along this angle (knockback) for KNOCK_FRAMES. */
  knockA?: number; knockSpeed?: number; knockFrames?: number;
  /** Pull the target to (px, py) over pullFrames. */
  pullX?: number; pullY?: number; pullFrames?: number;
  /** Cancels the target's charge (most hits do; armored charges ignore it). */
  interrupt?: boolean;
  /** Tap basics: a charging target keeps charging and doesn't flinch (taps can't stop a charge). */
  light?: boolean;
  /** Damage over time (Debt, rain, bites): no flinch, no reflect. */
  dot?: boolean;
  /** Always crit. */
  crit?: boolean;
  /** Melee (Mirror reflects half of it back). */
  melee?: boolean;
}
/** Applies a hit from fighter i to fighter j. Returns false if it missed (dash, leap, already KO). */
export function dealDamage(s: State, i: number, j: number, amount: number, o: HitOpts = {}): boolean {
  const a = s.f[i], t = s.f[j], ai = implOf(a);
  if (!targetable(t) || t.iframes > 0) return false;
  let dmg = amount;
  dmg = pct(dmg, ai.outPct?.(s, i, j) ?? 100);
  if (zoneAt(s, "na.loss", j, a.x, a.y)) dmg = pct(dmg, 70); // Packet Loss: enemies inside deal -30 %
  let crit = !!o.crit;
  if (!o.dot && a.st[S.CRIT_NEXT] > 0) { crit = true; a.st[S.CRIT_NEXT] = 0; }
  if (!o.dot && !crit && ai.crit?.(s, i, j)) crit = true;
  if (crit) dmg = pct(dmg, 150);
  if (t.st[S.WEAK] > 0) dmg = pct(dmg, 100 + C.WEAK_PCT);
  dmg = pct(dmg, implOf(t).dmgTakenPct ?? 100);
  if (t.st[S.SHIELD] > 0) {
    const ab = Math.min(t.st[S.SHIELD], dmg); t.st[S.SHIELD] -= ab; dmg -= ab;
    if (t.st[S.BUBBLE] > 0) t.st[S.ABSORBED] += ab;
  }
  t.hp = Math.max(0, t.hp - dmg);
  t.quiet = 0;
  if (!o.dot) t.flash = 6;
  if (o.basic) gainMot(a, C.MOT_ON_HIT);
  if (!o.dot) gainMot(t, C.MOT_ON_HURT);
  s.stats[i][ST.DMG] += dmg;
  if (!o.dot) {
    s.stats[i][ST.HITS]++;
    s.stats[i][ST.COMBO]++; s.stats[i][ST.MAX_COMBO] = Math.max(s.stats[i][ST.MAX_COMBO], s.stats[i][ST.COMBO]);
    s.stats[j][ST.COMBO] = 0;
    fx(s, FX.SPARK, (a.x + t.x) >> 1, (a.y + t.y) >> 1, o.full ? 2 : 1, i);
  }
  fx(s, crit ? FX.CRIT : FX.DMG, t.x, t.y, dmg, i);

  const armored = t.charging === 1 && (implOf(t).armoredCharge || o.light);
  if (!armored && !o.dot) {
    if (o.interrupt !== false) { t.charging = 0; t.charge = 0; }
    if (o.hitstun) t.hitstun = Math.max(t.hitstun, o.hitstun);
    if (o.knockA !== undefined) {
      const sp = o.knockSpeed ?? C.KNOCK_SPEED, n = o.knockFrames ?? C.KNOCK_FRAMES;
      t.kx = dx(o.knockA, sp); t.ky = dy(o.knockA, sp); t.kT = n; t.kSplat = o.full ? 1 : 0; t.kSplatDmg = 0; t.kSplatStun = 0;
      t.dash = 0; t.lunge = 0;
    }
  }
  if (o.pullX !== undefined && o.pullY !== undefined) {
    const n = o.pullFrames ?? 10;
    t.kx = Math.trunc((o.pullX - t.x) / n); t.ky = Math.trunc((o.pullY - t.y) / n); t.kT = n; t.kSplat = 0; t.dash = 0; t.lunge = 0;
  }
  if (o.stun) stun(t, o.stun);
  if (o.root) root(t, o.root);
  if (o.slowPct) slow(t, o.slowPct, o.slowT ?? 60);
  if (o.silence) silence(t, o.silence);
  if (o.weak) weak(t, o.weak);
  // Mirror: melee damage comes back to the attacker
  if (o.melee && t.st[S.REFLECT] > 0 && dmg > 0) dealDamage(s, j, i, dmg, { dot: true });
  if (!o.dot) ai.onLand?.(s, i, { basic: !!o.basic, full: !!o.full, x: t.x, y: t.y });
  // Overtime: the first clean hit wins the round
  if (s.ot && s.roundWinner < 0 && dmg > 0) s.roundWinner = i;
  return true;
}

// ---------- kit library: areas, cones, blinks, lunges ----------
/** Damages enemy pets and walls of the other team inside a circle. `breaks` destroys them outright. */
export function hitObjects(s: State, i: number, x: number, y: number, r: number, dmg: number, breaks = false) {
  for (const e of s.ents) {
    if (e.o === i || (e.k !== K.PET && e.k !== K.WALL && !(breaks && e.k === K.ZONE))) continue;
    const d = e.k === K.WALL ? dist(x, y, clamp(x, e.x - e.w, e.x + e.w), clamp(y, e.y - e.h, e.y + e.h)) : dist(x, y, e.x, e.y) - e.r;
    if (d > r) continue;
    if (breaks) { e.hp = 0; e.t = 0; } else e.hp -= dmg;
    if (e.hp <= 0) fx(s, FX.BREAK, e.x, e.y, 0, e.o);
  }
}
/** Area hit around (x, y): the opponent and enemy objects inside radius r. */
export function aoe(s: State, i: number, x: number, y: number, r: number, dmg: number, o: HitOpts = {}, breaks = false): boolean {
  const t = s.f[other(i)];
  hitObjects(s, i, x, y, r, dmg, breaks);
  fx(s, FX.BLAST, x, y, r, i);
  if (dist(x, y, t.x, t.y) > r + C.FIGHTER_R / 2) return false;
  return dealDamage(s, i, other(i), dmg, { interrupt: true, hitstun: 12, ...o });
}
/** Cone in front of fighter i: is the opponent inside? */
export function inCone(s: State, i: number, a: number, range: number, half: number): boolean {
  const f = s.f[i], t = s.f[other(i)];
  const d = dist(f.x, f.y, t.x, t.y);
  return targetable(t) && d <= range + C.FIGHTER_R / 2 && (d <= C.FIGHTER_R * 2 || angleDiff(angleOf(t.x - f.x, t.y - f.y, a), a) <= half);
}
/** Teleports fighter i toward (x, y), stopping at walls. Returns where it started. */
export function blink(s: State, i: number, x: number, y: number): { x: number; y: number } {
  const f = s.f[i], from = { x: f.x, y: f.y }, n = 8;
  for (let k = 1; k <= n; k++) {
    const c = collide(s, from.x + Math.trunc(((x - from.x) * k) / n), from.y + Math.trunc(((y - from.y) * k) / n), C.FIGHTER_R);
    f.x = c.x; f.y = c.y;
    if (c.hit) break;
  }
  return from;
}
/** Starts a dash attack: moves `speed` per frame for `frames`, hitting the opponent once. */
export function lunge(f: Fighter, a: number, frames: number, speed: number, dmg: number, stopOnHit: boolean) {
  f.lunge = frames; f.lungeA = a; f.lungeSp = speed; f.lungeDmg = dmg; f.lungeStop = stopOnHit ? 1 : 0; f.lungeHit = 0; f.face = a;
  f.charging = 0; f.charge = 0;
}

// ---------- kit library: spawners ----------
/** Shot from fighter i at angle a. dmg is what pets and walls take. */
export function shoot(s: State, i: number, b: string, a: number, speed: number, r: number, life: number, dmg: number, extra: Partial<Entity> = {}): Entity {
  const f = s.f[i];
  return spawn(s, { k: K.PROJ, b, o: i, x: f.x + dx(a, 480), y: f.y + dy(a, 480), vx: dx(a, speed), vy: dy(a, speed), r, t: life, dmg, a, ...extra });
}
/** Warning circle that goes off after `delay` frames (behavior's onExpire does the effect). */
export const delayed = (s: State, i: number, b: string, x: number, y: number, r: number, delay: number, extra: Partial<Entity> = {}) =>
  spawn(s, { k: K.DELAYED, b, o: i, x, y, r, t: delay, ...extra });
/** Floor zone with a timer (behavior's step runs every frame). */
export const zone = (s: State, i: number, b: string, x: number, y: number, r: number, life: number, extra: Partial<Entity> = {}) =>
  spawn(s, { k: K.ZONE, b, o: i, x, y, r, t: life, ...extra });
/** A wall `len` long and `thick` thick, centered `ahead` in front of fighter i, across the aim. */
export function wall(s: State, i: number, b: string, a: number, ahead: number, len: number, thick: number, life: number, hp: number, tag = 0): Entity {
  const f = s.f[i], cx = f.x + dx(a, ahead), cy = f.y + dy(a, ahead);
  const across = Math.abs(dx(a, 1000)) >= Math.abs(dy(a, 1000)); // aiming sideways: the wall runs up-down
  const w = across ? thick >> 1 : len >> 1, h = across ? len >> 1 : thick >> 1;
  return spawn(s, { k: K.WALL, b, o: i, x: cx, y: cy, r: Math.max(w, h), t: life, hp, w, h, tag });
}
export const pet = (s: State, i: number, b: string, x: number, y: number, r: number, life: number, hp: number, extra: Partial<Entity> = {}) =>
  spawn(s, { k: K.PET, b, o: i, x, y, r, t: life, hp, ...extra });
/** Pets of player i with behavior b (oldest first). */
export const petsOf = (s: State, i: number, b?: string) => s.ents.filter((e) => e.k === K.PET && e.o === i && (!b || e.b === b) && e.hp > 0);
/** Moves a pet toward the opponent, stopping at `stopAt`. Returns the distance to them. */
export function chase(s: State, e: Entity, speed: number, stopAt: number): number {
  const t = s.f[other(e.o)];
  const d = dist(e.x, e.y, t.x, t.y);
  if (d > stopAt && speed > 0) {
    const a = angleOf(t.x - e.x, t.y - e.y, 0);
    const c = collide(s, e.x + dx(a, speed), e.y + dy(a, speed), e.r);
    e.x = c.x; e.y = c.y; e.a = a;
  }
  return d;
}

/** Moves a shot and handles walls: wall entities take its damage. Returns true if it's gone. */
export function moveEntity(s: State, e: Entity): boolean {
  e.x += e.vx; e.y += e.vy;
  const c = collide(s, e.x, e.y, e.r, e.o);
  if (!c.hit) return false;
  e.x = c.x; e.y = c.y;
  if (c.wall) { c.wall.hp -= e.dmg; if (c.wall.hp <= 0) fx(s, FX.BREAK, c.wall.x, c.wall.y, 0, c.wall.o); }
  const b = BEH[e.b];
  return b?.onWall ? b.onWall(s, e, c.nx, c.ny) : true;
}
export const len = (vx: number, vy: number) => isqrt(vx * vx + vy * vy);
export { K };
