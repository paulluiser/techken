// Shared combat rules: collision, damage, status effects, Motivation, entities.
// Job files (jobs/*.ts) build their skills from these.
import * as C from "./constants";
import { ARENAS } from "./arenas";
import { KITS, type KitData } from "./data/kits.gen";
import { angleOf, clamp, dist, dx, dy } from "./fixed";
import { aimAngle, aimDist, hasAim, type Input } from "./input";
import { FX, K, S, ST, type Entity, type Fighter, type State } from "./types";

// ---------- job behavior registry ----------
export interface Behavior {
  /** Entity touched the opponent. Return true to remove the entity. */
  onHit?(s: State, e: Entity, target: number): boolean;
  /** Entity touched a wall or cover. nx/ny is the surface normal (-1, 0, 1). Return true to remove it. */
  onWall?(s: State, e: Entity, nx: number, ny: number): boolean;
  /** Delayed area went off, or a projectile ran out of time. */
  onExpire?(s: State, e: Entity): void;
}
export interface JobImpl {
  /** Melee reach, center to center (units), and half-width of the swing arc (0-32 angle steps). */
  range: number; arc: number;
  /** Database Admin: charging can't be interrupted. */
  armoredCharge?: boolean;
  /** Damage taken, in percent (Heavy = 90). */
  dmgTakenPct?: number;
  /** The three skills. Called after the cost is paid. */
  skills: [(s: State, i: number, inp: Input) => void, (s: State, i: number, inp: Input) => void, (s: State, i: number, inp: Input) => void];
  /** Called once per frame for each fighter of this job. */
  tick?(s: State, i: number): void;
  /** The fighter landed a hit (any source). */
  onLand?(s: State, i: number): void;
  /** A leap (Fighter.air) just ended. */
  onAirEnd?(s: State, i: number): void;
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

// ---------- helpers ----------
export const other = (i: number) => 1 - i;
/** xorshift32 on the state's seed. Returns 0..n-1. */
export function rand(s: State, n: number): number {
  let x = s.rng | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  s.rng = x >>> 0;
  return s.rng % n;
}
export function fx(s: State, k: number, x: number, y: number, v = 0, o = 0) {
  s.fx.push({ fr: s.frame, k, x, y, v, o });
  if (s.fx.length > 48) s.fx.splice(0, s.fx.length - 48);
}
export function spawn(s: State, e: Omit<Entity, "id" | "n" | "hitCd" | "t0"> & Partial<Pick<Entity, "n" | "hitCd">>): Entity {
  const ent: Entity = { n: 0, hitCd: 0, ...e, id: s.nextId++, t0: e.t };
  s.ents.push(ent);
  return ent;
}
export const targetable = (f: Fighter) => f.air === 0 && f.hp > 0;
export const canAct = (f: Fighter) =>
  f.hp > 0 && f.st[S.STUN] === 0 && f.hitstun === 0 && f.burnout === 0 && f.cast === 0 && f.recovery === 0 && f.air === 0 && f.dash === 0 && f.kT === 0;

// ---------- arena collision ----------
/** Pushes a circle out of walls and cover. Returns the corrected position and the last surface normal hit. */
export function collide(s: State, x: number, y: number, r: number): { x: number; y: number; nx: number; ny: number; hit: boolean } {
  const a = ARENAS[s.cfg.arena];
  let nx = 0, ny = 0, hit = false;
  if (x < r) { x = r; nx = 1; hit = true; } else if (x > a.w - r) { x = a.w - r; nx = -1; hit = true; }
  if (y < r) { y = r; ny = 1; hit = true; } else if (y > a.h - r) { y = a.h - r; ny = -1; hit = true; }
  for (const [x1, y1, x2, y2] of a.cover) {
    const cx = clamp(x, x1, x2), cy = clamp(y, y1, y2);
    const ddx = x - cx, ddy = y - cy;
    if (ddx * ddx + ddy * ddy >= r * r) continue;
    hit = true;
    if (ddx === 0 && ddy === 0) {
      // center inside the block: push out along the shortest axis
      const pl = x - x1 + r, pr = x2 - x + r, pt = y - y1 + r, pb = y2 - y + r, m = Math.min(pl, pr, pt, pb);
      if (m === pl) { x = x1 - r; nx = -1; } else if (m === pr) { x = x2 + r; nx = 1; } else if (m === pt) { y = y1 - r; ny = -1; } else { y = y2 + r; ny = 1; }
      continue;
    }
    const d = dist(0, 0, ddx, ddy) || 1;
    x = cx + Math.trunc((ddx * r) / d);
    y = cy + Math.trunc((ddy * r) / d);
    if (Math.abs(ddx) >= Math.abs(ddy)) nx = ddx > 0 ? 1 : -1; else ny = ddy > 0 ? 1 : -1;
  }
  return { x, y, nx, ny, hit };
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
  f.charging = 0; f.charge = 0; f.dash = 0;
  return true;
}
/** Root: can't move, can still attack. Shares Stun's cap and immunity. */
export function root(f: Fighter, frames: number) {
  if (f.st[S.CC_IMM] > 0) return false;
  f.st[S.ROOT] = Math.max(f.st[S.ROOT], Math.min(frames, C.HARD_CC_MAX));
  return true;
}
export function slow(f: Fighter, pct: number, frames: number) {
  if (pct >= f.st[S.SLOW_PCT] || f.st[S.SLOW_T] === 0) f.st[S.SLOW_PCT] = Math.min(pct, C.SLOW_MAX);
  f.st[S.SLOW_T] = Math.max(f.st[S.SLOW_T], frames);
}
/** Counts statuses down. When Stun or Root ends, immunity starts. */
export function tickStatus(f: Fighter) {
  const st = f.st;
  for (const k of [S.STUN, S.ROOT]) if (st[k] > 0 && --st[k] === 0 && st[S.STUN] === 0 && st[S.ROOT] === 0) st[S.CC_IMM] = C.CC_IMMUNE;
  for (const k of [S.CC_IMM, S.SILENCE, S.WEAK]) if (st[k] > 0) st[k]--;
  if (st[S.SLOW_T] > 0 && --st[S.SLOW_T] === 0) st[S.SLOW_PCT] = 0;
}

// ---------- damage ----------
export interface HitOpts {
  basic?: boolean; full?: boolean;
  stun?: number; root?: number; hitstun?: number;
  /** Push away along this angle (knockback) for KNOCK_FRAMES. */
  knockA?: number; knockSpeed?: number; knockFrames?: number;
  /** Pull the target to (px, py) over pullFrames. */
  pullX?: number; pullY?: number; pullFrames?: number;
  /** Cancels the target's charge (most hits do; armored charges ignore it). */
  interrupt?: boolean;
  /** Tap basics: a charging target keeps charging and doesn't flinch (taps can't stop a charge). */
  light?: boolean;
}
/** Applies a hit from fighter i to fighter j. Returns false if it missed (dash, leap, already KO). */
export function dealDamage(s: State, i: number, j: number, amount: number, o: HitOpts = {}): boolean {
  const a = s.f[i], t = s.f[j];
  if (!targetable(t) || t.iframes > 0) return false;
  let dmg = amount;
  if (t.st[S.WEAK] > 0) dmg = Math.trunc((dmg * (100 + C.WEAK_PCT)) / 100);
  dmg = Math.trunc((dmg * (implOf(t).dmgTakenPct ?? 100)) / 100);
  if (t.st[S.SHIELD] > 0) { const ab = Math.min(t.st[S.SHIELD], dmg); t.st[S.SHIELD] -= ab; dmg -= ab; }
  t.hp = Math.max(0, t.hp - dmg);
  t.flash = 6;
  if (o.basic) gainMot(a, C.MOT_ON_HIT);
  gainMot(t, C.MOT_ON_HURT);
  s.stats[i][ST.DMG] += dmg; s.stats[i][ST.HITS]++;
  s.stats[i][ST.COMBO]++; s.stats[i][ST.MAX_COMBO] = Math.max(s.stats[i][ST.MAX_COMBO], s.stats[i][ST.COMBO]);
  s.stats[j][ST.COMBO] = 0;
  fx(s, FX.DMG, t.x, t.y, dmg, i);
  fx(s, FX.SPARK, (a.x + t.x) >> 1, (a.y + t.y) >> 1, o.full ? 2 : 1, i);

  const armored = t.charging === 1 && (implOf(t).armoredCharge || o.light);
  if (!armored) {
    if (o.interrupt !== false) { t.charging = 0; t.charge = 0; }
    if (o.hitstun) t.hitstun = Math.max(t.hitstun, o.hitstun);
    if (o.knockA !== undefined) {
      const sp = o.knockSpeed ?? C.KNOCK_SPEED, n = o.knockFrames ?? C.KNOCK_FRAMES;
      t.kx = dx(o.knockA, sp); t.ky = dy(o.knockA, sp); t.kT = n; t.kSplat = o.full ? 1 : 0;
      t.dash = 0;
    }
  }
  if (o.pullX !== undefined && o.pullY !== undefined) {
    const n = o.pullFrames ?? 10;
    t.kx = Math.trunc((o.pullX - t.x) / n); t.ky = Math.trunc((o.pullY - t.y) / n); t.kT = n; t.kSplat = 0; t.dash = 0;
  }
  if (o.stun) stun(t, o.stun);
  if (o.root) root(t, o.root);
  implOf(a).onLand?.(s, i);
  // Overtime: the first clean hit wins the round
  if (s.ot && s.roundWinner < 0 && dmg > 0) s.roundWinner = i;
  return true;
}

/** Projectile kinds share this. Moves an entity and bounces/removes it on walls. */
export function moveEntity(s: State, e: Entity): boolean {
  e.x += e.vx; e.y += e.vy;
  const c = collide(s, e.x, e.y, e.r);
  if (!c.hit) return false;
  e.x = c.x; e.y = c.y;
  const b = BEH[e.b];
  return b?.onWall ? b.onWall(s, e, c.nx, c.ny) : true;
}
export { K };
