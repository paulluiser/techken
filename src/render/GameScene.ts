// Draws the sim state. The world is composited onto one 384x216 canvas each frame (crisp
// pixels, no fractional scaling); HUD bars and text sit on top as Phaser objects.
import * as Phaser from "phaser";
import * as C from "../sim/constants";
import { ARENAS } from "../sim/arenas";
import { chargeFull, jobOf, motMax, setOf } from "../sim/core";
import { JOB_CODES } from "../sim/registry";
import { OT_FRAMES, PHASE_FIGHT, PHASE_MATCH_END, PHASE_ROUND_END, type State } from "../sim/sim";
import { ENV, K, S } from "../sim/types";
import type { Driver } from "../game/driver";
import { arenaArt } from "./art/arenas";
import { fighterSprite, type Pose } from "./art/chibi";
import { entitySprite, itemIcon } from "./art/icons";
import { numHex } from "./art/pix";

export interface RenderOpts { dmgNumbers: boolean; reduceFlash: boolean; colorblind: boolean; shake: boolean }

const FONT = '"Press Start 2P", monospace';
const P = (n: number) => Math.round(n / C.SUB);

interface Floater { x: number; y: number; text: Phaser.GameObjects.Text; born: number }
interface Spark { x: number; y: number; t0: number; big: boolean }

export class GameScene extends Phaser.Scene {
  private tex!: Phaser.Textures.CanvasTexture;
  private ctx!: CanvasRenderingContext2D;
  private g!: Phaser.GameObjects.Graphics;
  private tTimer!: Phaser.GameObjects.Text;
  private tName: Phaser.GameObjects.Text[] = [];
  private tTag: Phaser.GameObjects.Text[] = [];
  private tSkill: Phaser.GameObjects.Text[][] = [];
  private tBanner!: Phaser.GameObjects.Text;
  private tSub!: Phaser.GameObjects.Text;
  private tWait!: Phaser.GameObjects.Text;
  private tArena!: Phaser.GameObjects.Text;
  private floaters: Floater[] = [];
  private sparks: Spark[] = [];
  private lastHit = [0, 0];
  private shakeUntil = 0;
  private impactAt = -99;

  constructor(private driver: Driver, private opts: () => RenderOpts) { super("game"); }

  create() {
    this.tex = this.textures.createCanvas("world", C.W, C.H)!;
    this.ctx = this.tex.getContext();
    this.ctx.imageSmoothingEnabled = false;
    this.add.image(0, 0, "world").setOrigin(0, 0);
    this.g = this.add.graphics();
    const t8 = { fontFamily: FONT, fontSize: "8px", color: "#e9e6f2", stroke: "#1b1630", strokeThickness: 2 };
    this.tTimer = this.add.text(C.W / 2, 5, "90", { fontFamily: FONT, fontSize: "16px", color: "#fdfdf8", stroke: "#1b1630", strokeThickness: 3 }).setOrigin(0.5, 0);
    this.tName = [this.add.text(8, 3, "", t8), this.add.text(C.W - 8, 3, "", t8).setOrigin(1, 0)];
    this.tTag = [0, 1].map(() => this.add.text(0, 0, "", t8).setOrigin(0.5, 1));
    this.tSkill = [0, 1].map((i) => [0, 1, 2].map((k) => this.add.text(i === 0 ? 8 + k * 46 : C.W - 8 - (2 - k) * 46, 33, "", t8).setOrigin(i === 0 ? 0 : 1, 0)));
    this.tBanner = this.add.text(C.W / 2, 74, "", { fontFamily: FONT, fontSize: "16px", color: "#ffe066", stroke: "#1b1630", strokeThickness: 4 }).setOrigin(0.5);
    this.tSub = this.add.text(C.W / 2, 96, "", { ...t8, strokeThickness: 3 }).setOrigin(0.5);
    this.tWait = this.add.text(C.W / 2, 196, "", { ...t8, color: "#ff5a5a" }).setOrigin(0.5);
    this.tArena = this.add.text(C.W / 2, 208, "", { ...t8, color: "#c8d0e0" }).setOrigin(0.5, 1);
  }

  update() { this.draw(this.driver.state); }

