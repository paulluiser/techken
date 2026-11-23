// Draws the sim state. Placeholder shapes until the art phase: each job is a colored
// box, entities are simple shapes, items are labeled tokens.
import * as Phaser from "phaser";
import * as C from "../sim/constants";
import { ARENAS } from "../sim/arenas";
import { ITEMS } from "../sim/items";
import { chargeFull, jobOf, motMax, setOf } from "../sim/core";
import { JOB_CODES } from "../sim/registry";
import { PHASE_FIGHT, PHASE_MATCH_END, PHASE_ROUND_END, type State } from "../sim/sim";
import { K, S } from "../sim/types";
import type { Driver } from "../game/driver";

const FONT = '"Press Start 2P", monospace';
const P = (n: number) => Math.round(n / C.SUB);

interface Floater { x: number; y: number; text: Phaser.GameObjects.Text; born: number }

export class GameScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private tTimer!: Phaser.GameObjects.Text;
  private tName: Phaser.GameObjects.Text[] = [];
  private tTag: Phaser.GameObjects.Text[] = [];
  private tSkill: Phaser.GameObjects.Text[][] = [];
  private tItem: Phaser.GameObjects.Text[] = [];
  private tBanner!: Phaser.GameObjects.Text;
  private tSub!: Phaser.GameObjects.Text;
  private tWait!: Phaser.GameObjects.Text;
  private tArena!: Phaser.GameObjects.Text;
  private floaters: Floater[] = [];
  private lastHit = [0, 0];

  constructor(private driver: Driver) { super("game"); }

  create() {
    this.g = this.add.graphics();
    const t8 = { fontFamily: FONT, fontSize: "8px", color: "#e9e6f2" };
    this.tTimer = this.add.text(C.W / 2, 5, "90", { fontFamily: FONT, fontSize: "16px", color: "#fdfdf8" }).setOrigin(0.5, 0);
    this.tName = [this.add.text(8, 3, "", t8), this.add.text(C.W - 8, 3, "", t8).setOrigin(1, 0)];
    this.tTag = [0, 1].map(() => this.add.text(0, 0, "", t8).setOrigin(0.5, 1));
    this.tSkill = [0, 1].map((i) => [0, 1, 2].map((k) => this.add.text(i === 0 ? 8 + k * 46 : C.W - 8 - (2 - k) * 46, 33, "", { ...t8, fontSize: "8px" }).setOrigin(i === 0 ? 0 : 1, 0)));
    this.tItem = [0, 1, 2, 3].map(() => this.add.text(0, 0, "", { ...t8, fontSize: "8px", color: "#1b1630" }).setOrigin(0.5, 1));
    this.tBanner = this.add.text(C.W / 2, 74, "", { fontFamily: FONT, fontSize: "16px", color: "#ffe066", stroke: "#1b1630", strokeThickness: 4 }).setOrigin(0.5);
    this.tSub = this.add.text(C.W / 2, 96, "", { ...t8, stroke: "#1b1630", strokeThickness: 3 }).setOrigin(0.5);
    this.tWait = this.add.text(C.W / 2, 204, "", { ...t8, color: "#ff5a5a" }).setOrigin(0.5);
    this.tArena = this.add.text(C.W / 2, 208, "", { ...t8, color: "#9aa3b5" }).setOrigin(0.5, 1);
  }

  update() { this.draw(this.driver.state); }

  private draw(s: State) {
    const g = this.g;
    const arena = ARENAS[s.cfg.arena];
    g.clear();
    g.fillStyle(arena.bg); g.fillRect(0, 0, C.W, C.H);
    g.fillStyle(0xffffff, 0.04);
    for (let x = 0; x < C.W; x += 16) g.fillRect(x, 0, 1, C.H);
    for (let y = 8; y < C.H; y += 16) g.fillRect(0, y, C.W, 1);
    g.fillStyle(0x000000, 0.35); g.fillRect(0, arena.floor + 2, C.W, C.H - arena.floor);
    g.fillRect(0, 0, C.WALL_L, C.H); g.fillRect(C.WALL_R, 0, C.W - C.WALL_R, C.H);
    g.fillStyle(arena.line); g.fillRect(0, arena.floor, C.W, 2);
    for (const p of arena.platforms) {
      g.fillStyle(arena.line); g.fillRect(p.x1, p.y, p.x2 - p.x1, 2);
      g.fillStyle(0x000000, 0.4); g.fillRect(p.x1, p.y + 2, p.x2 - p.x1, 4);
    }
    this.tArena.setText(this.driver.mode !== "attract" && s.timer > C.ROUND_FRAMES - 150 && s.phase === PHASE_FIGHT ? arena.name.toUpperCase() : "");

    // items
    s.items.forEach((it, n) => {
      const d = ITEMS[it.kind], x = P(it.x), y = P(it.y) - 4 - ((s.frame >> 3) & 1);
      const blink = it.life < 120 && (s.frame >> 2) & 1;
      if (!blink) {
        g.fillStyle(0x1b1630); g.fillRect(x - 6, y - 12, 12, 12);
        g.fillStyle(d.color); g.fillRect(x - 5, y - 11, 10, 10);
        g.fillStyle(0xffffff, 0.8); g.fillRect(x - 4, y - 10, 2, 2);
      }
      const t = this.tItem[n];
      if (t) { t.setPosition(x, y - 13); t.setText(blink ? "" : d.name.split(" ")[0].slice(0, 6).toUpperCase()); t.setColor("#ffffff"); }
    });
    for (let n = s.items.length; n < this.tItem.length; n++) this.tItem[n].setText("");

    // entities
    for (const e of s.ents) {
      const col = jobOf(s.f[e.o]).color;
      const x = P(e.x), y = P(e.y), w = e.w, h = e.h;
      switch (e.k) {
        case K.PROJ: g.fillStyle(0x1b1630); g.fillRect(x - (w >> 1) - 1, y - (h >> 1) - 1, w + 2, h + 2); g.fillStyle(e.b === "basic.shot" ? 0xffffff : col); g.fillRect(x - (w >> 1), y - (h >> 1), w, h); break;
        case K.SUMMON: g.fillStyle(0x1b1630); g.fillRect(x - (w >> 1) - 1, y - h - 1, w + 2, h + 2); g.fillStyle(col, 0.85); g.fillRect(x - (w >> 1), y - h, w, h); g.fillStyle(0xff4b3a); g.fillRect(x + (e.p3 > 0 ? 2 : -4), y - h + 4, 2, 2); break;
        case K.ZONE: g.fillStyle(0xe9efff, 0.85); g.fillRect(x - (w >> 1), y - h, w, h); g.fillStyle(0x7fb4ff, 0.35); if ((s.frame >> 1) & 1) g.fillRect(x - (w >> 1), y, w, 184 - y); break;
        case K.WALL: g.fillStyle(col, 0.7); g.fillRect(x - (w >> 1), y - h, w, h); break;
        case K.PLATFORM: g.fillStyle(0xf2f6ff); g.fillRect(x - (w >> 1), y - h, w, h); g.fillStyle(0xc8d5f5); g.fillRect(x - (w >> 1), y, w, 2); break;
        case K.TRAP: g.fillStyle(0xfdfdf8); g.fillRect(x - (w >> 1), y - h, w, h); g.fillStyle(0x8a9a2a); g.fillRect(x - 1, y - h + 1, 2, 2); break;
        case K.ANCHOR: g.fillStyle(0xf2f6ff); g.fillRect(x - (w >> 1), y - h, w, h); g.fillStyle(col); g.fillRect(x - 2, y - h + 3, 4, 4); break;
        case K.DELAYED: {
          const warn = e.b === "ce.bolt" ? e.t < 48 : e.b === "se.cage" ? e.t < 10 : false;
          g.fillStyle(warn ? 0xffe066 : 0xffffff, warn ? 0.18 + ((s.frame >> 2) & 1) * 0.12 : 0.45);
          g.fillRect(x - (w >> 1), y - h, w, h);
          break;
        }
      }
    }

    // fighters
    const you = this.driver.mode === "attract" ? -1 : this.driver.me;
    for (let i = 0; i < 2; i++) {
      const f = s.f[i], job = jobOf(f);
      const x = P(f.x), y = P(f.y), bh = 30 + job.weight * 2;
      let col = job.color;
      if (f.burnout > 0 || f.st[S.RATE_LIMIT] > 0) col = 0x6a6a7a;
      if (f.flash > 0 && f.flash % 2 === 0) col = 0xffffff;
      const alpha = f.iframes > 0 || f.st[S.INVULN] > 0 ? 0.5 : 1;
      if (f.dash > 0) { g.fillStyle(col, 0.22); g.fillRect(x - f.dashDir * 14 - 10, y - bh, 20, bh); }
      if (f.st[S.SHIELD] > 0) { g.fillStyle(0x59d3e8, 0.35); g.fillRect(x - 13, y - bh - 3, 26, bh + 3); }
      if (f.guarding) { g.fillStyle(0xffffff, 0.5); g.fillRect(x + f.facing * 11 - 1, y - bh, 3, bh); }
      g.fillStyle(0x1b1630, alpha); g.fillRect(x - 11, y - bh - 1, 22, bh + 2);
      g.fillStyle(col, alpha); g.fillRect(x - 10, y - bh, 20, bh);
      g.fillStyle(0x1b1630, alpha); g.fillRect(x + f.facing * 5 - 1, y - bh + 7, 3, 4);
      if (f.st[S.STUN] > 0 || f.st[S.ROOT] > 0) { g.fillStyle(0xffe066); g.fillRect(x - 6, y - bh - 4, 3, 3); g.fillRect(x + 3, y - bh - 4, 3, 3); }
      if (f.charging) {
        const cf = chargeFull(s, i), full = f.charge >= cf;
        const w = Math.min(20, Math.trunc((f.charge * 20) / cf));
        g.fillStyle(0x1b1630); g.fillRect(x - 11, y - bh - 8, 22, 4);
        g.fillStyle(full ? ((s.frame >> 2) & 1 ? 0xffffff : 0xffe066) : 0xe9e6f2); g.fillRect(x - 10, y - bh - 7, w, 2);
      }
      if (f.atk > 0 && !job.ranged) {
        const active = f.atk > C.ATK_STARTUP && f.atk <= C.ATK_STARTUP + C.ATK_ACTIVE;
        const hx = f.facing > 0 ? x + 6 : x - 6 - job.reach;
        g.fillStyle(active ? 0xffffff : col, active ? 0.75 : 0.3);
        g.fillRect(hx, y - 30, job.reach, 22);
      }
      const tag = this.tTag[i];
      tag.setPosition(x, y - bh - 10);
      let label = i === you ? "YOU" : "";
      if (f.st[S.STUN] > 0) label = "STUNNED"; else if (f.st[S.SILENCE] > 0) label = "SILENCED";
      if (f.burnout > 0) label = "BURNOUT"; else if (f.st[S.RATE_LIMIT] > 0) label = "RATE LIMITED";
      else if (f.charging && f.charge >= chargeFull(s, i)) label = "FULL!";
      tag.setText(label);
      tag.setColor(f.burnout > 0 ? "#c6c3d2" : label === "YOU" ? "#ffffff" : "#ffe066");
      if (f.flash === 6 && this.lastHit[i] !== s.frame && f.lastDmg > 0) {
        this.lastHit[i] = s.frame;
        const big = f.lastDmg >= 70;
        const t = this.add.text(x, y - bh - 4, String(f.lastDmg), { fontFamily: FONT, fontSize: big ? "16px" : "8px", color: big ? "#ffe066" : "#ffffff", stroke: "#1b1630", strokeThickness: 3 }).setOrigin(0.5, 1);
        this.floaters.push({ x, y: y - bh - 4, text: t, born: this.time.now });
      }
    }
    const now = this.time.now;
    this.floaters = this.floaters.filter((fl) => {
      const e = (now - fl.born) / 800;
      if (e >= 1) { fl.text.destroy(); return false; }
      fl.text.setPosition(fl.x, Math.round(fl.y - e * 16));
      return true;
    });

    // HUD
    for (let i = 0; i < 2; i++) {
      const f = s.f[i], rtl = i === 1, job = jobOf(f), set = setOf(f);
      const bar = (y: number, w: number, h: number, frac: number, fill: number, bg: number) => {
        const bx = rtl ? C.W - 8 - w : 8;
        g.fillStyle(0x1b1630); g.fillRect(bx - 1, y - 1, w + 2, h + 2);
        g.fillStyle(bg); g.fillRect(bx, y, w, h);
        const fw = Math.max(0, Math.round(w * Math.min(1, frac)));
        g.fillStyle(fill); g.fillRect(rtl ? bx + w - fw : bx, y, fw, h);
      };
      bar(15, 140, 6, f.hp / C.HP_MAX, 0x5cb043, 0x3a1f2e);
      if (f.st[S.SHIELD] > 0) bar(15, Math.min(140, f.st[S.SHIELD]), 2, 1, 0x59d3e8, 0x59d3e8);
      bar(24, 100, 3, f.mot / motMax(f), f.burnout > 0 ? 0x66637a : 0xffb03a, 0x2a2340);
      if (job.id === "vc") bar(29, 70, 2, f.res[0] / 10000, f.st[S.RATE_LIMIT] > 0 ? 0x66637a : 0x26f0e0, 0x2a2340);
      for (let k = 0; k < C.ROUNDS_TO_WIN; k++) {
        const bx = rtl ? C.W - 106 - k * 9 : 100 + k * 9;
        g.fillStyle(0x1b1630); g.fillRect(bx, 3, 6, 6);
        g.fillStyle(s.wins[i] > k ? job.color : 0x3d3a4a); g.fillRect(bx + 1, 4, 4, 4);
      }
      const who = this.driver.mode === "attract" ? "CPU" : i === you ? "YOU" : this.driver.mode === "practice" ? "CPU" : `P${i + 1}`;
      this.tName[i].setText(`${who} · ${JOB_CODES[f.job]} ${"AB"[f.set]}`);
      // skill slots: your own always; the opponent's only if you're a QA Analyst (or in attract)
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
    if (s.phase === PHASE_FIGHT && s.timer > C.ROUND_FRAMES - 60) { banner = `ROUND ${s.round}`; sub = "DEPLOY!"; }
    if (s.phase === PHASE_ROUND_END) {
      banner = s.roundWinner === 3 ? "TIME" : s.roundWinner === 2 ? "DOUBLE K.O." : s.f[0].hp <= 0 || s.f[1].hp <= 0 ? "K.O." : "TIME";
      sub = s.roundWinner === 3 ? "DRAW, NO POINT" : s.roundWinner === 2 ? "BOTH SCORE" : `${this.who(s.roundWinner, you)} TAKES THE ROUND`;
    }
    if (s.phase === PHASE_MATCH_END) {
      banner = s.matchWinner === 2 ? "DRAW" : you === -1 ? `P${s.matchWinner + 1} WINS` : s.matchWinner === you ? "YOU WIN!" : "YOU LOSE";
      sub = "NEW MATCH SOON";
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
