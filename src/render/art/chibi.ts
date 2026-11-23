// Chibi fighter sprites for all 17 jobs, generated in the approved style (GDD 14.3/14.4):
// ~2.3 heads tall, 2x3 dot eyes with a highlight pixel, hair as the silhouette, hue-shifted
// shading, blue-black outline, oversized weapons. 48x48 frames, feet at y 45, facing right.
import { Buf, OUT, hueRotate, ramp, toGray } from "./pix";

type HairStyle = "messy" | "cap" | "bob" | "neat" | "spiky" | "bun" | "hardhat" | "cloud" | "ponytail" | "hood" | "longbun" | "visor" | "slick" | "beret" | "long" | "messy2";
type Weapon = "keyboard" | "selfie" | "net" | "pointer" | "router" | "table" | "wrench" | "umbrella" | "tickets" | "shield" | "notebook" | "tablet" | "binder" | "clock" | "stylus" | "pen" | "laptop";
interface Look {
  skin: string; hair: string; hair2?: string; style: HairStyle; iris: string; top: string; pants: string; accent: string;
  glasses?: "round" | "square" | "sun"; tie?: string; weapon: Weapon; heavy?: boolean;
}

const LOOKS: Look[] = [
  { skin: "#f6cba4", hair: "#3a3355", style: "messy", iris: "#3fae5c", top: "#5aa832", pants: "#3b4a7a", accent: "#9ad64f", glasses: "round", weapon: "keyboard" },
  { skin: "#e8b48a", hair: "#2a2140", hair2: "#ff4f6d", style: "cap", iris: "#ff4f6d", top: "#2d3a8c", pants: "#2a2f45", accent: "#ff2d55", weapon: "selfie" },
  { skin: "#f0c49c", hair: "#6b3d1f", style: "bob", iris: "#3a6b2a", top: "#f4f4ee", pants: "#3d4a2a", accent: "#ffe14d", weapon: "net" },
  { skin: "#d9a77c", hair: "#2a2a2a", style: "neat", iris: "#2a5fa3", top: "#2a5fa3", pants: "#1a3359", accent: "#e8f1ff", glasses: "square", tie: "#e8f1ff", weapon: "pointer" },
  { skin: "#c99a74", hair: "#1b1b1b", style: "spiky", iris: "#39ff7a", top: "#1b2f22", pants: "#151515", accent: "#39ff7a", weapon: "router" },
  { skin: "#e0b088", hair: "#4a2c14", style: "bun", iris: "#4a2c14", top: "#c9a46a", pants: "#3b2a1a", accent: "#8b5a2b", weapon: "table", heavy: true },
  { skin: "#e2ad83", hair: "#d9682a", style: "hardhat", iris: "#3a2a1a", top: "#ff7a1a", pants: "#1d2730", accent: "#ffc21a", weapon: "wrench" },
  { skin: "#f2cfa8", hair: "#ffffff", style: "cloud", iris: "#5b8fd6", top: "#ffd23f", pants: "#3a5a8c", accent: "#ff8fb1", weapon: "umbrella" },
  { skin: "#c98d63", hair: "#2b1b10", style: "ponytail", iris: "#2b1b10", top: "#ffe94a", pants: "#23408e", accent: "#2b6fe0", weapon: "tickets" },
  { skin: "#d6a57e", hair: "#151515", style: "hood", iris: "#ff2b3a", top: "#26272f", pants: "#15161b", accent: "#ff2b3a", weapon: "shield" },
  { skin: "#efc39b", hair: "#7a2e1c", style: "longbun", iris: "#1d6f73", top: "#1d8f93", pants: "#33415c", accent: "#ff6b6b", glasses: "round", weapon: "notebook" },
  { skin: "#e7b893", hair: "#c0a8ff", hair2: "#ffffff", style: "visor", iris: "#ff4fd8", top: "#6a2bd9", pants: "#241a3a", accent: "#ff4fd8", weapon: "tablet" },
  { skin: "#d8a27b", hair: "#3a2e26", style: "slick", iris: "#3a2e26", top: "#8a9099", pants: "#2e3238", accent: "#f7e463", tie: "#7dff3a", weapon: "binder" },
  { skin: "#e9b996", hair: "#5a3a20", style: "bob", iris: "#243a6b", top: "#243a6b", pants: "#141f38", accent: "#ff9f1c", tie: "#ff9f1c", weapon: "clock" },
  { skin: "#f3cfb0", hair: "#ff6b9a", hair2: "#7ad3c4", style: "beret", iris: "#5a6bd6", top: "#7ad3c4", pants: "#5a6bd6", accent: "#ff6b9a", weapon: "stylus" },
  { skin: "#f0d0b0", hair: "#1a1a1a", style: "long", iris: "#3a3a3a", top: "#3a3a4a", pants: "#26262e", accent: "#c0392b", weapon: "pen" },
  { skin: "#e9b48f", hair: "#ff6ad5", hair2: "#26d0ce", style: "messy2", iris: "#26d0ce", top: "#3b2a5a", pants: "#1f1a33", accent: "#26f0e0", glasses: "sun", weapon: "laptop" },
];

