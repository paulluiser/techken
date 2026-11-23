// Item icons (16x16 bold silhouettes, 3 tones + a shine pixel) and summon sprites.
import { Buf, OUT, ramp } from "./pix";

const ICONS: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  coffee: { rows: [".WWWWWWW...", ".WbbbbbWWW.", ".WWWWWWW..W", ".WRRRRRW..W", ".WRwRRRWWW.", ".WRRRRRW...", ".gWWWWWg...", "..ggggg...."], pal: { W: "#fdfdf8", b: "#6b3e22", R: "#e8432e", w: "#ffffff", g: "#c8d0e0" } },
  pizza: { rows: ["YYYYYYYYYY", ".YRYYYRYY.", ".YYYYYYYY.", "..YYRYYY..", "..YYYYYY..", "...YRYY...", "...YYYY...", "....YY...."], pal: { Y: "#ffd23f", R: "#e8432e" } },
  energy: { rows: ["..ss..", ".GGGG.", ".GwGG.", ".GGGG.", ".GkGG.", ".GkGG.", ".GGGG.", ".GGGG.", ".ssss."], pal: { s: "#c8d0e0", G: "#39ff7a", w: "#ffffff", k: "#1b1630" } },
  invite: { rows: ["R.R..R.R", "RRRRRRRR", "wwwwwwww", "wkwkwkww", "wwwwwwww", "wkwkwkww", "wwwwwwww"], pal: { R: "#59d3e8", w: "#fdfdf8", k: "#7d8596" } },
  duck: { rows: ["...YYY...", "..YYkYO..", "..YYYYOO.", ".YYYYY...", "YYYYYYYY.", "YYwYYYYY.", ".YYYYYY.."], pal: { Y: "#ffe066", k: "#1b1630", O: "#ff9f1c", w: "#ffffff" } },
  headphones: { rows: ["..BBBBB..", ".B.....B.", "B.......B", "B.......B", "AA.....AA", "AA.....AA", "AA.....AA"], pal: { B: "#3b4a7a", A: "#59d3e8" } },
  stackoverflow: { rows: ["........O", ".......O.", "....OOO..", "..OOO....", "OOOO.....", "g.......g", "g.OOOOO.g", "ggggggggg"], pal: { O: "#f48024", g: "#bcbbbb" } },
  keyboard: { rows: ["wwwwwwwwww", "gkgkgkgkgb", "ggkgkgkgkb", "gkgkgkgkgb", "bbbbbbbbbb"], pal: { w: "#fdfdf8", g: "#c8d0e0", k: "#4a5163", b: "#7d8596" } },
  raise: { rows: ["...GG...", "..GGGG..", ".GG$$GG.", ".G$GG$G.", ".GG$$GG.", ".G$GG$G.", "..GGGG..", "........"], pal: { G: "#5cb043", $: "#fff1a8" } },
  chair: { rows: ["..BBBB..", "..BwBB..", "..BBBB..", "..BBBB..", "BBBBBBBB", "...kk...", "..kkkk..", ".k.k.k.."], pal: { B: "#6b7a8f", w: "#c8d0e0", k: "#2a2a2a" } },
  cert: { rows: ["wwwwwwwww", "wkkkkkkkw", "wwwwwwwww", "wkkkkkwww", "wwwwwwRRw", "wwwwwwRRw", "......R.R"], pal: { w: "#f5f0dc", k: "#7d8596", R: "#c09af0" } },
  pr: { rows: ["P.......", "P....P..", "P...P...", "PPPP....", "P.......", "P.......", "P......."], pal: { P: "#8a5ad6" } },
  pto: { rows: ["..RRRRR..", ".RwRRwRR.", "RRRRRRRRR", "....k....", "....k....", "....k....", "YYYYkYYYY", "YYYYYYYYY"], pal: { R: "#26d0ce", w: "#ffffff", k: "#6b4226", Y: "#ffe066" } },
  promotion: { rows: ["YY.YYYY.YY", "Y.YYwYYY.Y", ".YYYYYYYY.", "..YYYYYY..", "...YYYY...", "....YY....", "...YYYY...", "..kkkkkk.."], pal: { Y: "#ffd23f", w: "#ffffff", k: "#6b4226" } },
};
const ITEM_KEYS = ["coffee", "pizza", "energy", "invite", "duck", "headphones", "stackoverflow", "keyboard", "raise", "chair", "cert", "pr", "pto", "promotion"];

const iconCache = new Map<number, HTMLCanvasElement>();
export function itemIcon(kind: number): HTMLCanvasElement {
  const hit = iconCache.get(kind);
  if (hit) return hit;
  const d = ICONS[ITEM_KEYS[kind]] ?? ICONS.pr;
  const w = Math.max(...d.rows.map((r) => r.length));
  const b = new Buf(w + 2, d.rows.length + 2);
  b.map(d.rows, 1, 1, d.pal);
  b.outline(OUT);
  const c = b.toCanvas();
  iconCache.set(kind, c);
  return c;
}

