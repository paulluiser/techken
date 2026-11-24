// CPU opponents for the top-down fighter (GAME_DESIGN.md 6.1). The CPU only produces inputs,
// exactly like a player, so it can't cheat and the sim stays deterministic.
// Its own randomness lives in CpuMem (outside the sim state).
import * as C from "../sim/constants";
import { IMPL } from "../sim/core";
import { KITS } from "../sim/data/kits.gen";
import { angleOf, dist, wrapA } from "../sim/fixed";
import { IN_ATTACK, IN_DASH, IN_SKILLS, packInput } from "../sim/input";
import { PHASE_FIGHT, type State } from "../sim/sim";
import { K, S } from "../sim/types";

export interface Level { name: string; react: number; dodge: number; fullCharge: number; skill: number; reserve: number }
export const LEVELS: Level[] = [
  { name: "Intern", react: 34, dodge: 0.05, fullCharge: 0.15, skill: 0.25, reserve: 0 },
  { name: "Junior", react: 24, dodge: 0.2, fullCharge: 0.4, skill: 0.45, reserve: 0 },
  { name: "Mid-level", react: 16, dodge: 0.45, fullCharge: 0.7, skill: 0.65, reserve: 2000 },
  { name: "Senior", react: 11, dodge: 0.7, fullCharge: 0.85, skill: 0.8, reserve: 2500 },
  { name: "Principal", react: 8, dodge: 0.85, fullCharge: 0.95, skill: 0.92, reserve: 3000 },
];


export interface CpuMem {
  rng: number; wait: number; move: number; want: number; // want: charge frames to reach before releasing
  threats: number[]; stuck: number; lastX: number; lastY: number; detour: number; detourA: number; strafe: number;
  /** Frames spent at a standoff; when patience runs out the CPU commits. */
  standoff: number; commit: number; lastHp: number;
}
export const newCpu = (seed: number): CpuMem => ({ rng: (seed >>> 0) || 1, wait: 0, move: -1, want: 0, threats: [], stuck: 0, lastX: 0, lastY: 0, detour: 0, detourA: 0, strafe: 1, standoff: 0, commit: 0, lastHp: 0 });
function r01(m: CpuMem) { m.rng = (Math.imul(m.rng, 1664525) + 1013904223) >>> 0; return m.rng / 4294967296; }
const dir16 = (a: number) => (Math.round(wrapA(a) / 4) & 15);

