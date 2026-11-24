// In-match HUD drawn on a 2D canvas over the 3D view (GAME_DESIGN.md 1.0: icons and numbers, few words).
import * as C from "../sim/constants";
import { KITS } from "../sim/data/kits.gen";
import { PHASE_FIGHT, PHASE_INTRO, PHASE_MATCH_END, PHASE_ROUND_END } from "../sim/sim";
import { S, type State } from "../sim/types";
import { keyLabel, type Settings } from "../ui/settings";

/** Short glyphs shown on skill buttons, per job. Jobs without art yet show 1/2/3. */
export const SKILL_GLYPHS: Record<number, [string, string, string]> = {
  0: [";", "{ }", "↻"],
  5: ["←", "LOCK", "DROP"],
};

export interface HudInput {
  s: State; local: number; names: [string, string]; palettes: [number, number]; mode: string; settings: Settings;
  /** Sim position + height in world units → screen pixels. */
  project: (x: number, y: number, h: number) => [number, number];
  portrait: (job: number, palette: number) => string;
}

export class Hud {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  w = 0; h = 0; private dpr = 1;
  private nums: { x: number; y: number; v: number; o: number; fr: number }[] = [];
  private imgs = new Map<string, HTMLImageElement>();
  touchButtons: HTMLElement[] = [];
  touchMode = false;

  constructor(host: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "hud";
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
  }
  resize(w: number, h: number) {
    this.dpr = Math.min(devicePixelRatio, 2); this.w = w; this.h = h;
    this.canvas.width = w * this.dpr; this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
  }
  /** Queues a floating damage number at a sim position. */
  number(x: number, y: number, v: number, o: number, fr: number) { this.nums.push({ x, y, v, o, fr }); if (this.nums.length > 30) this.nums.shift(); }

  private img(url: string) {
    let im = this.imgs.get(url);
    if (!im) { im = new Image(); im.src = url; this.imgs.set(url, im); }
    return im;
  }

