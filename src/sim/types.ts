// Plain-data simulation state. Everything here must be cloneable and checksummable.

/** Indexes into Fighter.st (status/buff timers and values). */
export const S = {
  STUN: 0, ROOT: 1, CC_IMMUNE: 2, SILENCE: 3, SIL_IMMUNE: 4, SLOW_T: 5, SLOW_PCT: 6, INVERT: 7,
  SHIELD: 8, SHIELD_T: 9, REFLECT: 10, COUNTER: 11, COUNTER_DMG: 12, INVULN: 13, CAST: 14,
  DMG_BUF_T: 15, DMG_BUF: 16, SPD_BUF_T: 17, SPD_BUF: 18, CHG_BUF_T: 19, CHG_BUF: 20,
  REGEN_BUF_T: 21, REGEN_BUF: 22, FREE_SKILLS: 23, CC_IMMUNE_ITEM: 24, CRASH_T: 25,
  WEAK: 26, WET: 27, UNHANDLED: 28, HOLD: 29, DRAIN_T: 30, HEAL_LEFT: 31, JOIN: 32,
  GUARD_BREAK: 33, HELD_ITEM: 34, BURN_T: 35, BURN_DPS: 36, RATE_LIMIT: 37,
  PERM_DMG: 38, PERM_ARMOR: 39, PERM_CHARGE: 40, PERM_COST: 41, PERM_MOT: 42, PERM_CDR: 43,
  LAST_SKILL: 44, HURT_IDLE: 45, MERGE: 46,
} as const;
export const N_ST = 47;

export interface Fighter {
  job: number; set: number;
  x: number; y: number; vx: number; vy: number;
  onGround: number; jumpsLeft: number; facing: number;
  hp: number; mot: number; motIdle: number; burnout: number;
  charging: number; charge: number; guarding: number;
  atk: number; atkCharge: number; atkHit: number; recovery: number;
  hitstun: number; dash: number; dashDir: number; dashCd: number; iframes: number;
  dropThrough: number; prevInput: number; flash: number; lastDmg: number;
  cd: number[]; // 3 skill cooldowns (frames)
  cdPushed: number[]; // cooldown denial already applied (capped)
  st: number[]; // statuses, see S
  res: number[]; // job-specific resources (8 slots)
}

/** Projectiles, summons, zones, walls, traps, platforms, anchors… */
export const K = { PROJ: 1, SUMMON: 2, ZONE: 3, WALL: 4, PLATFORM: 5, TRAP: 6, ANCHOR: 7, DELAYED: 8 } as const;

export interface Entity {
  id: number;
  k: number; // kind, see K
  b: string; // behavior id, e.g. "se.recursion"
  o: number; // owner 0/1
  x: number; y: number; vx: number; vy: number; // y = bottom (feet) for bodies, center for shots
  w: number; h: number; // px
  hp: number; life: number; t: number; dmg: number;
  p1: number; p2: number; p3: number; hits: number;
}

export interface Item {
  id: number; kind: number; x: number; y: number; life: number;
}

export interface MatchConfig {
  jobs: [number, number];
  sets: [number, number];
  arena: number;
  items: boolean;
  hazards: boolean;
  seed: number;
}

export interface State {
  frame: number;
  phase: number;
  phaseT: number;
  timer: number;
  round: number;
  wins: [number, number];
  roundWinner: number; // -1 none, 0/1 player, 2 double KO, 3 time-out draw
  matchWinner: number;
  cfg: MatchConfig;
  rng: number;
  nextId: number;
  itemT: number;
  f: [Fighter, Fighter];
  ents: Entity[];
  items: Item[];
}
