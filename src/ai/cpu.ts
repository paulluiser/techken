// CPU opponents (GDD 6.1). The CPU only reads the visible game state, never your inputs.
// Difficulty = reaction time + decision quality. Its randomness is its own seeded RNG, so
// CPU-vs-CPU balance runs are reproducible.
import * as C from "../sim/constants";
import { chargeFull, jobOf, setOf } from "../sim/core";
import { IN_ATTACK, IN_DASH, IN_DOWN, IN_GUARD, IN_LEFT, IN_RIGHT, IN_SKILLS, IN_UP } from "../sim/input";
import { PHASE_FIGHT, type State } from "../sim/sim";
import { K, S } from "../sim/types";

export interface Level {
  name: string;
  react: number; // frames between decisions
  guard: number; // chance to guard a visible threat
  full: number; // chance to go for a full charge
  skill: number; // chance to use a ready skill when it fits
  dodge: number; // chance to dash away from a full charge
  smart: boolean; // manages Motivation, picks skills by range, goes for items
  punish: boolean; // rushes in on Burnout and whiffed full charges
  crunch: boolean; // Crunch Casts for the KO
}
export const LEVELS: Level[] = [
  { name: "Intern", react: 36, guard: 0.05, full: 0.1, skill: 0.15, dodge: 0, smart: false, punish: false, crunch: false },
  { name: "Junior", react: 24, guard: 0.2, full: 0.35, skill: 0.35, dodge: 0, smart: false, punish: false, crunch: false },
  { name: "Mid-level", react: 17, guard: 0.45, full: 0.6, skill: 0.5, dodge: 0.2, smart: true, punish: false, crunch: false },
  { name: "Senior", react: 12, guard: 0.65, full: 0.75, skill: 0.6, dodge: 0.5, smart: true, punish: true, crunch: false },
  { name: "Principal", react: 9, guard: 0.8, full: 0.85, skill: 0.7, dodge: 0.7, smart: true, punish: true, crunch: true },
];

type Tag = "close" | "mid" | "far" | "any" | "heal" | "threat";
interface Play { range: number; sets: [Tag[], Tag[]] }
// preferred fighting distance (px) and when each skill makes sense
const PLAY: Record<string, Play> = {
  se: { range: 30, sets: [["close", "close", "mid"], ["mid", "threat", "heal"]] },
  md: { range: 30, sets: [["close", "close", "close"], ["mid", "heal", "any"]] },
  qa: { range: 32, sets: [["mid", "mid", "any"], ["mid", "any", "any"]] },
  sa: { range: 40, sets: [["mid", "close", "any"], ["close", "any", "mid"]] },
  na: { range: 130, sets: [["far", "mid", "any"], ["mid", "mid", "close"]] },
  db: { range: 26, sets: [["mid", "close", "heal"], ["close", "close", "any"]] },
  do: { range: 30, sets: [["close", "mid", "any"], ["any", "heal", "threat"]] },
  ce: { range: 110, sets: [["any", "any", "any"], ["any", "any", "any"]] },
  ts: { range: 100, sets: [["any", "any", "mid"], ["any", "any", "any"]] },
  cs: { range: 26, sets: [["threat", "threat", "any"], ["any", "threat", "any"]] },
  ds: { range: 110, sets: [["far", "any", "any"], ["any", "any", "close"]] },
  ai: { range: 100, sets: [["any", "any", "any"], ["any", "any", "any"]] },
  ba: { range: 30, sets: [["mid", "mid", "any"], ["mid", "any", "any"]] },
  pm: { range: 40, sets: [["mid", "close", "mid"], ["any", "any", "any"]] },
  ux: { range: 34, sets: [["any", "close", "close"], ["mid", "any", "any"]] },
  tw: { range: 110, sets: [["mid", "mid", "close"], ["close", "mid", "any"]] },
  vc: { range: 100, sets: [["far", "close", "any"], ["far", "close", "any"]] },
};

