// One player's input for one frame, packed into 21 bits so the netcode can send it as a number.
//   bits 0-5   buttons: attack, dash, skill 1-3, manual aim
//   bits 6-10  move: 0 = standing, 1-16 = one of 16 directions
//   bits 11-16 aim angle 0-63 (only used when IN_AIM is set; otherwise the sim auto-aims)
//   bits 17-20 aim distance in half tiles (0 = use the skill's default range)
export const IN_ATTACK = 1;
export const IN_DASH = 2;
export const IN_S1 = 4;
export const IN_S2 = 8;
export const IN_S3 = 16;
export const IN_AIM = 32;
export const IN_SKILLS = [IN_S1, IN_S2, IN_S3] as const;
export const IN_BUTTONS = 63;
export const IN_ALL = (1 << 21) - 1;

const MOVE_SHIFT = 6, AIM_SHIFT = 11, DIST_SHIFT = 17;

export type Input = number;

/** Packs an input. moveDir: -1 for none, else 0-15. aim: -1 for auto, else 0-63. dist: half tiles 0-15. */
export function packInput(buttons: number, moveDir: number, aim = -1, dist = 0): Input {
  let v = buttons & (IN_BUTTONS & ~IN_AIM);
  if (moveDir >= 0) v |= ((moveDir & 15) + 1) << MOVE_SHIFT;
  if (aim >= 0) v |= IN_AIM | ((aim & 63) << AIM_SHIFT) | ((Math.max(0, Math.min(15, dist)) & 15) << DIST_SHIFT);
  return v;
}
/** Move direction as a 64-step angle, or -1 when standing still. */
export const moveAngle = (i: Input) => { const m = (i >> MOVE_SHIFT) & 31; return m === 0 ? -1 : (m - 1) * 4; };
export const hasAim = (i: Input) => (i & IN_AIM) !== 0;
export const aimAngle = (i: Input) => (i >> AIM_SHIFT) & 63;
/** Aim distance in sim units (0 = default). */
export const aimDist = (i: Input) => ((i >> DIST_SHIFT) & 15) * 500;