  draw(o: HudInput) {
    const x = this.ctx, s = o.s;
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.clearRect(0, 0, this.w, this.h);
    const u = Math.min(this.w / 1280, this.h / 720) * (o.settings.bigText ? 1.15 : 1);
    const cb = o.settings.colorblind;
    const sideColor = (i: number) => (o.local < 0 ? (i === 0 ? (cb ? "#3fb8ff" : "#5fe08a") : (cb ? "#ff9f1c" : "#ff7a6b")) : i === o.local ? (cb ? "#3fb8ff" : "#5fe08a") : (cb ? "#ff9f1c" : "#ff7a6b"));

    const rr = (X: number, Y: number, W: number, H: number, r: number) => { x.beginPath(); x.roundRect(X, Y, W, H, r); };
    const text = (t: string, X: number, Y: number, size: number, fill: string, align: CanvasTextAlign = "center", stroke = size * 0.18) => {
      x.font = `${size}px 'Lilita One', 'Arial Rounded MT Bold', sans-serif`; x.textAlign = align; x.textBaseline = "middle"; x.lineJoin = "round";
      x.lineWidth = stroke; x.strokeStyle = "#1a1636"; x.strokeText(t, X, Y); x.fillStyle = fill; x.fillText(t, X, Y);
    };
    const bar = (X: number, Y: number, W: number, H: number, frac: number, c1: string, c2: string, rev: boolean) => {
      rr(X, Y, W, H, H / 2); x.fillStyle = "#1a1636"; x.fill();
      const iw = Math.max(0, (W - 6) * frac);
      if (iw > 0) { const g = x.createLinearGradient(0, Y, 0, Y + H); g.addColorStop(0, c1); g.addColorStop(1, c2); rr(rev ? X + W - 3 - iw : X + 3, Y + 3, iw, H - 6, (H - 6) / 2); x.fillStyle = g; x.fill(); }
    };

    // ---- top: portraits, HP, Motivation ----
    for (const i of [0, 1] as const) {
      const f = s.f[i], left = i === 0, P = 76 * u, M = 18 * u;
      const px = left ? M : this.w - M - P, py = 14 * u;
      rr(px, py, P, P, 16 * u); const gg = x.createLinearGradient(0, py, 0, py + P); gg.addColorStop(0, "#fff1a6"); gg.addColorStop(1, "#f08a1c"); x.fillStyle = gg; x.fill();
      x.lineWidth = 4 * u; x.strokeStyle = "#1a1636"; x.stroke();
      rr(px + 5 * u, py + 5 * u, P - 10 * u, P - 10 * u, 12 * u); x.fillStyle = sideColor(i); x.fill();
      const im = this.img(o.portrait(f.job, o.palettes[i] ?? 0));
      if (im.complete && im.naturalWidth) { x.save(); rr(px + 5 * u, py + 5 * u, P - 10 * u, P - 10 * u, 12 * u); x.clip(); x.drawImage(im, px + 5 * u, py + 5 * u, P - 10 * u, P - 10 * u); x.restore(); }
      const BW = Math.min(360 * u, this.w * 0.3), bx = left ? px + P + 10 * u : px - 10 * u - BW;
      const name = (o.names[i] || (o.mode === "attract" ? KITS[f.job].name : `P${i + 1}`)).slice(0, 16);
      text(name, left ? bx : bx + BW, py + 12 * u, 20 * u, "#ffffff", left ? "left" : "right", 4 * u);
      const hpF = f.hp / C.HP_MAX, mine = sideColor(i);
      bar(bx, py + 26 * u, BW, 26 * u, hpF, mine === "#5fe08a" ? "#9dffb4" : mine === "#3fb8ff" ? "#a8dcff" : mine === "#ff9f1c" ? "#ffd08a" : "#ffa79c", mine, !left);
      const burnt = f.burnout > 0;
      bar(left ? bx : bx + BW * 0.35, py + 56 * u, BW * 0.65, 13 * u, burnt ? f.burnout / C.BURNOUT_FRAMES : f.mot / C.MOT_MAX, burnt ? "#a9a6c6" : "#fff1a6", burnt ? "#6d6a8a" : "#ffc63a", !left);
      if (burnt) text("BURNOUT", left ? bx + BW * 0.33 : bx + BW * 0.68, py + 63 * u, 12 * u, "#ffffff", "center", 3 * u);
      // round pips
      for (let k = 0; k < 2; k++) {
        x.beginPath(); x.arc(this.w / 2 + (left ? -1 : 1) * (60 + k * 22) * u, py + 40 * u, 8 * u, 0, 7);
        x.fillStyle = s.wins[i] > k ? "#ffd34d" : "#3b3570"; x.fill(); x.lineWidth = 3 * u; x.strokeStyle = "#1a1636"; x.stroke();
      }
    }
    // timer hexagon
    {
      const cx = this.w / 2, cy = 46 * u, r = 38 * u;
      x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath();
      const g = x.createLinearGradient(0, cy - r, 0, cy + r); g.addColorStop(0, s.ot ? "#ffb0a0" : "#fff1a6"); g.addColorStop(1, s.ot ? "#e5383b" : "#f08a1c");
      x.fillStyle = g; x.fill(); x.lineWidth = 5 * u; x.strokeStyle = "#1a1636"; x.stroke();
      text(String(Math.ceil(s.timer / 60)), cx, cy, 36 * u, "#ffffff");
      if (s.ot && s.phase === PHASE_FIGHT) text("OVERTIME · first hit wins", cx, cy + 56 * u, 20 * u, "#ffb0a0");
    }

    // ---- over-head: "YOU" tag and status icons ----
    for (const i of [0, 1] as const) {
      const f = s.f[i];
      if (f.hp <= 0) continue;
      const hgt = f.air > 0 ? 2.3 + Math.sin((1 - f.air / f.air0) * Math.PI) * 2.0 : 2.3;
      const [hx, hy] = o.project(f.x, f.y, hgt);
      if (i === o.local) text("YOU", hx, hy - 6 * u, 16 * u, sideColor(i), "center", 4 * u);
      const icons: [string, string][] = [];
      if (f.st[S.STUN] > 0) icons.push(["★", "#ffd34d"]);
      if (f.st[S.ROOT] > 0) icons.push(["⊗", "#5fe08a"]);
      if (f.st[S.SLOW_T] > 0) icons.push(["▼", "#3fb8ff"]);
      if (f.st[S.SILENCE] > 0) icons.push(["✕", "#a86bff"]);
      if (f.st[S.WEAK] > 0) icons.push(["↓", "#ff5a4d"]);
      if (f.st[S.SHIELD] > 0) icons.push(["◆", "#7fe6ff"]);
      if (f.job === 0 && f.res[1]) icons.push(["{}", "#ffc63a"]); // Compiler ready
      icons.forEach(([g, c], k) => {
        const ix = hx + (k - (icons.length - 1) / 2) * 30 * u, iy = hy + 16 * u;
        rr(ix - 13 * u, iy - 13 * u, 26 * u, 26 * u, 7 * u); x.fillStyle = "#1a1636"; x.fill();
        rr(ix - 10 * u, iy - 10 * u, 20 * u, 20 * u, 5 * u); x.fillStyle = c; x.fill();
        text(g, ix, iy + 1 * u, 14 * u, "#ffffff", "center", 3 * u);
      });
    }

    // ---- damage numbers ----
    this.nums = this.nums.filter((n) => s.frame - n.fr < 45 && s.frame >= n.fr);
    for (const n of this.nums) {
      const p = (s.frame - n.fr) / 45, [nx, ny] = o.project(n.x, n.y, 2.0 + p * 1.2);
      x.globalAlpha = 1 - Math.max(0, p - 0.6) * 2.5;
      const big = n.v >= 60;
      text(String(n.v), nx, ny, (big ? 40 : 28) * u * (1 + (p < 0.15 ? (0.15 - p) * 3 : 0)), big ? "#ffd34d" : "#ffffff", "center", 6 * u);
      x.globalAlpha = 1;
    }

    // ---- banners ----
    const banner = (t: string, sub = "", color = "#ffd34d") => {
      text(t, this.w / 2, this.h * 0.42, 84 * u, color, "center", 12 * u);
      if (sub) text(sub, this.w / 2, this.h * 0.42 + 64 * u, 28 * u, "#ffffff", "center", 6 * u);
    };
    const who = (i: number) => (i === o.local ? "You" : o.names[i] || `P${i + 1}`);
    if (s.phase === PHASE_INTRO) banner(s.phaseT > 40 ? (s.finalRound ? "FINAL ROUND" : `ROUND ${s.round}`) : "FIGHT!");
    else if (s.phase === PHASE_ROUND_END) {
      const ko = s.f[0].hp <= 0 || s.f[1].hp <= 0;
      banner(ko ? "KO!" : "TIME!", s.roundWinner === 2 ? "Draw" : `${who(s.roundWinner)} ${s.roundWinner === o.local ? "take" : "takes"} the round`);
    } else if (s.phase === PHASE_MATCH_END && o.mode === "attract") banner(s.matchWinner === 2 ? "DRAW" : `${KITS[s.f[s.matchWinner].job].name.toUpperCase()} WINS`);

    // ---- skill bar (keyboard/mouse/gamepad) or touch cooldowns ----
    if (o.local >= 0 && s.phase !== PHASE_MATCH_END) this.skills(o, u, text, rr);
  }