/** One frame of CPU input for fighter i at difficulty 1-5. */
export function cpuInput(s: State, i: number, level: number, m: CpuMem): number {
  if (s.phase !== PHASE_FIGHT) return 0;
  const L = LEVELS[Math.max(1, Math.min(5, level)) - 1];
  const me = s.f[i], op = s.f[1 - i], kit = KITS[me.job], impl = IMPL[me.job];
  if (!impl || me.hp <= 0) return 0;
  const d = dist(me.x, me.y, op.x, op.y), toOp = angleOf(op.x - me.x, op.y - me.y, me.face);
  const T = C.TILE;
  let buttons = 0, move = -1;

  // 1. threats: incoming shots, delayed areas under us, a leap landing on us
  let threatA = -1, threatId = 0;
  for (const e of s.ents) {
    if (e.o === i) continue;
    if (e.t0 - e.t < L.react) continue; // the CPU needs its reaction time to notice a new shot or warning
    if (e.k === K.PROJ) {
      const rx = me.x - e.x, ry = me.y - e.y, closing = rx * e.vx + ry * e.vy;
      if (closing <= 0 || dist(0, 0, rx, ry) > 4 * T) continue;
      const cross = Math.abs(rx * e.vy - ry * e.vx) / (dist(0, 0, e.vx, e.vy) || 1);
      if (cross < e.r + C.FIGHTER_R + 250) { threatA = angleOf(e.vx, e.vy) + (r01(m) < 0.5 ? 16 : -16); threatId = e.id; }
    } else if (e.k === K.DELAYED && dist(me.x, me.y, e.x, e.y) < e.r + C.FIGHTER_R) {
      threatA = angleOf(me.x - e.x, me.y - e.y, toOp + 32); threatId = e.id;
    } else if (e.k === K.RING && e.n === 0 && Math.abs(dist(me.x, me.y, e.x, e.y) - e.r) < 700 && !e.hitCd) {
      threatA = toOp + 16; threatId = e.id; // a ring is about to pass: dash through it
    } else if (e.k === K.ZONE && threatA < 0 && dist(me.x, me.y, e.x, e.y) < e.r + C.FIGHTER_R) {
      threatA = angleOf(me.x - e.x, me.y - e.y, toOp + 32); // walk out of enemy zones
    }
  }
  if (op.air > 0 && dist(me.x, me.y, op.ax1, op.ay1) < 2200) { threatA = angleOf(me.x - op.ax1, me.y - op.ay1, toOp + 32); threatId = -op.air0 - s.round * 1000; }
  if (threatId && !m.threats.includes(threatId)) {
    m.threats.push(threatId); if (m.threats.length > 8) m.threats.shift();
    if (r01(m) < L.dodge && me.dashN > 0 && me.mot > C.DASH_COST + 500) return packInput(IN_DASH, dir16(threatA));
  }
  if (threatA >= 0 && L.dodge > 0.3) move = threatA;

  // 2. skills, checked at reaction speed
  const free = me.recovery === 0 && me.cast === 0 && me.hitstun === 0 && me.burnout === 0 && me.st[S.STUN] === 0 && me.lunge === 0;
  if (--m.wait <= 0 && free) {
    m.wait = L.react + Math.floor(r01(m) * L.react);
    const ranges = impl.ai;
    const punish = op.st[S.STUN] > 0 || op.burnout > 0;
    for (let k = 2; k >= 0; k--) {
      const [lo, hi] = ranges[k];
      if (me.cd[k] > 0 || d < lo * T || d > hi * T || me.charging) continue;
      if (me.mot < kit.skills[k].cost + (punish ? 0 : L.reserve)) continue;
      if (impl.aiWhen && !impl.aiWhen(s, i, k)) continue;
      if (r01(m) < L.skill) return packInput(IN_SKILLS[k], dir16(toOp));
    }
    m.want = r01(m) < L.fullCharge || op.burnout > 0 || op.st[S.STUN] > 0 ? kit.charge : Math.floor(kit.charge * 0.2);
    m.strafe = r01(m) < 0.5 ? 1 : -1;
  }

  // 2b. an enemy pet nearby and the opponent far: swat the pet first
  let petA = -1;
  if (!kit.ranged || d > 5500) {
    let best = 2600;
    for (const e of s.ents) if (e.k === K.PET && e.o !== i && e.hp > 0) { const pd = dist(me.x, me.y, e.x, e.y); if (pd < best && d > 3000) { best = pd; petA = angleOf(e.x - me.x, e.y - me.y); } }
  }
  if (petA >= 0 && L.dodge > 0.15) {
    if (me.charging && me.charge >= Math.min(m.want, kit.charge >> 1)) return packInput(0, dir16(petA), petA);
    return packInput(me.recovery === 0 ? IN_ATTACK : 0, dir16(petA), petA);
  }

  // 3. basic attack: charge while closing in, release in range
  const reach = kit.ranged ? 5200 : impl.range + C.FIGHTER_R / 2 - 150;
  const opImpl = IMPL[op.job], opKit = KITS[op.job];
  const opReach = opKit.ranged ? 0 : (opImpl?.range ?? 1500) + C.FIGHTER_R / 2; // ranged charges aren't a "step back" threat
  const opOpen = op.recovery > 0 || op.burnout > 0 || op.st[S.STUN] > 0 || op.cast > 0; // a free hit
  // patience: a long standoff (nobody getting hit) makes the CPU commit for a while
  const hpSum = me.hp + op.hp;
  if (hpSum !== m.lastHp) { m.lastHp = hpSum; m.standoff = 0; } else if (++m.standoff > 40 + L.react * 2) { m.standoff = 0; m.commit = 100; }
  if (m.commit > 0) m.commit--;
  const danger = op.charging === 1 && d < opReach + 700 && !opOpen && (m.commit === 0 || op.charge * 2 >= KITS[op.job].charge);
  const ready = me.charging && me.charge >= m.want && d <= reach;
  const openFor = Math.max(op.recovery, op.st[S.STUN], op.burnout, op.cast, op.hitstun);
  const toFull = kit.charge - me.charge;
  if (opOpen && me.charging && d <= reach && me.charge * 2 >= kit.charge && (openFor < toFull + 2 || L.fullCharge < 0.5)) buttons = 0; // punish now
  else if (opOpen && me.charging) buttons = IN_ATTACK; // the opening lasts long enough: finish the charge
  else if (me.charging) buttons = ready ? 0 : IN_ATTACK;
  else if (me.recovery === 0 && me.burnout === 0 && d < reach + 3 * T) buttons |= IN_ATTACK;

  // a big charge is about to land: smart CPUs dash out of it
  if (danger && op.charge >= opKit.charge - 8 && d < opReach + 200 && L.dodge > 0.3 && me.dashN > 0 && me.mot > C.DASH_COST + 500 && !ready) {
    const id = -(s.frame - op.charge) - 7; // one roll per opponent charge
    if (!m.threats.includes(id)) { m.threats.push(id); if (r01(m) < L.dodge) return packInput(IN_DASH, dir16(toOp + 32 + 8 * m.strafe)); }
  }

  // 4. movement: close the distance, keep out of a charging opponent's reach, strafe, detour around cover
  if (move < 0) {
    if (me.burnout > 0) move = toOp + 32; // back off while burnt out
    else if (kit.ranged && m.commit === 0 && d < 3200 && !opOpen) move = toOp + 32 + 10 * m.strafe; // ranged: keep the distance
    else if (impl.aiKeep && m.commit === 0 && d < impl.aiKeep * T && !opOpen && me.cd.some((c) => c === 0)) move = toOp + 32 + 10 * m.strafe; // artillery: back off while skills are ready
    else if (kit.ranged && d < 5200 && d > 3000) move = toOp + 16 * m.strafe; // ranged: strafe at range
    else if (danger && !ready && L.dodge > 0.15) move = toOp + 32 + 6 * m.strafe; // step back, wait for the whiff
    else if (opOpen || d > reach - 200) move = toOp;
    else if (m.commit === 0 && L.dodge > 0.3 && reach > opReach + 100 && d < opReach + 150) move = toOp + 32; // keep them at the edge of our longer reach
    else if (L.dodge > 0.3) move = toOp + 16 * m.strafe;
  }
  if (m.detour > 0) { m.detour--; move = m.detourA; }
  else if (move >= 0 && dist(me.x, me.y, m.lastX, m.lastY) < 15) {
    if (++m.stuck > 12) { m.stuck = 0; m.detour = 24; m.detourA = toOp + (r01(m) < 0.5 ? 16 : -16); }
  } else m.stuck = 0;
  m.lastX = me.x; m.lastY = me.y;
  return packInput(buttons, move >= 0 ? dir16(move) : -1);
}