// ---------- summons and placed objects (keyed by behavior id) ----------
function person(top: string, hair: string, angry: boolean, tall = false): Buf {
  const h = tall ? 34 : 26, b = new Buf(20, h + 2);
  const T = ramp(top), S = ramp("#e0b088");
  const headY = 1, headH = tall ? 12 : 10;
  b.ellipse(10, headY + headH / 2 + 1, 6, headH / 2, S.base);
  b.rect(4, headY, 12, 4, hair);
  b.rect(6, headY + 5, 2, 2, "#1b1630"); b.rect(12, headY + 5, 2, 2, "#1b1630");
  if (angry) { b.rect(5, headY + 4, 3, 1, "#1b1630"); b.rect(12, headY + 4, 3, 1, "#1b1630"); b.rect(8, headY + 8, 4, 1, "#9a1f1f"); }
  b.rect(4, headY + headH + 1, 12, tall ? 13 : 9, T.base); b.rect(12, headY + headH + 1, 4, tall ? 13 : 9, T.shadow);
  if (tall) { b.rect(9, headY + headH + 1, 2, 8, "#ff4b3a"); }
  b.rect(5, h - 4, 4, 4, "#2a2f45"); b.rect(11, h - 4, 4, 4, "#2a2f45");
  b.outline(OUT);
  return b;
}
const summonCache = new Map<string, HTMLCanvasElement>();
export function entitySprite(beh: string): HTMLCanvasElement | null {
  if (summonCache.has(beh)) return summonCache.get(beh)!;
  let b: Buf | null = null;
  switch (beh) {
    case "ts.customer": b = person("#7a8aa8", "#6b3e22", true); break;
    case "ts.mob": b = person("#a87a7a", "#2a2a2a", true); break;
    case "ts.manager": b = person("#2a2f45", "#d9c08a", true, true); break;
    case "do.pod": b = person("#ff7a1a", "#ffc21a", false); break;
    case "qa.bug": b = new Buf(12, 10); b.map([".k..k.", "..kk..", ".GGGG.", "GwGGGG", ".GGGG.", "k.kk.k"], 3, 2, { k: "#1b1630", G: "#5cb043", w: "#ffffff" }); b.outline(OUT); break;
    case "ai.bot": b = new Buf(16, 16); b.rect(1, 2, 14, 13, "#6a2bd9"); b.rect(1, 2, 14, 2, "#9a6af0"); b.rect(5, 6, 6, 5, "#1b1630"); b.rect(7, 7, 3, 3, "#ff4fd8"); b.rect(7, 0, 2, 2, "#c0a8ff"); b.outline(OUT); break;
    case "ai.drone": b = new Buf(10, 8); b.rect(1, 2, 8, 4, "#c0a8ff"); b.rect(0, 1, 3, 1, "#7d8596"); b.rect(7, 1, 3, 1, "#7d8596"); b.set(4, 3, "#ff4fd8"); b.outline(OUT); break;
    case "md.turret": b = new Buf(12, 16); b.rect(2, 0, 8, 12, "#222233"); b.rect(3, 1, 6, 9, "#59d3e8"); b.rect(5, 12, 2, 4, "#aaaabb"); b.outline(OUT); break;
    case "hz.cat": b = new Buf(18, 12); b.map(["k.k.........", "kkk.........", "kkkkkkkkkkk.", "kwkkkkkkkkkk", "kkkkkkkkkkk.", ".k.k...k.k.."], 2, 3, { k: "#3a3a4a", w: "#ffe066" }); b.outline(OUT); break;
    case "na.router": b = new Buf(14, 12); b.rect(1, 6, 12, 5, "#2b2b2b"); b.rect(3, 0, 1, 6, "#3a3a3a"); b.rect(10, 0, 1, 6, "#3a3a3a"); b.set(4, 8, "#39ff7a"); b.set(6, 8, "#39ff7a"); b.outline(OUT); break;
    case "ce.anchor": b = new Buf(18, 14); b.ellipse(9, 7, 8, 5, "#f2f6ff"); b.rect(7, 5, 4, 4, "#5b8fd6"); b.outline(OUT); break;
    case "qa.egg": b = new Buf(12, 8); b.ellipse(6, 4, 5, 3.5, "#fdfdf8"); b.set(5, 3, "#8a9a2a"); b.outline(OUT); break;
    case "tw.mine": b = new Buf(10, 10); b.map(["..k..", "k.k.k", ".kkk.", "k.k.k", "..k.."], 2, 2, { k: "#1b1b1b" }); break;
    case "cs.honeypot": b = new Buf(14, 14); b.rect(2, 2, 10, 10, "#ffd23f"); b.rect(3, 3, 3, 3, "#ffffff"); b.outline(OUT); break;
    default: return null;
  }
  const c = b.toCanvas();
  summonCache.set(beh, c);
  return c;
}
