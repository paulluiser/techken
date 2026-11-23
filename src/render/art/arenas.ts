// Arena backgrounds in the 5-layer "modern 8-bit" style (GDD 14.2): stepped sky bands, a far
// silhouette, a mid layer, near framing, and the play layer (floor tiles + platforms).
// Baked once per arena into canvases; platforms are separate so hazards can hide one.
import { ARENAS } from "../../sim/arenas";
import { Buf, OUT, canvas, darken, ramp, rng } from "./pix";

const W = 384, H = 216;

function bands(b: Buf, cols: string[], from = 0, to = H) {
  const n = cols.length, step = (to - from) / n;
  for (let y = from; y < to; y++) {
    const k = Math.min(n - 1, Math.floor((y - from) / step));
    const edge = from + (k + 1) * step - y;
    for (let x = 0; x < W; x++) b.set(x, y, k < n - 1 && edge <= 2 && (x + y) % 2 === 0 ? cols[k + 1] : cols[k]);
  }
}
function mountains(b: Buf, base: number, amp: number, f: number, ph: number, c: { base: string; lit: string; shadow: string }, snow?: string, bottom = 184) {
  const top = (x: number) => Math.round(base - amp * (0.55 * Math.abs(Math.sin(x * f + ph)) + 0.3 * Math.abs(Math.sin(x * f * 2.3 + ph * 1.7)) + 0.15 * Math.sin(x * f * 5.1)));
  for (let x = 0; x < W; x++) {
    const t = top(x), rising = top(x - 1) > t;
    for (let y = t; y < bottom; y++) {
      let col = c.base;
      if (y - t < 6) col = rising ? c.lit : c.shadow;
      if (snow && t < base - amp * 0.55 && y - t < 3 + (x % 3)) col = rising ? snow : darken(snow, 0.8);
      b.set(x, y, col);
    }
  }
}
function pine(b: Buf, cx: number, baseY: number, h: number, w: number, r: () => number, cols = ["#57b85a", "#2f8a4a", "#1d5a3a", "#174a32", "#9be06a"]) {
  b.rect(cx - 2, baseY - 10, 5, 10, "#6b4428"); b.rect(cx + 1, baseY - 10, 2, 10, "#4a2e1a");
  const tiers = 4, top = baseY - h, fh = h - 8, th = Math.round(fh / (tiers * 0.72));
  for (let i = 0; i < tiers; i++) {
    const tTop = top + Math.round(i * fh * 0.24), tw = Math.round((w / 2) * (0.45 + (0.55 * (i + 1)) / tiers));
    for (let y = 0; y < th; y++) {
      const yy = tTop + y; if (yy > baseY - 8) break;
      const hw = Math.max(1, Math.round((tw * (y + 1)) / th));
      for (let x = cx - hw; x <= cx + hw; x++) {
        const rel = (x - (cx - hw)) / (2 * hw + 1);
        let c = rel < 0.38 ? cols[0] : rel < 0.72 ? cols[1] : cols[2];
        if (y >= th - 2) c = rel < 0.38 ? cols[1] : cols[3];
        b.set(x, yy, c);
      }
      if (y < th - 2 && y % 3 === 1 && r() < 0.8) b.set(cx - hw + 1, yy, cols[4]);
    }
  }
}
function skyline(b: Buf, baseY: number, r: () => number, body: string, lit: string, win: string, minH: number, maxH: number) {
  let x = -4;
  while (x < W) {
    const w = 14 + Math.floor(r() * 26), h = minH + Math.floor(r() * (maxH - minH));
    b.rect(x, baseY - h, w, h, body); b.rect(x, baseY - h, 2, h, lit);
    for (let wy = baseY - h + 4; wy < baseY - 4; wy += 5) for (let wx = x + 4; wx < x + w - 3; wx += 4) if (r() < 0.45) b.set(wx, wy, win);
    x += w + 1 + Math.floor(r() * 4);
  }
}
function clouds(b: Buf, r: () => number, n: number, yMax: number, cols = ["#f2f6ff", "#c8d5f5", "#93a6dc"]) {
  for (let k = 0; k < n; k++) {
    const cx = r() * W, cy = 12 + r() * yMax, w = 30 + r() * 50;
    const c = new Buf(Math.ceil(w) + 8, 24);
    for (let i = 0; i < 5; i++) c.ellipse(4 + r() * w, 10 + r() * 6, 5 + r() * 8, 4 + r() * 5, cols[1]);
    c.rect(0, 20, c.w, 4, null);
    c.each((col, x, y) => (c.get(x, y - 1) === null ? cols[0] : c.get(x, y + 1) === null ? cols[2] : col));
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const v = c.get(x, y); if (v) b.set(cx + x, cy + y, v); }
  }
}
function tiles(b: Buf, floor: number, style: string, r: () => number) {
  const fills: Record<string, [string, string, string, string]> = {
    grass: ["#5cb043", "#9be06a", "#8a5a34", "#6e4428"], carpet: ["#4a5a7a", "#6b7ba0", "#2f3a52", "#273047"],
    metal: ["#5a6474", "#8a94a6", "#2e3440", "#262b35"], wood: ["#a8703c", "#c8935c", "#6b4226", "#5a3620"],
    concrete: ["#8a8a8a", "#b0b0b0", "#5a5a5a", "#4a4a4a"], neon: ["#0f3a22", "#39ff7a", "#07140d", "#0a1c12"],
    red: ["#8a2433", "#b8394a", "#4a1018", "#3a0c14"], cloud: ["#f2f6ff", "#ffffff", "#c8d5f5", "#a6b8e6"], tile: ["#3a3550", "#5a5578", "#24203a", "#1c1930"],
  };
  const [top, hi, dirt, dirt2] = fills[style] ?? fills.metal;
  b.rect(0, floor, W, 4, top); b.rect(0, floor, W, 1, hi);
  for (let y = floor + 4; y < H; y++) for (let x = 0; x < W; x++) b.set(x, y, (x >> 4) % 2 === ((y - floor) >> 4) % 2 ? dirt : dirt2);
  if (style === "grass") {
    for (let x = 0; x < W; x++) { if (r() < 0.35) { const h = 1 + Math.floor(r() * 3); for (let k = 1; k <= h; k++) b.set(x, floor - k, k === h ? "#9be06a" : "#7cc24a"); } }
    for (let i = 0; i < 40; i++) { const x = Math.floor(r() * W), y = floor + 8 + Math.floor(r() * 22); b.rect(x, y, 5, 3, "#b07a48"); b.rect(x, y, 4, 1, "#d09a62"); b.rect(x, y + 3, 6, 1, "#4a2c18"); }
  } else {
    for (let x = 0; x < W; x += 16) b.rect(x, floor + 4, 1, H - floor, darken(dirt, 0.8));
    if (style === "neon") for (let i = 0; i < 30; i++) b.set(Math.floor(r() * W), floor + 6 + Math.floor(r() * 20), "#39ff7a");
  }
}