// weapons drawn horizontally (handle on the left); long ones are transposed when held down/up
const W: Record<Weapon, { rows: string[]; long: boolean; pal: Record<string, string> }> = {
  keyboard: { long: true, rows: ["wwwwwwwwwwwwww", "gkgkgkgkgkgkgb", "ggkgkgkgkgkgkb", "gkgkgkgkgkgkgb", "bbbbbbbbbbbbbb"], pal: { w: "#fdfdf8", g: "#c8d0e0", k: "#4a5163", b: "#7d8596" } },
  selfie: { long: true, rows: ["..........kkkk", "aaaaaaaaaakPPk", "..........kPPk", "..........kkkk"], pal: { a: "#aab", k: "#222233", P: "#59d3e8" } },
  net: { long: true, rows: ["........wwwww.", ".......w.w.w.w", "tttttttwwwwwww", ".......w.w.w.w", "........wwwww."], pal: { t: "#a5743c", w: "#e6e6e6" } },
  pointer: { long: true, rows: ["tttttttttttttttA", "bbbbbbbbbbbbbbbA"], pal: { t: "#c0c4cc", b: "#7d8596", A: "#ff4b3a" } },
  router: { long: false, rows: ["..k.....k.", "..k.....k.", "..k.....k.", "kkkkkkkkkk", "kAkAkkkkkk", "kkkkkkkkkk"], pal: { k: "#2b2b2b", A: "#39ff7a" } },
  table: { long: true, rows: ["WWWWWWWWWWWWWWWWW", "wwwwwwwwwwwwwwwww", "dd.............dd", "dd.............dd", "dd.............dd"], pal: { W: "#c8935c", w: "#8b5a2b", d: "#5e3820" } },
  wrench: { long: true, rows: ["...........g.g", "tttttttttttggg", "tttttttttttggg", "...........g.g"], pal: { t: "#9aa6ad", g: "#c8d0e0" } },
  umbrella: { long: true, rows: ["tttttttttAAAA..", "tttttttttAAAAAA", "tttttttttAAAA.."], pal: { t: "#555566", A: "#ff8fb1" } },
  tickets: { long: false, rows: ["wwwwwwww", "wRRRRRRw", "wwwwwwww", "wkkkkkkw", "wwwwwwww", "wRRRRRRw", "wwwwwwww"], pal: { w: "#f5f0dc", R: "#cc3333", k: "#999999" } },
  shield: { long: false, rows: ["AAAAAAAA", "AkkkkkkA", "AkkkkkkA", "AkkAAkkA", "AkkAAkkA", "AkkkkkkA", "AkkkkkkA", "AkkkkkkA", ".AkkkkA.", "..AAAA.."], pal: { A: "#ff2b3a", k: "#3a3f4a" } },
  notebook: { long: false, rows: ["wwwwwwww", "wrwwwwbw", "wwwgwwww", "wwwwwrww", "wbwwwwww", "wwwwgwww", "wwwwwwww"], pal: { w: "#f0f0e8", r: "#e74c3c", b: "#3498db", g: "#2ecc71" } },
  tablet: { long: false, rows: ["kkkkkkkk", "kAAAAAAk", "kAwAAAAk", "kAAAAAAk", "kAAAAAAk", "kAAAAAAk", "kkkkkkkk"], pal: { k: "#222233", A: "#ff4fd8", w: "#ffffff" } },
  binder: { long: false, rows: ["......yy", "bbbbbbyy", "wbbbbbbb", "bbbbbbbb", "wbbbbbbb", "bbbbbbbb", "bbbbbbbb"], pal: { b: "#6b7a8f", w: "#dddddd", y: "#f7e463" } },
  clock: { long: false, rows: ["a....a", ".wwww.", "wwkwww", "wwkkww", "wwwwww", ".wwww.", "..c...", "..c...", "..c..."], pal: { a: "#999999", w: "#e8e2d0", k: "#222222", c: "#999999" } },
  stylus: { long: true, rows: ["wwwwwwwwwwwAAwwwA"], pal: { w: "#f2f2f2", A: "#ff6b9a" } },
  pen: { long: true, rows: ["kkkkkkkkkkGG", "kkkkkkkkkkGG"], pal: { k: "#1b1b1b", G: "#c9a227" } },
  laptop: { long: false, rows: ["gggggggggg", "gAAAAAAAAg", "gAAAAAAAAg", "gpAAAAAAyg", "gggggggggg", "bbbbbbbbbb"], pal: { g: "#cfd3da", A: "#26f0e0", p: "#ff6ad5", y: "#ffe066", b: "#7d8596" } },
};

