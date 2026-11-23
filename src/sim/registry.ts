// Job and behavior registries. Job files register themselves at import time
// (see jobs/all.ts). Indexes are fixed by the job's `idx`, never by import order,
// so both peers always agree.
import type { Entity, State } from "./types";

export interface Hit {
  kind: "basic" | "skill" | "summon" | "dot" | "env" | "mirror" | "counter";
  melee?: boolean;
  proj?: boolean;
  full?: boolean; // full-charge basic (breaks guard)
  crit?: boolean;
  noGuard?: boolean;
  hitstun?: number;
  kbx?: number; // signed sub-px/frame
  kby?: number;
  unreflectable?: boolean;
}

export interface SkillDef {
  name: string;
  cost: number; // Motivation (hundredths)
  tok?: number; // Vibe Coder tokens (hundredths)
  cd: number; // frames
  desc: string;
  aim?: boolean; // "anywhere" skill: tap = smart cast on them, hold = aim with left/right
  /** Perform the skill. `pow` is a permille power multiplier (1000 = normal). */
  cast: (s: State, i: number, pow: number) => boolean;
}

export interface SetDef {
  name: string;
  passive: string;
  passiveDesc: string;
  combo: string;
  skills: SkillDef[];
  init?(s: State, i: number): void;
  tick?(s: State, i: number): void;
  onDealt?(s: State, i: number, t: number, dmg: number, h: Hit): void;
  onTaken?(s: State, i: number, a: number, dmg: number, h: Hit): void;
  modOut?(s: State, i: number, t: number, h: Hit): number; // permille
  modIn?(s: State, i: number, a: number, h: Hit): number; // permille
  onLethal?(s: State, i: number): boolean; // true = survived
  onCC?(s: State, i: number, frames: number): number; // adjust incoming CC
  chargeMul?(s: State, i: number): number; // permille of charge time
  canCast?(s: State, i: number, k: number): boolean;
  afterCast?(s: State, i: number, k: number): void;
  onEnemyCast?(s: State, i: number, k: number): void;
  cdMul?(s: State, i: number): number; // permille of cooldowns
}

export interface JobDef {
  idx: number;
  id: string;
  name: string;
  color: number;
  walk: number; // sub-px/frame
  jumps: number; // 1 = single, 2 = double, 3 = triple
  chargeFull: number; // frames
  tap: number;
  full: number;
  reach: number; // px
  weight: number; // 1 (floaty) .. 5 (heavy)
  guard?: number; // permille blocked
  ranged?: { speed: number; life: number }; // basic attack is a projectile
  superArmor?: boolean; // full charge can't be interrupted
  glide?: boolean;
  dashCd?: number;
  sets: [SetDef, SetDef];
}

export const JOBS: (JobDef | undefined)[] = new Array(17).fill(undefined);
export function registerJob(j: JobDef) { JOBS[j.idx] = j; }

export type Behavior = (s: State, e: Entity) => boolean; // false = remove
export const BEH: Record<string, Behavior> = {};
export function registerBeh(id: string, fn: Behavior) { BEH[id] = fn; }

/** Names for all 17 jobs (the pick screen shows ones not implemented yet as "coming soon"). */
export const JOB_NAMES = [
  "Software Engineer", "Mobile Developer", "QA Analyst", "System Analyst", "Network Admin",
  "Database Admin", "DevOps Engineer", "Cloud Engineer", "Technical Support", "Cybersecurity Analyst",
  "Data Scientist", "AI/ML Engineer", "Business Analyst", "Project Manager", "UI/UX Designer",
  "Technical Writer", "Vibe Coder",
] as const;
export const JOB_CODES = ["SE", "MD", "QA", "SA", "NA", "DB", "DO", "CE", "TS", "CS", "DS", "AI", "BA", "PM", "UX", "TW", "VC"] as const;
