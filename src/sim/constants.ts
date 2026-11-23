// Global rules. All gameplay numbers are integers. Positions and velocities are in
// "sub-pixels" (1 px = SUB units); time is in frames (60 per second).
// Job-specific numbers live in src/sim/jobs/.
export const FPS = 60;
export const SUB = 256;
export const sec = (s: number) => Math.round(s * FPS);

// Screen (384x216 base resolution)
export const W = 384;
export const H = 216;
export const WALL_L = 8;
export const WALL_R = 376;

// Movement (per frame)
export const GRAVITY = 90;
export const MAX_FALL = 7 * SUB;
export const GLIDE_FALL = Math.trunc(1.5 * SUB);
export const JUMP_V = -6 * SUB;
export const DJUMP_V = -1331;
export const DROP_FRAMES = 10;

// Resources
export const HP_MAX = 1000;
export const MOT_MAX = 10000; // Motivation in hundredths (100.00)
export const MOT_REGEN = 10; // +6 per second
export const MOT_REGEN_DELAY = 60;
export const MOT_ON_HIT = 400;
export const MOT_ON_HURT = 200;
export const BURNOUT_FRAMES = 120;
export const BURNOUT_RECOVER = 3500;

// Dash
export const DASH_COST = 1000;
export const DASH_FRAMES = 10;
export const DASH_SPEED = 6 * SUB;
export const DASH_IFRAMES = 12;
export const DASH_CD = 72;

// Basic attack (per-job charge time and damage live in the job defs)
export const CHARGE_MAX = 90;
export const TAP_FRAC = 4; // released before 1/4 of full charge = tap
export const ATK_STARTUP = 3;
export const ATK_ACTIVE = 4;
export const REC_TAP = 30;
export const REC_FULL = 18;
export const HITSTUN_TAP = 12;
export const HITSTUN_FULL = 30;

// Guard
export const GUARD_BLOCK = 700; // permille of damage blocked
export const GUARD_BLOCK_BURNOUT = 400;
export const GUARD_COST = 500;
export const GUARD_BREAK_STUN = 36;

// Status caps (GDD 8.1)
export const HARD_CC_MAX = 90;
export const CC_IMMUNE = 60;
export const SILENCE_MAX = 120;
export const SLOW_MAX = 40;
export const CD_PUSH_MAX = sec(5);
export const CAST_LOCK = 10; // frames you can't act after casting

// Items
export const ITEM_FIRST = sec(15);
export const ITEM_EVERY_MIN = sec(15);
export const ITEM_EVERY_MAX = sec(20);
export const ITEM_LIFE = sec(10);
export const ITEM_MAX = 2;
export const PERM_STACK_MAX = 2;

// Rounds
export const ROUND_FRAMES = 90 * FPS;
export const ROUND_PAUSE = 120;
export const MATCH_PAUSE = 240;
export const ROUNDS_TO_WIN = 2;
export const START_X: readonly [number, number] = [120, 264];
