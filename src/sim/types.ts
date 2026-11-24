// Plain-data simulation state. Everything here must be cloneable and checksummable.

/** Indexes into Fighter.st (status timers and values). Effect words: GAME_DESIGN.md 3.0. */
export const S = {
  STUN: 0, ROOT: 1, CC_IMM: 2, SLOW_T: 3, SLOW_PCT: 4, SILENCE: 5, WEAK: 6, SHIELD: 7,
  WET: 8, // Cloud Engineer's marker
  DEBT: 9, DEBT_T: 10, // Business Analyst's stacks and their decay timer
  TICKET: 11, // Project Manager's Assign Ticket countdown
  REFLECT: 12, // Cybersecurity Mirror
  CRIT_NEXT: 13, // next hit crits (Grid Snap)
  SPD_T: 14, SPD_PCT: 15, // speed buff
  BUBBLE: 16, ABSORBED: 17, // Zero-Trust bubble timer and damage it absorbed
} as const;
export const N_ST = 18;
export const N_RES = 8; // job-specific counters

/** Indexes into State.stats[player]. */
export const ST = { DMG: 0, HITS: 1, BURNOUTS: 2, SKILLS: 3, DASHES: 4, MAX_COMBO: 5, COMBO: 6 } as const;
export const N_STATS = 7;

export interface Fighter {
  job: number;
  x: number; y: number; px: number; py: number; face: number; // px/py: last frame's position; face: 0-63 angle
  hp: number; mot: number; motIdle: number; burnout: number;
  charging: number; charge: number; recovery: number; hitstun: number;
  swing: number; swingFull: number; swingA: number; // render: last basic swing
  kx: number; ky: number; kT: number; kSplat: number; kSplatDmg: number; kSplatStun: number; // knockback / pull / throw
  dash: number; dashA: number; dashCd: number; dashN: number; iframes: number;
  lunge: number; lungeA: number; lungeSp: number; lungeDmg: number; lungeStop: number; lungeHit: number; // dash attacks
  cast: number; castSkill: number; sinceSkill: number; quiet: number; // quiet: frames since last damage taken
  air: number; air0: number; ax0: number; ay0: number; ax1: number; ay1: number; // leaps
  cd: number[]; st: number[]; res: number[];
  prevIn: number; flash: number;
}

/** Entity kinds. */
export const K = {
  PROJ: 1, // moving shot
  DELAYED: 2, // warning circle that goes off after a delay
  ZONE: 3, // floor area with a timer
  WALL: 4, // blocks movement and shots; has HP
  PET: 5, // summon: has HP, a timer and its own behavior
  RING: 6, // expanding ring from a point
  ANCHOR: 7, // fixed object (Network Admin's router)
} as const;

export interface Entity {
  id: number;
  k: number; // kind, see K
  b: string; // behavior id, e.g. "se.recursion"
  o: number; // owner 0/1
  x: number; y: number; vx: number; vy: number;
  r: number; t: number; t0: number; // radius, frames left, lifetime
  n: number; // generic counter (hits, bounces, level…)
  hitCd: number; mult: number; // re-hit cooldown, damage multiplier (percent)
  hp: number; dmg: number; // pets/walls: hit points; shots: damage dealt to pets and walls
  w: number; h: number; // walls: half width/height; rings: max radius
  a: number; tag: number; // angle; flags (see core.ts TAG)
}

/** Render-only events (damage numbers, sparks, banners). Part of the state so rollback stays consistent. */
export const FX = { DMG: 1, SPARK: 2, SPLAT: 3, BURNOUT: 4, SKILL: 5, KO: 6, DASH: 7, LAND: 8, BLAST: 9, CRIT: 10, BREAK: 11 } as const;
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
