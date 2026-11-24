// Plain-data simulation state. Everything here must be cloneable and checksummable.

/** Indexes into Fighter.st (status timers and values). */
export const S = { STUN: 0, ROOT: 1, CC_IMM: 2, SLOW_T: 3, SLOW_PCT: 4, SILENCE: 5, WEAK: 6, SHIELD: 7 } as const;
export const N_ST = 8;
export const N_RES = 8; // job-specific counters

/** Indexes into State.stats[player]. */
export const ST = { DMG: 0, HITS: 1, BURNOUTS: 2, SKILLS: 3, DASHES: 4, MAX_COMBO: 5, COMBO: 6 } as const;
export const N_STATS = 7;

export interface Fighter {
  job: number;
  x: number; y: number; face: number; // face is a 0-63 angle
  hp: number; mot: number; motIdle: number; burnout: number;
  charging: number; charge: number; recovery: number; hitstun: number;
  swing: number; swingFull: number; swingA: number; // render: last basic swing
  kx: number; ky: number; kT: number; kSplat: number; // knockback / pull
  dash: number; dashA: number; dashCd: number; iframes: number;
  cast: number; castSkill: number; // cast lock and which skill (1-3) for the renderer
  air: number; air0: number; ax0: number; ay0: number; ax1: number; ay1: number; // leaps
  cd: number[]; st: number[]; res: number[];
  prevIn: number; flash: number;
}

/** Entity kinds. */
export const K = { PROJ: 1, DELAYED: 2 } as const;

export interface Entity {
  id: number;
  k: number; // kind, see K
  b: string; // behavior id, e.g. "se.recursion"
  o: number; // owner 0/1
  x: number; y: number; vx: number; vy: number;
  r: number; t: number; t0: number; // radius, frames left, lifetime
  n: number; // generic counter (hits, bounces…)
  hitCd: number; mult: number; // re-hit cooldown, damage multiplier (percent)
}

/** Render-only events (damage numbers, sparks, banners). Part of the state so rollback stays consistent. */
export const FX = { DMG: 1, SPARK: 2, SPLAT: 3, BURNOUT: 4, SKILL: 5, KO: 6, DASH: 7, LAND: 8 } as const;
export interface Fx { fr: number; k: number; x: number; y: number; v: number; o: number }

export interface MatchConfig {
  jobs: [number, number];
  arena: number;
  seed: number;
  /** Attract mode: restart after the match ends. */
  loop?: boolean;
}

export interface State {
  frame: number;
  phase: number; phaseT: number;
  timer: number; round: number; ot: number; finalRound: number;
  wins: [number, number]; roundWinner: number; matchWinner: number; // -1 none, 2 draw / both
  cfg: MatchConfig;
  rng: number; nextId: number;
  f: [Fighter, Fighter];
  ents: Entity[];
  fx: Fx[];
  stats: [number[], number[]];
}