export interface CpuMem { rng: number; until: number; plan: number; tap: number; hold: number; guardFor: number; shotGuardAt: number }
export const newCpu = (seed: number): CpuMem => ({ rng: (seed >>> 0) || 7, until: 0, plan: 0, tap: 0, hold: 0, guardFor: 0, shotGuardAt: -999 });
function rand(m: CpuMem): number { m.rng = (Math.imul(m.rng, 1664525) + 1013904223) >>> 0; return (m.rng >>> 8) / 16777216; }

/** One frame of CPU input for player `me`. */
export function cpuInput(s: State, me: 0 | 1, level: number, m: CpuMem): number {
  if (s.phase !== PHASE_FIGHT) return 0;
  const L = LEVELS[Math.max(1, Math.min(5, level)) - 1];
  if (s.frame >= m.until) decide(s, me, L, m);
  let b = m.plan | m.tap;
  m.tap = 0;
  if (m.hold > 0) { b |= IN_ATTACK; m.hold--; } else b &= ~IN_ATTACK;
  if (m.guardFor > 0) { b = IN_GUARD; m.guardFor--; }
  return b;
}

function decide(s: State, me: 0 | 1, L: Level, m: CpuMem) {
  const f = s.f[me], o = s.f[1 - me], job = jobOf(f), set = setOf(f);
  const pb = PLAY[job.id] ?? { range: 40, sets: [["any", "any", "any"], ["any", "any", "any"]] };
  m.until = s.frame + L.react + Math.floor(rand(m) * (L.react >> 1));
  const P = (n: number) => Math.trunc(n / C.SUB);
  const dx = P(o.x - f.x), adx = Math.abs(dx), dy = P(o.y - f.y);
  const toward = dx >= 0 ? IN_RIGHT : IN_LEFT, away = dx >= 0 ? IN_LEFT : IN_RIGHT;
  let plan = 0;

  if (f.st[S.STUN] > 0 || f.hitstun > 0) { m.plan = 0; m.hold = 0; return; }
  if (f.charging && m.hold > 0) { m.plan = adx > pb.range ? toward : 0; return; } // keep charging

  // 1. threats: guard or dash away from a big hit
  const ocf = chargeFull(s, 1 - me);
  const threat = (o.charging && o.charge >= (ocf * 7) / 10) || (o.atk > 0 && o.atk <= C.ATK_STARTUP + 2);
  const bigHit = (o.charging && o.charge >= (ocf * 8) / 10) || (o.atk > 0 && o.atkCharge >= ocf); // would break guard
  if (threat && adx < 60 && Math.abs(dy) < 40) {
    if (bigHit) {
      if (rand(m) < L.dodge) {
        if (f.dashCd === 0 && f.mot > 2500) { m.plan = 0; m.tap = IN_DASH | away; return; }
        if (f.onGround) { m.plan = away; m.tap = IN_UP; return; }
      }
      // smart CPUs interrupt a slow charge with a quick tap instead of eating it
      if (L.smart && o.charging && adx <= job.reach + 6 && f.atk === 0 && f.recovery === 0) { m.hold = 1; m.plan = 0; return; }
    } else if (rand(m) < L.guard) { m.guardFor = 12 + Math.floor(rand(m) * 8); m.plan = 0; return; }
  }
  // 2a. incoming shots: guard them (or hop) instead of eating them
  for (const e of s.ents) {
    if (e.o === me || e.k !== K.PROJ) continue;
    const ex = P(e.x - f.x), ey = P(f.y - e.y);
    if (Math.abs(ex) < 70 && ey > 4 && ey < 40 && Math.sign(e.vx) === -Math.sign(ex)) {
      // smart CPUs dash through shots toward a ranged opponent (dashes are invincible)
      if (L.smart && f.dashCd === 0 && f.mot > 3000 && adx > 60 && rand(m) < 0.5) { m.plan = toward; m.tap = IN_DASH | toward; return; }
      if (s.frame - m.shotGuardAt > 40 && rand(m) < L.guard) { m.shotGuardAt = s.frame; m.guardFor = 10; m.plan = 0; return; }
      if (L.smart && f.onGround && rand(m) < 0.5) { m.tap |= IN_UP; break; }
    }
  }
  // 2b. jump over ground waves / stampedes coming at us
  if (L.punish && f.onGround) {
    for (const e of s.ents) {
      if (e.o === me || (e.k !== K.PROJ && e.b !== "ts.mob")) continue;
      const ex = P(e.x - f.x), low = P(f.y - e.y) < 18;
      if (low && Math.abs(ex) < 50 && Math.sign(e.vx) === -Math.sign(ex)) { m.tap |= IN_UP; break; }
    }
  }

  // 3. where to stand
  let want = pb.range;
  const punishing = L.punish && (o.burnout > 0 || (o.recovery > 8 && adx < 70));
  if (punishing) want = Math.min(want, job.reach + 4);
  let itemX = -1;
  if (L.smart && s.items.length && adx > 50) {
    for (const it of s.items) { const ix = P(it.x - f.x); if (Math.abs(ix) < 120 && Math.abs(P(it.y - f.y)) < 30) itemX = ix; }
  }
  if (itemX !== -1) plan |= itemX > 0 ? IN_RIGHT : IN_LEFT;
  else if (adx > want + 10) plan |= toward;
  else if (job.ranged && adx < want - 40 && rand(m) < 0.6) plan |= away;
  // follow vertically
  if (f.onGround && dy < -30 && rand(m) < 0.35) m.tap |= IN_UP;
  else if (f.onGround && dy > 24 && f.y < (184 << 8) && rand(m) < 0.4) m.tap |= IN_DOWN;
  else if (!L.smart && rand(m) < 0.05) m.tap |= IN_UP;

  // 4. skills
  const lethal = L.crunch && o.hp < 90;
  if (rand(m) < L.skill && f.burnout === 0 && f.st[S.SILENCE] === 0) {
    const tags = pb.sets[f.set] ?? [];
    for (let k = 0; k < set.skills.length; k++) {
      const sk = set.skills[k];
      if (f.cd[k] > 0) continue;
      if (L.smart && f.mot < sk.cost + 1500 && !lethal) continue;
      const tag = L.smart ? tags[k] ?? "any" : "any";
      const fits = tag === "any" || (tag === "close" && adx <= 50) || (tag === "mid" && adx <= 150) || (tag === "far" && adx <= 260) ||
        (tag === "heal" && f.hp < 700) || (tag === "threat" && threat && adx < 70);
      if (fits && rand(m) < 0.7) { m.tap |= IN_SKILLS[k]; break; }
    }
  }

  // 4b. clear enemy summons in reach (basics hit them)
  if (!m.tap && f.atk === 0 && f.recovery === 0 && !job.ranged) {
    for (const e of s.ents) {
      if (e.o === me || e.o > 1 || (e.k !== K.SUMMON && e.k !== K.ANCHOR && e.k !== K.WALL)) continue;
      const ex = P(e.x - f.x);
      if (Math.abs(ex) <= job.reach + 6 && Math.sign(ex) === f.facing && Math.abs(P(e.y - f.y)) < 30) { m.hold = 1 + Math.floor(rand(m) * 6); m.plan = plan; return; }
    }
  }
  // 5. basic attack: start a charge when in range
  const reach = job.ranged ? Math.max(pb.range + 40, 90) : job.reach + 8;
  if (!m.tap && adx <= reach && Math.abs(dy) < 30 && f.burnout === 0 && f.atk === 0 && f.recovery === 0) {
    const cf = chargeFull(s, me);
    // full charges only when they pay off: guard break, punish, or from a safe distance
    const open = o.guarding || o.st[S.STUN] > 0 || o.recovery > 10 || o.burnout > 0 || o.hitstun > 6 || (job.ranged && adx > 60);
    const full = L.smart ? (open && rand(m) < L.full) || punishing : rand(m) < L.full;
    m.hold = full ? cf + 1 : 1 + Math.floor(rand(m) * Math.max(2, cf >> 3));
    if (L.smart && o.hitstun > 0) m.until = s.frame + 4; // keep the pressure on
    plan &= ~(IN_LEFT | IN_RIGHT);
    if (adx > job.reach && !job.ranged) plan |= toward;
  }
  m.plan = plan;
}