export type Pose = "idle0" | "idle1" | "up" | "swing" | "guard" | "pain" | "burn" | "dash" | "air" | "cast";
const POSES: Pose[] = ["idle0", "idle1", "up", "swing", "guard", "pain", "burn", "dash", "air", "cast"];

function palette(look: Look, p: number): Look {
  if (p === 1) return { ...look, top: hueRotate(look.top, 150), hair: hueRotate(look.hair, 120), hair2: look.hair2 ? hueRotate(look.hair2, 120) : undefined, pants: hueRotate(look.pants, 90) };
  if (p === 2) return { ...look, top: "#d4a72c", pants: "#6b4a12", accent: "#ffe27a" };
  return look;
}

function build(look: Look, pose: Pose): Buf {
  const b = new Buf(48, 48);
  const T = ramp(look.top), H = ramp(look.hair), K = ramp(look.skin), Pn = ramp(look.pants);
  const by = pose === "idle1" || pose === "up" || pose === "burn" || pose === "pain" ? 1 : 0, hy = by;
  const heavy = look.heavy ? 1 : 0;
  const wpn = W[look.weapon];
  const drawWeapon = (where: "down" | "up" | "swing" | "guard") => {
    const rows = wpn.rows, len = rows[0].length, thick = rows.length;
    if (look.weapon === "shield") { b.map(rows, where === "swing" ? 31 : 29, 22 + by, wpn.pal); return; }
    if (wpn.long) {
      if (where === "swing") b.map(rows, 31, 31 + by - (thick >> 1), wpn.pal);
      else if (where === "up") b.map(rows, 30, 23 + by - len + 4, wpn.pal, true, true);
      else if (where === "guard") b.map(rows, 29, 16 + by, wpn.pal, true);
      else b.map(rows, 30, 27 + by, wpn.pal, true);
    } else {
      if (where === "swing") b.map(rows, 32, 26 + by, wpn.pal);
      else if (where === "up") b.map(rows, 29, 10 + by, wpn.pal);
      else if (where === "guard") b.map(rows, 29, 22 + by, wpn.pal);
      else b.map(rows, 30, 32 + by, wpn.pal);
    }
  };
  const wPose = pose === "swing" || pose === "dash" ? "swing" : pose === "up" || pose === "cast" ? "up" : pose === "guard" ? "guard" : "down";
  if (wPose === "down" || wPose === "up") drawWeapon(wPose);

  // legs + shoes
  const legY = pose === "air" ? 36 : 38;
  b.rect(15 - heavy, legY, 5 + heavy, 5, Pn.base); b.rect(21, legY, 5 + heavy, 5, Pn.base); b.rect(20, legY, 1, 2, Pn.base);
  b.rect(19, legY + 1, 1, 4, Pn.shadow); b.rect(25 + heavy, legY + 1, 1, 4, Pn.shadow);
  const shoe = look.style === "messy2" ? "#ff6ad5" : "#c8d0e0";
  b.rect(14 - heavy, legY + 5, 6 + heavy, 3, shoe); b.rect(21, legY + 5, 6 + heavy, 3, shoe);
  b.rect(14 - heavy, legY + 7, 6 + heavy, 1, "#7d8596"); b.rect(21, legY + 7, 6 + heavy, 1, "#7d8596");
  // torso
  b.rect(13 - heavy, 28, 15 + heavy * 2, 10, T.base); b.set(13 - heavy, 28, null); b.set(27 + heavy, 28, null);
  b.rect(24, 29, 4 + heavy, 8, T.shadow); b.rect(13 - heavy, 29, 2, 3, T.light);
  b.ellipse(20.5, 28, 7, 2.2, T.shadow);
  b.rect(13 - heavy, 37, 15 + heavy * 2, 1, T.deep);
  if (look.tie) { b.rect(20, 28, 2, 7, look.tie); b.set(19, 28, "#fdfdf8"); b.set(22, 28, "#fdfdf8"); }
  if (look.weapon === "router") { b.rect(13, 32, 15, 1, look.accent); } // neon trim
  if (look.weapon === "wrench") { b.rect(13, 31, 15, 1, "#fff3c4"); b.rect(13, 34, 15, 1, "#fff3c4"); } // hi-vis stripes
  if (look.weapon === "stylus") { b.set(16, 31, "#ff6b9a"); b.set(23, 33, "#ffe066"); b.set(18, 35, "#5a6bd6"); } // paint dots
  if (look.weapon === "binder") { b.rect(15, 30, 2, 2, "#f7e463"); b.rect(22, 33, 2, 2, "#f7e463"); } // sticky notes
  // arms
  const armY = 29 + by;
  b.rect(10 - heavy, armY, 3, 6, T.base); b.rect(10 - heavy, armY, 1, 6, T.light); b.rect(10 - heavy, armY + 6, 3, 1, T.deep);
  b.ellipse(11.5 - heavy, armY + 8, 1.8, 1.6, K.base);
  if (wPose === "swing") { b.rect(28, 30 + by, 4, 3, T.shadow); drawWeapon("swing"); b.ellipse(32, 31.5 + by, 1.8, 1.6, K.base); }
  else if (wPose === "up") { b.rect(28, 24 + by, 3, 6, T.shadow); b.ellipse(29.5, 23 + by, 1.8, 1.6, K.base); }
  else if (wPose === "guard") { b.rect(27, 29 + by, 3, 4, T.shadow); drawWeapon("guard"); b.ellipse(29, 33 + by, 1.8, 1.6, K.base); }
  else { b.rect(28 + heavy, armY, 3, 6, T.shadow); b.rect(28 + heavy, armY + 6, 3, 1, T.deep); b.ellipse(29.5 + heavy, armY + 8, 1.8, 1.6, K.base); }
  // neck + head
  b.rect(18, 25 + hy, 4, 2, K.shadow);
  if (look.style === "cloud") {
    for (const [cx, cy, r] of [[15, 12, 6], [21, 9, 7], [27, 13, 6], [20, 15, 9], [12, 17, 4], [29, 18, 4]] as const) b.ellipse(cx, cy + hy, r, r * 0.85, "#ffffff");
  } else if (look.style === "hood") {
    b.ellipse(20.5, 15 + hy, 11, 10.5, T.base); b.rect(10, 15 + hy, 22, 10, T.base);
  } else {
    b.ellipse(20.5, 15 + hy, 10.5, 9.5, H.base);
    b.poly([[10, 14 + hy], [13, 14 + hy], [13, 23 + hy], [11, 21 + hy]], H.base);
    b.poly([[28, 14 + hy], [31, 14 + hy], [30, 21 + hy], [28, 23 + hy]], H.base);
  }
  if (look.style === "long" || look.style === "bob" || look.style === "longbun") {
    const down = look.style === "bob" ? 25 : 31;
    b.rect(9, 14 + hy, 4, down - 14, H.base); b.rect(28, 14 + hy, 4, down - 14, H.shadow);
  }
  if (look.style === "ponytail") b.poly([[8, 12 + hy], [12, 10 + hy], [12, 14 + hy], [7, 26 + hy], [5, 24 + hy]], H.base);
  b.ellipse(20.5, 18.5 + hy, 7.6, 6.6, K.base);
  // eyes (2x3 dots with a highlight), or a visor / sunglasses
  const eye = (x0: number, pat: string[]) => pat.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") b.set(x0 + i, 17 + hy + j, ch === "O" ? OUT : ch === "w" ? "#fdfdf8" : ch === "e" ? look.iris : K.base); }));
  if (pose === "burn") { eye(15, ["OOO", "OwO", "OOO"]); eye(24, ["OOO", "OwO", "OOO"]); }
  else if (pose === "pain") { eye(16, ["OK", "KO", "OK"]); eye(24, ["KO", "OK", "KO"]); }
  else if (look.style === "hood") { eye(16, ["ee", "ee", ".."]); eye(24, ["ee", "ee", ".."]); }
  else { eye(16, ["wO", "OO", "eO"]); eye(24, ["wO", "OO", "eO"]); }
  // mouth + blush
  b.rect(14, 23 + hy, 2, 1, "#f08a8a"); b.rect(25, 23 + hy, 2, 1, "#f08a8a");
  if (pose === "pain" || pose === "swing") { b.rect(20, 23 + hy, 2, 2, OUT); b.set(20, 24 + hy, "#f08a8a"); } else b.set(20, 23 + hy, OUT);
  // glasses
  if (look.glasses === "round" || look.glasses === "square") {
    const lens = (x0: number) => { b.rect(x0 + 1, 15 + hy, 5, 1, "#c8d0e0"); b.rect(x0 + 1, 22 + hy, 5, 1, "#7d8596"); b.rect(x0, 16 + hy, 1, 6, "#c8d0e0"); b.rect(x0 + 6, 16 + hy, 1, 6, "#7d8596"); };
    lens(13); lens(22); b.rect(20, 18 + hy, 2, 1, "#c8d0e0");
  }
  if (look.glasses === "sun") { b.rect(14, 17 + hy, 6, 3, "#111111"); b.rect(22, 17 + hy, 6, 3, "#111111"); b.rect(20, 17 + hy, 2, 1, "#111111"); b.set(15, 17 + hy, look.accent); b.set(23, 17 + hy, "#ff6ad5"); }
  // bangs + style details
  const bang = look.style === "cloud" ? "#ffffff" : look.style === "hood" ? T.base : H.base;
  if (look.style === "neat" || look.style === "slick" || look.style === "bob") {
    b.rect(12, 9 + hy, 17, 4, bang); b.rect(12, 13 + hy, look.style === "bob" ? 17 : 6, 1, bang);
  } else if (look.style !== "cloud" && look.style !== "hood") {
    for (const tri of [[[12, 11], [16, 11], [13, 16]], [[15, 11], [19, 11], [17, 15]], [[18, 11], [23, 11], [21, 16]], [[22, 11], [26, 11], [24, 15]], [[25, 11], [29, 11], [28, 16]]] as [number, number][][])
      b.poly(tri.map(([x, y]) => [x, y + hy] as [number, number]), bang);
    b.rect(12, 9 + hy, 17, 3, bang);
  }
  // shading pass on hair, shine band
  if (look.style !== "cloud" && look.style !== "hood") {
    b.each((c, x, y) => {
      if (c === H.base && x >= 26 && y >= 8 + hy && y < 26 + hy) return H.shadow;
      if (c === H.base && y >= 14 + hy && y < 17 + hy && x > 12 && x < 29) return H.shadow;
      return undefined;
    });
    for (const [x, y] of [[13, 9], [14, 8], [15, 8], [16, 7], [17, 7], [18, 7], [19, 7], [12, 10]]) if (b.get(x, y + hy) === H.base) b.set(x, y + hy, H.light);
    if (look.hair2) for (const [x, y] of [[13, 15], [17, 14], [21, 15], [24, 14], [28, 15], [10, 20], [30, 19]]) if (b.get(x, y + hy) === H.base || b.get(x, y + hy) === H.shadow) b.set(x, y + hy, look.hair2);
  }
  b.each((c, x, y) => (c === K.base && (y === 12 + hy || y === 13 + hy || x >= 27) ? K.shadow : undefined));
  switch (look.style) {
    case "messy": case "messy2": for (const [x, y] of [[20, 5], [20, 4], [21, 3], [22, 3], [23, 4], [23, 5]]) b.set(x, y + hy, H.base); break; // ahoge
    case "cap": b.rect(11, 4 + hy, 19, 5, look.accent); b.rect(7, 8 + hy, 8, 2, ramp(look.accent).shadow); b.rect(18, 5 + hy, 3, 2, "#ffffff"); break; // backwards cap
    case "bob": if (look.weapon === "net") { b.rect(12, 9 + hy, 17, 2, look.accent); b.rect(14, 9 + hy, 4, 3, "#cfe8ff"); b.rect(23, 9 + hy, 4, 3, "#cfe8ff"); b.set(15, 6 + hy, look.accent); b.set(26, 6 + hy, look.accent); } break; // goggles + bug clips
    case "spiky": for (const x of [12, 17, 22, 27]) b.poly([[x, 8 + hy], [x + 4, 8 + hy], [x + 2, 1 + hy]], H.base); b.rect(9, 15 + hy, 3, 6, "#333333"); b.rect(30, 15 + hy, 3, 6, "#333333"); b.rect(10, 4 + hy, 1, 11, "#333333"); b.set(10, 3 + hy, look.accent); break;
    case "bun": b.ellipse(20.5, 4 + hy, 3.5, 3, H.base); b.rect(14, 21 + hy, 13, 5, H.base); b.rect(19, 22 + hy, 3, 1, OUT); break; // bun + beard
    case "hardhat": b.ellipse(20.5, 8 + hy, 11, 5.5, look.accent); b.rect(8, 10 + hy, 25, 2, ramp(look.accent).shadow); b.rect(19, 3 + hy, 3, 7, "#fff3c4"); break;
    case "ponytail": b.rect(9, 15 + hy, 2, 5, "#2b6fe0"); b.rect(10, 13 + hy, 22, 1, "#333333"); b.rect(31, 14 + hy, 2, 5, "#2b6fe0"); b.rect(11, 22 + hy, 5, 1, "#333333"); break; // headset
    case "hood": b.rect(14, 21 + hy, 13, 4, "#151515"); break; // mask
    case "longbun": b.ellipse(26, 5 + hy, 3.5, 3, H.base); b.rect(25, 1 + hy, 1, 7, "#f7e463"); break; // bun + pencil
    case "visor": b.rect(13, 16 + hy, 16, 4, look.accent); b.rect(14, 16 + hy, 13, 1, "#ffd6f5"); break;
    case "slick": b.rect(15, 11 + hy, 6, 4, look.accent); b.set(16, 12 + hy, "#ffe066"); break; // sticky note on forehead
    case "beret": b.ellipse(19, 6 + hy, 10, 3.5, "#2a2140"); b.set(22, 2 + hy, "#2a2140"); break;
    case "long": b.rect(31, 9 + hy, 1, 7, look.accent); b.set(31, 16 + hy, "#222222"); break; // pen behind the ear
  }
  b.outline(OUT);
  return b;
}