  // ---------------- world (canvas) ----------------
  private pose(s: State, i: number): { pose: Pose; fx: string } {
    const f = s.f[i], o = this.opts();
    let pose: Pose = (s.frame >> 5) & 1 ? "idle1" : "idle0";
    if (f.burnout > 0 || f.st[S.RATE_LIMIT] > 0) return { pose: "burn", fx: "gray" };
    if (f.st[S.STUN] > 0 || f.hitstun > 0) pose = "pain";
    else if (f.guarding) pose = "guard";
    else if (f.dash > 0) pose = "dash";
    else if (f.atk > 0) pose = f.atk <= C.ATK_STARTUP ? "up" : "swing";
    else if (f.charging) pose = "up";
    else if (f.st[S.CAST] > 0 || f.st[S.AIM_K] > 0) pose = "cast";
    else if (!f.onGround) pose = "air";
    let fx = "";
    if (!o.reduceFlash && f.flash > 0 && f.flash % 2 === 0) fx = "white";
    else if (f.charging && f.charge >= chargeFull(s, i) && (s.frame >> 2) & 1) fx = "glow";
    return { pose, fx };
  }

  private drawFighterAt(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, facing: number, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (facing < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(img, -21, y - 45); }
    else ctx.drawImage(img, x - 20, y - 45);
    ctx.restore();
  }

