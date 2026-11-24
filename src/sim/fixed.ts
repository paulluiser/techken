// Deterministic integer math for the sim. Angles are 0-63 (64 directions):
// angle 0 points +x (right), 16 points +y (down the screen, toward the camera).

/** cos(2*pi*i/64) * 1024, rounded. A fixed table so every browser gets identical numbers. */
const COS = [1024, 1019, 1004, 980, 946, 903, 851, 792, 724, 650, 569, 483, 392, 297, 200, 100, 0, -100, -200, -297, -392, -483, -569, -650, -724, -792, -851, -903, -946, -980, -1004, -1019, -1024, -1019, -1004, -980, -946, -903, -851, -792, -724, -650, -569, -483, -392, -297, -200, -100, 0, 100, 200, 297, 392, 483, 569, 650, 724, 792, 851, 903, 946, 980, 1004, 1019];

export const ANGLES = 64;
export const wrapA = (a: number) => ((a % ANGLES) + ANGLES) % ANGLES;
/** x component of a unit vector at angle a, scaled by 1024. */
export const cosA = (a: number) => COS[wrapA(a)];
/** y component of a unit vector at angle a, scaled by 1024. */
export const sinA = (a: number) => COS[wrapA(a - 16)];
/** Moves `len` units along angle a (integer result). */
export const dx = (a: number, len: number) => Math.trunc((cosA(a) * len) / 1024);
export const dy = (a: number, len: number) => Math.trunc((sinA(a) * len) / 1024);

/** Integer square root. Math.sqrt is correctly rounded in IEEE 754, so this is deterministic. */
export const isqrt = (n: number) => (n <= 0 ? 0 : Math.floor(Math.sqrt(n)));
export const dist = (x1: number, y1: number, x2: number, y2: number) => isqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

/** The 64-direction angle closest to the vector (vx, vy). Returns `fallback` for a zero vector. */
export function angleOf(vx: number, vy: number, fallback = 0): number {
  if (vx === 0 && vy === 0) return fallback;
  let best = 0, bestDot = -Infinity;
  for (let i = 0; i < ANGLES; i++) {
    const d = vx * COS[i] + vy * COS[wrapA(i - 16)];
    if (d > bestDot) { bestDot = d; best = i; }
  }
  return best;
}

/** Smallest difference between two angles, 0-32. */
export const angleDiff = (a: number, b: number) => { const d = wrapA(a - b); return d > 32 ? 64 - d : d; };

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