const cache = new Map<string, HTMLCanvasElement>();
/** fx: "" normal, "gray" Burnout, "white" hit flash, "glow" full-charge outline flash, "sil" impact silhouette */
export function fighterSprite(job: number, palette_: number, pose: Pose, fx = ""): HTMLCanvasElement {
  const key = `${job}.${palette_}.${pose}.${fx}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const b = build(palette(LOOKS[job], palette_), pose);
  const c = b.toCanvas((col) => {
    if (fx === "gray") return toGray(col);
    if (fx === "white") return col === OUT ? OUT : "#ffffff";
    if (fx === "glow") return col === OUT ? "#ffffff" : col;
    if (fx === "sil") return "#ffffff";
    return col;
  });
  cache.set(key, c);
  return c;
}
export function preloadFighters(jobs: number[], palettes: number[]) {
  for (let i = 0; i < jobs.length; i++) for (const p of POSES) fighterSprite(jobs[i], palettes[i], p);
}

/** 32x32 face icon / bust portrait as a data URL for the DOM menus (scaled with pixelated CSS). */
const faces = new Map<string, string>();
export function faceIcon(job: number, palette_ = 0, bg = "#2a3242"): string {
  const key = `${job}.${palette_}.${bg}`;
  const hit = faces.get(key);
  if (hit) return hit;
  const src = fighterSprite(job, palette_, "idle0");
  const c = document.createElement("canvas"); c.width = 32; c.height = 32;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  g.fillStyle = bg; g.fillRect(0, 0, 32, 32);
  g.drawImage(src, 4, 0, 32, 32, 0, 2, 32, 32);
  const url = c.toDataURL();
  faces.set(key, url);
  return url;
}
export function fullBodyIcon(job: number, palette_ = 0): string {
  const key = `body.${job}.${palette_}`;
  const hit = faces.get(key);
  if (hit) return hit;
  const url = fighterSprite(job, palette_, "idle0").toDataURL();
  faces.set(key, url);
  return url;
}