  private drawWorld(s: State, sx: number, sy: number) {
    const ctx = this.ctx, arena = ARENAS[s.cfg.arena], art = arenaArt(s.cfg.arena), o = this.opts();
    ctx.clearRect(0, 0, C.W, C.H);
    ctx.drawImage(art.bg, Math.round(sx * 0.5), Math.round(sy * 0.5));
    art.platforms.forEach((p, n) => {
      if (n === 1 && s.cfg.hazards && arena.id === "retreat" && s.hz[3] > 0) return; // trust fall
      ctx.drawImage(p.img, p.x + sx, p.y + sy);
    });
    if (s.cfg.hazards) {
      const h = s.hz;
      if (arena.id === "servers") { ctx.fillStyle = h[2] ? "#ff7a1a" : "#59d3e8"; ctx.fillRect(180 + sx, arena.floor - (h[2] ? 30 : 2), 24, h[2] ? 30 : 2); }
      if (arena.id === "basement") { ctx.fillStyle = "#3e8a3a"; for (const x0 of [64, 256]) for (let x = x0; x < x0 + 64; x += 3) ctx.fillRect(x + sx, arena.floor - 2 - ((x >> 2) & 1), 2, 2); }
      if (arena.id === "expo") { ctx.fillStyle = "rgba(255,241,168,0.16)"; ctx.fillRect(h[1] - 25, 0, 50, arena.floor); }
      if (arena.id === "retreat") {
        const fl = (s.frame >> 2) & 3, x = 312 + sx, by = arena.floor;
        ctx.fillStyle = "#6b4226"; ctx.fillRect(x - 2, by - 3, 16, 3);
        ctx.fillStyle = "#e8432e"; ctx.fillRect(x, by - 12 - fl, 12, 9 + fl);
        ctx.fillStyle = "#ff9f1c"; ctx.fillRect(x + 2, by - 9 - (fl & 1), 8, 6);
        ctx.fillStyle = "#ffe066"; ctx.fillRect(x + 4, by - 7, 4, 4);
      }
      if (arena.id === "cloud" && h[1] > 0) { ctx.fillStyle = "rgba(255,255,255,0.4)"; for (let k = 0; k < 6; k++) ctx.fillRect((((s.frame * 4 * h[2] + k * 70) % 384) + 384) % 384, 40 + k * 24, 30, 1); }
    }
    for (const it of s.items) {
      if (it.life < 120 && (s.frame >> 2) & 1) continue;
      const ic = itemIcon(it.kind);
      ctx.drawImage(ic, P(it.x) - (ic.width >> 1) + sx, P(it.y) - ic.height - 2 - ((s.frame >> 3) & 1) + sy);
    }
    for (const e of s.ents) {
      const x = P(e.x) + sx, y = P(e.y) + sy, w = e.w, h = e.h;
      const col = e.o === ENV ? "#e9e6f2" : numHex(jobOf(s.f[e.o]).color);
      if (e.b === "ai.decoy") { const f = s.f[e.o]; this.drawFighterAt(ctx, fighterSprite(f.job, this.driver.view.palettes[e.o] ?? 0, "idle0"), x, y, f.facing, 0.55); continue; }
      const spr = entitySprite(e.b);
      if (spr) {
        const flip = e.k !== K.ANCHOR && (e.p3 < 0 || e.vx < 0);
        ctx.save();
        if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(spr, -(spr.width >> 1), y - spr.height + 1); }
        else ctx.drawImage(spr, x - (spr.width >> 1), y - spr.height + 1);
        ctx.restore();
        continue;
      }
      switch (e.k) {
        case K.PROJ:
          ctx.fillStyle = "#1b1630"; ctx.fillRect(x - (w >> 1) - 1, y - (h >> 1) - 1, w + 2, h + 2);
          ctx.fillStyle = e.b === "basic.shot" ? "#fdfdf8" : col; ctx.fillRect(x - (w >> 1), y - (h >> 1), w, h);
          ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillRect(x - (w >> 1), y - (h >> 1), Math.max(1, w >> 2), Math.max(1, h >> 2));
          break;
        case K.SUMMON: ctx.fillStyle = "#1b1630"; ctx.fillRect(x - (w >> 1) - 1, y - h - 1, w + 2, h + 2); ctx.fillStyle = col; ctx.fillRect(x - (w >> 1), y - h, w, h); break;
        case K.ZONE:
          if (e.b === "ce.rain") {
            ctx.fillStyle = "#f2f6ff"; ctx.fillRect(x - (w >> 1), y - h, w, h); ctx.fillStyle = "#c8d5f5"; ctx.fillRect(x - (w >> 1), y - 3, w, 3);
            ctx.fillStyle = "#7fb4ff"; for (let k = 0; k < w; k += 5) ctx.fillRect(x - (w >> 1) + k, y + ((s.frame * 3 + k * 7) % 40), 1, 4);
          } else { ctx.fillStyle = e.o === ENV ? "rgba(255,255,255,0.4)" : col + "55"; ctx.fillRect(x - (w >> 1), y - h, w, h); }
          break;
        case K.WALL: ctx.fillStyle = "#1b1630"; ctx.fillRect(x - (w >> 1) - 1, y - h - 1, w + 2, h + 1); ctx.fillStyle = col; ctx.fillRect(x - (w >> 1), y - h, w, h); ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(x - (w >> 1), y - h, w, 2); break;
        case K.PLATFORM: ctx.fillStyle = "#f2f6ff"; ctx.fillRect(x - (w >> 1), y - h, w, h); ctx.fillStyle = "#c8d5f5"; ctx.fillRect(x - (w >> 1), y, w, 2); break;
        case K.TRAP: ctx.fillStyle = "#fdfdf8"; ctx.fillRect(x - (w >> 1), y - h, w, h); break;
        case K.ANCHOR: ctx.fillStyle = "#f2f6ff"; ctx.fillRect(x - (w >> 1), y - h, w, h); break;
        case K.DELAYED: {
          const warn = e.b === "ce.bolt" ? e.t < 48 : e.b === "se.cage" ? e.t < 10 : e.b === "do.drop" ? e.t < 60 : false;
          if (e.b === "ce.bolt" && !warn) { ctx.fillStyle = "#fff1a8"; ctx.fillRect(x - 3, 0, 6, y); ctx.fillStyle = "#ffffff"; ctx.fillRect(x - 1, 0, 2, y); break; }
          ctx.fillStyle = warn ? ((s.frame >> 2) & 1 ? "rgba(255,224,102,0.35)" : "rgba(255,224,102,0.18)") : "rgba(255,255,255,0.45)";
          ctx.fillRect(x - (w >> 1), y - h, w, h);
          break;
        }
      }
    }
    for (let i = 0; i < 2; i++) {
      const f = s.f[i], pal = this.driver.view.palettes[i] ?? 0;
      const { pose, fx } = this.pose(s, i);
      const alpha = f.iframes > 0 || f.st[S.INVULN] > 0 ? 0.55 : 1;
      const x = P(f.x) + sx, y = P(f.y) + sy;
      if (f.dash > 0) this.drawFighterAt(ctx, fighterSprite(f.job, pal, "dash"), x - f.dashDir * 12, y, f.facing, 0.25);
      if (f.st[S.SHIELD] > 0) { ctx.fillStyle = "rgba(89,211,232,0.28)"; ctx.fillRect(x - 14, y - 44, 28, 44); }
      this.drawFighterAt(ctx, fighterSprite(f.job, pal, pose, fx), x, y, f.facing, alpha);
      if (f.st[S.STUN] > 0 || f.st[S.ROOT] > 0) { ctx.fillStyle = "#ffe066"; const a = (s.frame >> 3) & 1; ctx.fillRect(x - 7 + a * 3, y - 48, 3, 3); ctx.fillRect(x + 4 - a * 3, y - 50, 3, 3); }
      if (f.charging) {
        const cf = chargeFull(s, i), full = f.charge >= cf, w = Math.min(20, Math.trunc((f.charge * 20) / cf));
        ctx.fillStyle = "#1b1630"; ctx.fillRect(x - 11, y - 52, 22, 4);
        ctx.fillStyle = full ? ((s.frame >> 2) & 1 ? "#ffffff" : "#ffe066") : "#e9e6f2"; ctx.fillRect(x - 10, y - 51, w, 2);
      }
      if (f.flash === 6 && this.lastHit[i] !== s.frame && f.lastDmg > 0) {
        this.lastHit[i] = s.frame;
        const big = f.lastDmg >= 60;
        this.sparks.push({ x: P(f.x) - f.facing * 6, y: P(f.y) - 20, t0: s.frame, big });
        if (big) { if (o.shake) this.shakeUntil = s.frame + 8; if (!o.reduceFlash) this.impactAt = s.frame; }
        if (o.dmgNumbers) {
          const t = this.add.text(P(f.x), P(f.y) - 50, String(f.lastDmg), { fontFamily: FONT, fontSize: big ? "16px" : "8px", color: big ? "#ffe066" : "#ffffff", stroke: "#1b1630", strokeThickness: 3 }).setOrigin(0.5, 1);
          this.floaters.push({ x: P(f.x), y: P(f.y) - 50, text: t, born: this.time.now });
        }
      }
    }
    this.sparks = this.sparks.filter((sp) => {
      const fr = Math.floor((s.frame - sp.t0) / 4);
      if (fr > 3 || fr < 0) return false;
      const k = sp.big ? 1.6 : 1, cx = sp.x + sx, cy = sp.y + sy;
      const ring = (r: number, c: string, gap: boolean) => { ctx.fillStyle = c; for (let a = 0; a < 16; a++) { if (gap && a % 2) continue; const ang = (a / 16) * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 2, 2); } };
      if (fr === 0) { ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - 3 * k, cy - 1, 6 * k + 1, 3); ctx.fillRect(cx - 1, cy - 3 * k, 3, 6 * k + 1); }
      if (fr === 1) { ring(5 * k, "#fff1a8", false); ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - 2, cy - 2, 5, 5); }
      if (fr === 2) ring(8 * k, "#ffb03a", true);
      if (fr === 3) ring(10 * k, "#e8432e", true);
      return true;
    });
    if (s.frame === this.impactAt + 1) { // anime impact frame on big hits
      ctx.fillStyle = "rgba(11,11,20,0.75)"; ctx.fillRect(0, 0, C.W, C.H);
      ctx.fillStyle = "#ffffff";
      const sp = this.sparks[this.sparks.length - 1];
      if (sp) for (let a = 0; a < 36; a++) { const ang = (a / 36) * Math.PI * 2; for (let r = 26; r < 260; r += 3) if ((r + a * 7) % 9 < 6) ctx.fillRect(Math.round(sp.x + Math.cos(ang) * r), Math.round(sp.y + Math.sin(ang) * r), 1, 1); }
    }
    this.tex.refresh();
  }

  // ---------------- HUD ----------------
  private draw(s: State) {
    const g = this.g, o = this.opts(), arena = ARENAS[s.cfg.arena];
    const shaking = s.frame < this.shakeUntil;
    const sx = shaking ? ((s.frame & 1) ? 2 : -2) : 0, sy = shaking ? ((s.frame % 3) === 0 ? 1 : -1) : 0;
    this.drawWorld(s, sx, sy);
    g.clear();
    const you = this.driver.mode === "attract" ? -1 : this.driver.me;
    this.tArena.setText(this.driver.mode !== "attract" && s.timer > C.ROUND_FRAMES - 150 && s.phase === PHASE_FIGHT ? arena.name.toUpperCase() : "");

    if (s.ot) {
      const shrink = Math.min(150, Math.trunc((OT_FRAMES - s.timer) / 6));
      g.fillStyle(0xff4b3a, 0.35); g.fillRect(0, 0, C.WALL_L + shrink, C.H); g.fillRect(C.WALL_R - shrink, 0, C.W, C.H);
    }
    for (let i = 0; i < 2; i++) {
      const f = s.f[i];
      if (f.st[S.AIM_K] > 0 && (i === you || you === -1)) {
        const ax = P(f.st[S.AIM_X]), ay = arena.floor;
        g.fillStyle(0xffe066); g.fillRect(ax - 8, ay - 2, 16, 2); g.fillRect(ax - 1, ay - 40, 2, 38);
        g.fillStyle(0xffe066, 0.15); g.fillRect(ax - 12, 0, 24, ay);
      }
    }
    if (s.cfg.hazards && arena.id === "servers" && s.hz[1] > 0) { g.fillStyle(0x000000, 0.82); g.fillRect(0, 0, C.W, C.H); }
    if (s.cfg.hazards && arena.id === "hackathon") { g.fillStyle(0x000000, Math.min(0.55, (1 - s.timer / C.ROUND_FRAMES) * 0.6)); g.fillRect(0, 0, C.W, C.H); }
    if (!o.reduceFlash && s.cfg.hazards && arena.id === "warroom" && s.hz[1] > 0 && (s.frame >> 3) & 1) { g.fillStyle(0xff0000, 0.18); g.fillRect(0, 0, C.W, C.H); }

    for (let i = 0; i < 2; i++) {
      const f = s.f[i], tag = this.tTag[i];
      tag.setPosition(P(f.x) + sx, P(f.y) - 54 + sy);
      let label = i === you ? "YOU" : "";
      if (f.st[S.STUN] > 0) label = "STUNNED"; else if (f.st[S.SILENCE] > 0) label = "SILENCED";
      if (f.burnout > 0) label = "BURNOUT"; else if (f.st[S.RATE_LIMIT] > 0) label = "RATE LIMITED";
      else if (f.charging && f.charge >= chargeFull(s, i)) label = "FULL!";
      tag.setText(label);
      tag.setColor(f.burnout > 0 ? "#c6c3d2" : label === "YOU" ? "#ffffff" : "#ffe066");
    }
    const now = this.time.now;
    this.floaters = this.floaters.filter((fl) => {
      const e = (now - fl.born) / 800;
      if (e >= 1) { fl.text.destroy(); return false; }
      fl.text.setPosition(fl.x, Math.round(fl.y - e * 16));
      return true;
    });

    for (let i = 0; i < 2; i++) {
      const f = s.f[i], rtl = i === 1, job = jobOf(f), set = setOf(f);
      const bar = (y: number, w: number, h: number, frac: number, fill: number, bg: number) => {
        const bx = rtl ? C.W - 8 - w : 8;
        g.fillStyle(0x1b1630); g.fillRect(bx - 1, y - 1, w + 2, h + 2);
        g.fillStyle(bg); g.fillRect(bx, y, w, h);
        const fw = Math.max(0, Math.round(w * Math.min(1, frac)));
        g.fillStyle(fill); g.fillRect(rtl ? bx + w - fw : bx, y, fw, h);
        if (h > 3) { g.fillStyle(0xffffff, 0.35); g.fillRect(rtl ? bx + w - fw : bx, y + 1, fw, 1); }
      };
      bar(15, 140, 6, f.hp / C.HP_MAX, o.colorblind ? 0x3b8bff : 0x5cb043, 0x3a1f2e);
      if (f.st[S.SHIELD] > 0) bar(15, Math.min(140, f.st[S.SHIELD]), 2, 1, 0x59d3e8, 0x59d3e8);
      bar(24, 100, 3, f.mot / motMax(f), f.burnout > 0 ? 0x66637a : 0xffb03a, 0x2a2340);
      if (job.id === "vc") bar(29, 70, 2, f.res[0] / 10000, f.st[S.RATE_LIMIT] > 0 ? 0x66637a : 0x26f0e0, 0x2a2340);
      for (let k = 0; k < C.ROUNDS_TO_WIN; k++) {
        const bx = rtl ? C.W / 2 + 20 + k * 9 : C.W / 2 - 26 - k * 9;
        g.fillStyle(0x1b1630); g.fillRect(bx, 3, 6, 6);
        g.fillStyle(s.wins[i] > k ? job.color : 0x3d3a4a); g.fillRect(bx + 1, 4, 4, 4);
      }
      const nm = this.driver.view.names[i];
      const who = this.driver.mode === "attract" ? "CPU" : nm ? nm.toUpperCase() : i === you ? "YOU" : this.driver.mode === "practice" ? "CPU" : `P${i + 1}`;
      this.tName[i].setText(`${who} · ${JOB_CODES[f.job]} ${"AB"[f.set]}`);
      const showOpp = you === -1 || (you >= 0 && jobOf(s.f[you]).id === "qa");
      const visible = i === you || showOpp;
      for (let k = 0; k < 3; k++) {
        const t = this.tSkill[i][k], sk = set.skills[k];
        if (!sk || !visible) { t.setText(""); continue; }
        const cd = f.cd[k];
        const short = sk.name.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("").slice(0, 3);
        t.setText(cd > 0 ? `${short}${Math.ceil(cd / 60)}` : `${"UIO"[k]}:${short}`);
        t.setColor(cd > 0 ? "#6a6a7a" : f.st[S.SILENCE] > 0 ? "#ff5a5a" : f.mot < sk.cost ? "#ff9f1c" : "#e9e6f2");
      }
    }
    this.tTimer.setText(String(Math.max(0, Math.ceil(s.timer / 60))));

    let banner = "", sub = "";
    if (s.phase === PHASE_FIGHT && !s.ot && s.timer > (s.tiebreak ? C.sec(45) : C.ROUND_FRAMES) - 60) { banner = s.tiebreak ? "PRODUCTION INCIDENT" : `ROUND ${s.round}`; sub = s.tiebreak ? "50 % HP · 45 S · NO ITEMS" : "DEPLOY!"; }
    if (s.phase === PHASE_FIGHT && s.ot && s.timer > OT_FRAMES - 90) { banner = "OVERTIME"; sub = "FIRST CLEAN HIT WINS"; }
    if (s.phase === PHASE_FIGHT && s.cfg.hazards && arena.id === "warroom" && s.hz[1] > 0) sub = "PROD IS DOWN! −15 MOTIVATION";
    if (s.phase === PHASE_FIGHT && s.cfg.hazards && arena.id === "garage" && s.hz[0] % C.sec(45) < 60 && s.hz[0] > 60) sub = "FUNDING ROUND!";
    if (s.phase === PHASE_ROUND_END) {
      banner = s.roundWinner === 3 ? "TIME" : s.roundWinner === 2 ? "DOUBLE K.O." : s.f[0].hp <= 0 || s.f[1].hp <= 0 ? "K.O." : "TIME";
      sub = s.roundWinner === 3 ? "DRAW, NO POINT" : s.roundWinner === 2 ? "BOTH SCORE" : `${this.who(s.roundWinner, you)} TAKES THE ROUND`;
    }
    if (s.phase === PHASE_MATCH_END) {
      banner = s.matchWinner === 2 ? "DRAW" : you === -1 ? `P${s.matchWinner + 1} WINS` : s.matchWinner === you ? "YOU WIN!" : "YOU LOSE";
      sub = this.driver.mode === "attract" ? "NEW MATCH SOON" : "";
    }
    this.tBanner.setText(banner);
    this.tSub.setText(sub);
    const waiting = this.driver.mode === "online" && performance.now() - this.driver.lastStallAt < 250;
    this.tWait.setText(waiting ? "WAITING FOR OPPONENT…" : "");
  }

  private who(w: number, you: number) {
    if (you === -1) return `P${w + 1}`;
    return w === you ? "YOU" : "OPPONENT";
  }
}
