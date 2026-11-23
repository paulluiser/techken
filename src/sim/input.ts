// One player's input for one frame, packed into a small integer (10 bits).
export const IN_LEFT = 1;
export const IN_RIGHT = 2;
export const IN_UP = 4;
export const IN_DOWN = 8;
export const IN_ATTACK = 16;
export const IN_DASH = 32;
export const IN_GUARD = 64;
export const IN_S1 = 128;
export const IN_S2 = 256;
export const IN_S3 = 512;
export const IN_SKILLS = [IN_S1, IN_S2, IN_S3] as const;
export const IN_ALL = 1023;

export type Input = number;
