// Top-down arena layouts (GAME_DESIGN.md section 5). Units: milli-tiles (1000 = 1 tile).
// Arenas are symmetric so neither start position has an advantage.
import { TILE } from "./constants";

/** Axis-aligned cover block: x1, y1, x2, y2. Blocks movement and shots. */
export type Rect = [number, number, number, number];

export interface ArenaDef {
  id: string;
  name: string;
  w: number; h: number; // floor size
  cover: Rect[];
  start: [[number, number], [number, number]];
}

const t = (v: number) => Math.round(v * TILE);
const box = (x1: number, y1: number, x2: number, y2: number): Rect => [t(x1), t(y1), t(x2), t(y2)];

export const ARENAS: ArenaDef[] = [
  {
    id: "office", name: "Open Office", w: t(15), h: t(9),
    cover: [box(3.5, 1.8, 5.5, 2.8), box(9.5, 1.8, 11.5, 2.8), box(3.5, 6.2, 5.5, 7.2), box(9.5, 6.2, 11.5, 7.2), box(7.1, 4.1, 7.9, 4.9)],
    start: [[t(2.2), t(4.5)], [t(12.8), t(4.5)]],
  },
  {
    id: "terminal", name: "The Terminal", w: t(15), h: t(9),
    cover: [box(5.4, 3.4, 6.4, 5.6), box(8.6, 3.4, 9.6, 5.6)],
    start: [[t(2.2), t(4.5)], [t(12.8), t(4.5)]],
  },
];
