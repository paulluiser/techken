// Pixel toolkit for generated art (renderer only: floats are fine here, never in the sim).
export const OUT = "#1b1630"; // deep blue-black outline (never pure black)

const RGB: Record<string, [number, number, number]> = {};
export function rgb(hex: string): [number, number, number] {
  if (RGB[hex]) return RGB[hex];
  const n = parseInt(hex.slice(1), 16);
  return (RGB[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
export const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export const numHex = (n: number) => "#" + n.toString(16).padStart(6, "0");

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
/** Move a hue toward a target hue by up to `deg`. */
function toward(h: number, target: number, deg: number) {
  let d = ((target - h + 540) % 360) - 180;
  d = Math.max(-deg, Math.min(deg, d));
  return h + d;
}
/** Hue-shifted ramp: shadows lean blue/purple, highlights lean yellow (GDD 14.1). */
export function ramp(base: string) {
  const [h, s, l] = toHsl(base);
  return {
    base,
    shadow: fromHsl(toward(h, 250, 22), Math.min(1, s * 1.05), Math.max(0.06, l * 0.66)),
    deep: fromHsl(toward(h, 255, 32), Math.min(1, s * 1.1), Math.max(0.04, l * 0.42)),
    light: fromHsl(toward(h, 55, 14), s * 0.95, Math.min(0.94, l + (1 - l) * 0.38)),
  };
}
export const hueRotate = (hex: string, deg: number) => { const [h, s, l] = toHsl(hex); return fromHsl(h + deg, s, l); };
export const darken = (hex: string, f: number) => { const [r, g, b] = rgb(hex); return toHex(r * f, g * f, b * f); };
export function toGray(hex: string) {
  if (hex === OUT) return OUT;
  const [r, g, b] = rgb(hex), l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  return ["#1b1630", "#3d3a4a", "#66637a", "#9693a6", "#c6c3d2", "#f0eef6"][Math.min(5, Math.max(1, Math.round(l * 5)))];
}

/** Seeded RNG for deterministic art. */
export function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Buf {
  d: (string | null)[];
  constructor(public w: number, public h: number) { this.d = new Array(w * h).fill(null); }
  set(x: number, y: number, c: string | null) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; }
  get(x: number, y: number) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null; return this.d[y * this.w + x]; }
  rect(x: number, y: number, w: number, h: number, c: string | null) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }
  poly(pts: [number, number][], c: string) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5, py = y + 0.5; let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) this.set(x, y, c);
    }
  }
  each(fn: (c: string, x: number, y: number) => string | null | undefined) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = this.d[y * this.w + x]; if (c !== null) { const n = fn(c, x, y); if (n !== undefined) this.d[y * this.w + x] = n; } }
  }
  outline(col = OUT) {
    const add: [number, number][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y) !== null) continue;
      const n = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
      if (n.some((v) => v !== null && v !== col)) add.push([x, y]);
    }
    for (const [x, y] of add) this.set(x, y, col);
  }
  /** Stamp a string pixel map; `.` is transparent. */
  map(rows: string[], x: number, y: number, pal: Record<string, string>, transpose = false, flip = false) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (ch === "." || !pal[ch]) return;
      const ii = flip ? r.length - 1 - i : i;
      if (transpose) this.set(x + j, y + ii, pal[ch]); else this.set(x + ii, y + j, pal[ch]);
    }));
  }
  toCanvas(map?: (c: string) => string | null): HTMLCanvasElement {
    const c = document.createElement("canvas"); c.width = this.w; c.height = this.h;
    const g = c.getContext("2d")!, img = g.createImageData(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      let col = this.d[i]; if (col === null) continue;
      if (map) col = map(col); if (!col) continue;
      const [r, gg, b] = rgb(col); img.data[i * 4] = r; img.data[i * 4 + 1] = gg; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}

export function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.imageSmoothingEnabled = false;
  return [c, g];
}