  private skills(o: HudInput, u: number, text: (t: string, X: number, Y: number, size: number, fill: string, align?: CanvasTextAlign, stroke?: number) => void, rr: (X: number, Y: number, W: number, H: number, r: number) => void) {
    const x = this.ctx, f = o.s.f[o.local], kit = KITS[f.job], glyphs = SKILL_GLYPHS[f.job] ?? ["1", "2", "3"];
    const keys = [o.settings.keys.s1[0], o.settings.keys.s2[0], o.settings.keys.s3[0]];
    if (this.touchMode) {
      this.touchButtons.forEach((el, k) => {
        if (!el) return;
        const cd = f.cd[k] / kit.skills[k].cd;
        el.style.setProperty("--cd", String(cd));
        el.classList.toggle("low", f.mot < kit.skills[k].cost || f.burnout > 0);
        const g = el.querySelector(".lbl"); if (g && g.textContent !== glyphs[k]) g.textContent = glyphs[k];
        const t = el.querySelector(".cdt"); if (t) t.textContent = f.cd[k] > 0 ? String(Math.ceil(f.cd[k] / 60)) : "";
      });
      return;
    }
    const B = 64 * u, gap = 12 * u, X0 = this.w / 2 - (B * 3 + gap * 2) / 2, Y = this.h - B - 18 * u;
    for (let k = 0; k < 3; k++) {
      const sk = kit.skills[k], X = X0 + k * (B + gap), cd = f.cd[k] / sk.cd, poor = f.mot < sk.cost || f.burnout > 0;
      rr(X, Y, B, B, 14 * u); x.fillStyle = "#1a1636"; x.fill();
      rr(X + 4 * u, Y + 4 * u, B - 8 * u, B - 8 * u, 10 * u);
      const g = x.createLinearGradient(0, Y, 0, Y + B); g.addColorStop(0, poor ? "#6d6a8a" : "#9b8cff"); g.addColorStop(1, poor ? "#45425e" : "#5b45d6"); x.fillStyle = g; x.fill();
      if (cd > 0) { x.save(); rr(X + 4 * u, Y + 4 * u, B - 8 * u, B - 8 * u, 10 * u); x.clip(); x.beginPath(); x.moveTo(X + B / 2, Y + B / 2); x.arc(X + B / 2, Y + B / 2, B, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cd); x.closePath(); x.fillStyle = "rgba(26,22,54,0.65)"; x.fill(); x.restore(); }
      text(cd > 0 ? String(Math.ceil(f.cd[k] / 60)) : glyphs[k], X + B / 2, Y + B / 2, (glyphs[k].length > 2 && cd === 0 ? 16 : 26) * u, "#ffffff", "center", 5 * u);
      text(keyLabel(keys[k] ?? ""), X + 10 * u, Y + 10 * u, 13 * u, "#fff1a6", "center", 3 * u);
      text(String(sk.cost / 100), X + B - 11 * u, Y + B - 10 * u, 13 * u, poor ? "#ffb0a0" : "#ffe27a", "center", 3 * u);
    }
  }
}
