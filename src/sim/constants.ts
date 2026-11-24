// Global rules for the top-down sim (GAME_DESIGN.md v0.3, section 1). Integers only.
// Distances are in milli-tiles: 1 tile = TILE units. Time is in frames (60 per second).
// Job numbers live in data/kits.gen.ts (generated from design/kits_v3.py).
export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);
export const TILE = 1000;

// Fighters
export const HP_MAX = 1000;
export const FIGHTER_R = 380;
/** Walking speed (units/frame) by speed rating 1-5. */
export const SPEEDS = [0, 52, 62, 72, 82, 92];
export const CHARGE_MOVE_PCT = 60;
export const BURNOUT_MOVE_PCT = 50;

// Motivation (in hundredths, so 10000 = 100)
export const MOT_MAX = 10000;
export const MOT_REGEN = 10; // +6 per second
export const MOT_REGEN_DELAY = 60;
export const MOT_ON_HIT = 400;
export const MOT_ON_HURT = 200;
export const BURNOUT_FRAMES = 120;
export const BURNOUT_RECOVER = 3500;

// Dash
export const DASH_COST = 1000;
export const DASH_FRAMES = 10;
export const DASH_SPEED = 300;
export const DASH_IFRAMES = 12;
export const DASH_CD = 72;

// Basic attack
export const TAP_PCT = 25; // released before 25 % charge = tap
export const CHARGE_HOLD = 90; // a full charge fires on its own after this long
export const TAP_RECOVERY = 24; // plus a third of the job's charge time, so heavy weapons tap slowly
export const MID_RECOVERY = 24;
export const FULL_RECOVERY = 18;
export const TAP_HITSTUN = 12;
export const FULL_HITSTUN = 24;
export const KNOCK_SPEED = 150;
export const KNOCK_FRAMES = 12;
export const WALL_SPLAT = 24;
export const SWING_FRAMES = 12; // render-only swing animation length
export const SHOT_SPEED = 260; // ranged basics (from R2)

// Skills
export const CAST_LOCK = 12;
export const HARD_CC_MAX = sec(1.5);
export const CC_IMMUNE = sec(1);
export const SILENCE_MAX = sec(2);
export const SLOW_MAX = 40;
export const WEAK_PCT = 20;

// Round flow
export const INTRO_FRAMES = 90;
export const ROUND_FRAMES = sec(90);
export const OT_FRAMES = sec(15);
export const ROUND_END_FRAMES = 150;
export const MATCH_END_FRAMES = 240;
export const WINS_NEEDED = 2;