interface Theme { platform: string; draw: (b: Buf, r: () => number, floor: number) => string }
const THEMES: Record<string, Theme> = {
  terminal: { platform: "neon", draw: (b, r, fl) => {
    b.rect(0, 0, W, H, "#07140d");
    for (let x = 4; x < W; x += 9) { const len = 10 + Math.floor(r() * 60), y0 = Math.floor(r() * 120); for (let y = y0; y < y0 + len; y += 3) if (r() < 0.7) b.rect(x, y, 2, 2, r() < 0.15 ? "#9bffbe" : "#1c5a34"); }
    for (let x = 0; x < W; x += 16) b.rect(x, 0, 1, fl, "#0c2416");
    return "neon";
  } },
  office: { platform: "desk", draw: (b, r, fl) => {
    bands(b, ["#c9c3b0", "#bdb6a2"], 0, fl);
    for (let wx = 24; wx < W; wx += 96) { b.rect(wx, 30, 60, 60, "#5aa8e8"); skyline(b, 90, r, "#3a5a8c", "#4a6ba0", "#ffe066", 10, 40); b.rect(wx, 30, 60, 2, "#8a8270"); b.rect(wx + 29, 30, 2, 60, "#8a8270"); }
    // the skyline must stay inside windows: repaint wall around them
    for (let y = 0; y < 30; y++) for (let x = 0; x < W; x++) b.set(x, y, y % 32 < 16 ? "#c9c3b0" : "#bdb6a2");
    for (let y = 90; y < fl; y++) for (let x = 0; x < W; x++) b.set(x, y, "#bdb6a2");
    for (let x = 0; x < W; x++) if ((x - 24) % 96 >= 60 || x < 24) for (let y = 30; y < 90; y++) b.set(x, y, "#c9c3b0");
    for (let x = 0; x < W; x += 48) { b.rect(x, fl - 40, 40, 40, "#8a95a8"); b.rect(x, fl - 40, 40, 3, "#a8b2c4"); }
    for (const x of [6, 362]) { b.rect(x + 4, fl - 26, 8, 26, "#6b4428"); b.ellipse(x + 8, fl - 32, 10, 12, "#2f8a4a"); b.ellipse(x + 5, fl - 36, 5, 6, "#57b85a"); }
    return "carpet";
  } },
  servers: { platform: "metal", draw: (b, r, fl) => {
    bands(b, ["#0a1630", "#0d1c3c", "#10234a"], 0, fl);
    for (let x = 0; x < W; x += 28) { b.rect(x, 40, 24, fl - 40, "#14233f"); b.rect(x, 40, 2, fl - 40, "#1e3358"); for (let y = 46; y < fl - 4; y += 6) { b.rect(x + 4, y, 16, 4, "#0b1426"); if (r() < 0.5) b.set(x + 6 + Math.floor(r() * 12), y + 1, r() < 0.6 ? "#59d3e8" : "#39ff7a"); } }
    for (const x of [0, 352]) { b.rect(x, 20, 32, fl - 20, "#1b2a48"); b.rect(x, 20, 3, fl - 20, "#2a3e66"); for (let y = 26; y < fl; y += 7) b.rect(x + 6, y, 20, 5, "#0b1426"); }
    return "metal";
  } },
  garage: { platform: "pingpong", draw: (b, r, fl) => {
    for (let y = 0; y < fl; y++) for (let x = 0; x < W; x++) b.set(x, y, (y >> 3) % 2 ? ((x + 8) >> 4) % 2 ? "#8a4a34" : "#7a4030" : (x >> 4) % 2 ? "#8a4a34" : "#7a4030");
    for (let y = 0; y < fl; y += 8) b.rect(0, y, W, 1, "#5a2e20");
    b.rect(150, 30, 90, 56, "#f2f2ec"); b.rect(150, 30, 90, 3, "#c8c8c0"); for (let k = 0; k < 6; k++) b.rect(158 + r() * 70, 40 + k * 7, 10 + r() * 30, 1, ["#3b4a7a", "#cc3333", "#2f8a4a"][k % 3]);
    b.rect(280, 40, 96, fl - 40, "#9aa0a8"); for (let y = 44; y < fl; y += 8) b.rect(280, y, 96, 1, "#7d8596");
    return "concrete";
  } },
  cloud: { platform: "cloud", draw: (b, r, fl) => {
    bands(b, ["#4a86d6", "#5b97e0", "#6ea8ea", "#86baf0", "#a6cdf5"], 0, fl);
    clouds(b, r, 10, 120);
    return "cloud";
  } },
  basement: { platform: "metal", draw: (b, r, fl) => {
    for (let y = 0; y < fl; y++) for (let x = 0; x < W; x++) b.set(x, y, ((x >> 3) + (y >> 3)) % 3 === 0 ? "#1d2618" : "#171f13");
    for (const y of [24, 40]) { b.rect(0, y, W, 4, "#3a4a3a"); b.rect(0, y, W, 1, "#5a6a5a"); }
    b.rect(260, 50, 110, fl - 50, "#2a3a2a"); b.rect(270, 60, 90, 50, "#0a1a0a"); for (let y = 64; y < 106; y += 4) b.rect(274, y, 20 + Math.floor(r() * 60), 2, "#39ff7a");
    for (let x = 270; x < 360; x += 8) b.rect(x, 116, 4, 4, r() < 0.5 ? "#ffb03a" : "#3a4a3a");
    return "concrete";
  } },
  expo: { platform: "booth", draw: (b, r, fl) => {
    bands(b, ["#1a0f2a", "#241433", "#2e1a40"], 0, fl);
    for (let x = 10; x < W; x += 74) { b.rect(x, 20, 50, 30, ["#ff6ad5", "#59d3e8", "#ffb03a", "#9ad64f", "#c09af0"][Math.floor(x / 74) % 5]); b.rect(x + 4, 28, 42, 3, "#ffffff"); b.rect(x + 24, 0, 2, 20, "#555566"); }
    for (let x = 0; x < W; x += 6) b.rect(x, 100 + Math.floor(r() * 6), 4, 30, "#3a2a50");
    return "red";
  } },
  coffee: { platform: "table", draw: (b, r, fl) => {
    bands(b, ["#4a2e20", "#553424"], 0, fl);
    b.rect(30, 30, 110, 50, "#1a1a1a"); for (let k = 0; k < 6; k++) b.rect(38, 38 + k * 7, 40 + Math.floor(r() * 50), 2, "#f2f2ec");
    for (const wx of [180, 280]) { b.rect(wx, 28, 80, 70, "#86baf0"); b.rect(wx, 28, 80, 3, "#2a1a12"); b.rect(wx + 39, 28, 3, 70, "#2a1a12"); }
    b.rect(0, fl - 46, W, 46, "#6b4226"); b.rect(0, fl - 46, W, 4, "#a8703c");
    return "wood";
  } },
  warroom: { platform: "desk", draw: (b, r, fl) => {
    bands(b, ["#1a0608", "#2a0a0e"], 0, fl);
    for (let y = 20; y < 110; y += 30) for (let x = 12; x < W; x += 48) { b.rect(x, y, 40, 24, "#0a0a12"); b.rect(x + 2, y + 2, 36, 20, r() < 0.4 ? "#5a0a12" : "#0e2a1a"); for (let k = 0; k < 3; k++) b.rect(x + 4, y + 5 + k * 5, 8 + Math.floor(r() * 26), 2, r() < 0.5 ? "#ff4b3a" : "#39ff7a"); }
    return "tile";
  } },
  home: { platform: "shelf", draw: (b, r, fl) => {
    for (let y = 0; y < fl; y++) for (let x = 0; x < W; x++) b.set(x, y, (x >> 2) % 6 === 0 ? "#2f3d52" : "#26334a");
    b.rect(160, 30, 70, 56, "#16215a"); b.rect(160, 30, 70, 3, "#c8a46a"); b.rect(194, 30, 3, 56, "#c8a46a"); for (let k = 0; k < 10; k++) b.set(162 + r() * 66, 34 + r() * 48, "#ffffff"); b.ellipse(176, 44, 6, 6, "#e9efff");
    b.rect(30, 40, 40, 54, "#ff6ad5"); b.rect(34, 46, 32, 40, "#26d0ce");
    return "wood";
  } },
  hackathon: { platform: "table", draw: (b, r, fl) => {
    bands(b, ["#0e0a1e", "#120e24", "#16122c"], 0, fl);
    b.rect(90, 16, 204, 26, "#2a2050"); b.rect(96, 22, 192, 14, "#9a90c4");
    for (let x = 6; x < W; x += 22) { b.rect(x, fl - 60 + Math.floor(r() * 10), 16, 10, "#cfd3da"); b.rect(x + 2, fl - 58, 12, 6, r() < 0.5 ? "#26f0e0" : "#ff6ad5"); }
    return "tile";
  } },
  retreat: { platform: "log", draw: (b, r, fl) => {
    bands(b, ["#16215a", "#1b2a6e", "#213584", "#28419a", "#2f4ca8"], 0, 130);
    for (let i = 0; i < 70; i++) b.set(r() * W, r() * 110, r() < 0.5 ? "#ffffff" : "#bcd0ff");
    b.ellipse(318, 38, 12, 12, "#e9efff"); b.ellipse(322, 42, 9, 9, "#b8c6f0"); b.ellipse(316, 36, 9, 9, "#e9efff");
    clouds(b, r, 4, 70);
    mountains(b, 118, 48, 0.031, 0.4, { base: "#5b6fbe", lit: "#8a9ee0", shadow: "#45579e" }, "#eef3ff", 170);
    mountains(b, 146, 26, 0.045, 2.1, { base: "#34447e", lit: "#46599a", shadow: "#2b3a6e" }, undefined, 170);
    for (let x = -6; x < W + 6; x += 6 + Math.floor(r() * 5)) pine(b, x, 160, 18 + Math.floor(r() * 14), 12, r, ["#1f4a5c", "#163a4e", "#122f45", "#0f2638", "#2d6670"]);
    for (let y = 158; y < fl; y++) for (let x = 0; x < W; x++) b.set(x, y, y < 166 ? "#1f3a8e" : y < 174 ? "#25449e" : "#2b4fb0");
    for (let i = 0; i < 30; i++) b.rect(r() * W, 160 + r() * 18, 3 + r() * 6, 1, r() < 0.5 ? "#4d6fd6" : "#7fa0ec");
    pine(b, 20, fl, 140, 50, r); pine(b, 364, fl, 150, 54, r);
    return "grass";
  } },
  rooftop: { platform: "ac", draw: (b, r, fl) => {
    bands(b, ["#3d84d6", "#4d94e0", "#62a6ea", "#7cb8f0"], 0, fl);
    clouds(b, r, 6, 70);
    skyline(b, fl, r, "#6f87b8", "#8aa0cc", "#cfe0ff", 40, 120);
    b.rect(300, fl - 80, 40, 40, "#8a5a34"); b.rect(304, fl - 40, 4, 40, "#5a3620"); b.rect(332, fl - 40, 4, 40, "#5a3620");
    return "concrete";
  } },
};

