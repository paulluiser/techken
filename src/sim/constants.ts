// All gameplay numbers are integers. Positions and velocities are in "sub-pixels":
// 1 pixel = SUB units, so movement can be fractional without floating point.
export const FPS = 60;
export const SUB = 256;

// Arena: 384x216 base resolution, "The Terminal" layout (flat floor + 3 one-way platforms).
export const W = 384;
export const H = 216;
export const FLOOR_Y = 184;
export const WALL_L = 8;
export const WALL_R = 376;
export interface Platform { x1: number; x2: number; y: number }
export const PLATFORMS: readonly Platform[] = [
  { x1: 64, x2: 160, y: 136 },
  { x1: 224, x2: 320, y: 136 },
  { x1: 152, x2: 232, y: 92 },
];

// Fighter body (feet-center anchored)
export const BODY_W = 20;
export const BODY_H = 36;

// Movement (per frame)
export const WALK = 2 * SUB;
export const CHARGE_WALK = Math.trunc((WALK * 6) / 10); // 60 % speed while charging
export const GRAVITY = 90;
export const MAX_FALL = 7 * SUB;
export const JUMP_V = -6 * SUB;
export const DJUMP_V = -1331; // ~5.2 px/frame
export const DROP_FRAMES = 10;

// Resources
export const HP_MAX = 1000;
export const MOT_MAX = 10000; // Motivation in hundredths (100.00)
export const MOT_REGEN = 10; // +0.10 per frame = +6 per second
export const MOT_REGEN_DELAY = 60; // regen starts 1 s after spending
export const MOT_ON_HIT = 400; // +4 for landing a basic
export const MOT_ON_HURT = 200; // +2 for taking a hit
export const BURNOUT_FRAMES = 120; // 2.0 s
export const BURNOUT_RECOVER = 3500; // back with 35 Motivation

// Dash
export const DASH_COST = 1000; // 10 Motivation
export const DASH_FRAMES = 10;
export const DASH_SPEED = 6 * SUB;
export const DASH_IFRAMES = 12; // 0.2 s
export const DASH_CD = 72; // 1.2 s

// Charge attack (Software Engineer numbers from the GDD: 0.8 s full charge, 25 / 70 dmg)
export const CHARGE_FULL = 48;
export const CHARGE_MAX = 90; // 1.5 s, then it fires on its own
export const TAP_MAX = 12; // released before 25 % = tap
export const ATK_STARTUP = 3;
export const ATK_ACTIVE = 4;
export const DMG_TAP = 25;
export const DMG_FULL = 70;
export const REC_TAP = 30; // 0.5 s recovery after a tap
export const REC_FULL = 18; // 0.3 s recovery after a full charge
export const HITBOX_REACH = 26;
export const HITSTUN_TAP = 12;
export const HITSTUN_FULL = 30;

// Rounds
export const ROUND_FRAMES = 90 * FPS;
export const ROUND_PAUSE = 120;
export const MATCH_PAUSE = 240;
export const ROUNDS_TO_WIN = 2;
export const START_X: readonly [number, number] = [120, 264];
