// One player's input for one frame, packed into a small integer.
export const IN_LEFT = 1;
export const IN_RIGHT = 2;
export const IN_UP = 4;
export const IN_DOWN = 8;
export const IN_ATTACK = 16;
export const IN_DASH = 32;
export const IN_ALL = 63;

export type Input = number;