function platformCanvas(style: string, w: number): HTMLCanvasElement {
  const b = new Buf(w + 2, 14);
  const r = rng(w * 7);
  switch (style) {
    case "log": b.rect(1, 1, w, 8, "#7a4a2a"); b.rect(1, 1, w, 1, "#a8703c"); b.rect(1, 8, w, 1, "#4e2e1a"); for (const ex of [1, w]) { b.ellipse(ex + 0.5, 5, 3.6, 4, "#c8935c"); b.ellipse(ex + 0.5, 5, 2, 2.2, "#e0b078"); } for (let i = 2; i < w; i++) if (r() < 0.3) b.set(i, 0, "#6cc04a"); break;
    case "desk": b.rect(1, 1, w, 4, "#c8935c"); b.rect(1, 1, w, 1, "#e0b078"); b.rect(3, 5, 3, 8, "#6b4226"); b.rect(w - 4, 5, 3, 8, "#6b4226"); b.rect(w / 2 - 6, 2, 12, 1, "#2a2a2a"); break;
    case "table": b.rect(1, 1, w, 3, "#a8703c"); b.rect(1, 1, w, 1, "#c8935c"); b.rect(w / 2 - 1, 4, 3, 9, "#5a3620"); break;
    case "shelf": b.rect(1, 1, w, 3, "#e0d6c0"); b.rect(1, 4, w, 1, "#8a7f66"); for (let x = 4; x < w - 4; x += 7) b.rect(x, -1, 4, 2, ["#cc3333", "#3b4a7a", "#2f8a4a"][x % 3]); break;
    case "cloud": for (let i = 0; i < w; i += 8) b.ellipse(i + 5, 6, 7, 5, "#f2f6ff"); b.each((c, x, y) => (y > 7 ? "#c8d5f5" : c)); break;
    case "neon": b.rect(1, 1, w, 2, "#39ff7a"); b.rect(1, 3, w, 4, "#0f3a22"); break;
    case "pingpong": b.rect(1, 1, w, 3, "#2f8a4a"); b.rect(1, 1, w, 1, "#5cb043"); b.rect(w / 2, 0, 1, 4, "#ffffff"); b.rect(4, 4, 2, 9, "#555566"); b.rect(w - 5, 4, 2, 9, "#555566"); break;
    case "booth": b.rect(1, 1, w, 5, "#c09af0"); b.rect(1, 1, w, 1, "#ffffff"); b.rect(1, 6, w, 7, "#5e3aa6"); break;
    case "ac": b.rect(1, 1, w, 10, "#b0b8c4"); b.rect(1, 1, w, 1, "#dde3ea"); for (let x = 6; x < w - 6; x += 16) b.ellipse(x + 5, 6, 4, 4, "#6b7a8f"); break;
    default: b.rect(1, 1, w, 4, "#7d8596"); b.rect(1, 1, w, 1, "#c8d0e0"); b.rect(1, 5, w, 2, "#3a4459"); break;
  }
  b.outline(OUT);
  return b.toCanvas();
}

export interface ArenaArt { bg: HTMLCanvasElement; platforms: { x: number; y: number; img: HTMLCanvasElement }[] }
const baked = new Map<number, ArenaArt>();
export function arenaArt(idx: number): ArenaArt {
  const hit = baked.get(idx);
  if (hit) return hit;
  const a = ARENAS[idx], th = THEMES[a.id] ?? THEMES.terminal;
  const b = new Buf(W, H), r = rng(idx * 1013 + 7);
  const floorStyle = th.draw(b, r, a.floor);
  tiles(b, a.floor, floorStyle, r);
  // walls frame the arena
  for (let y = 0; y < H; y++) { for (let x = 0; x < 8; x++) b.set(x, y, darken(ramp("#3a4459").shadow, x < 2 ? 0.7 : 1)); for (let x = 376; x < W; x++) b.set(x, y, darken(ramp("#3a4459").shadow, x > 381 ? 0.7 : 1)); }
  const bg = b.toCanvas();
  const platforms = a.platforms.map((p) => ({ x: p.x1 - 1, y: p.y - 1, img: platformCanvas(th.platform, p.x2 - p.x1) }));
  const art = { bg, platforms };
  baked.set(idx, art);
  void canvas;
  return art;
}
