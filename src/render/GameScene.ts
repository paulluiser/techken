// Draws the sim state. Placeholder art for the online test: The Terminal arena and two boxes.
import * as Phaser from "phaser";
import * as C from "../sim/constants";
import { PHASE_FIGHT, PHASE_MATCH_END, PHASE_ROUND_END, type State } from "../sim/sim";
import type { Driver } from "../game/driver";

const COLORS = [0xffb03a, 0x59d3e8] as const;
const FONT = '"Press Start 2P", monospace';

interface Floater { x: number; y: number; text: Phaser.GameObjects.Text; born: number }

export class GameScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private tTimer!: Phaser.GameObjects.Text;
  private tName: Phaser.GameObjects.Text[] = [];
  private tTag: Phaser.GameObjects.Text[] = [];
  private tBanner!: Phaser.GameObjects.Text;
  private tSub!: Phaser.GameObjects.Text;
  private tWait!: Phaser.GameObjects.Text;
  private floaters: Floater[] = [];
  private lastFlash = [0, 0];

  constructor(private driver: Driver) { super("game"); }

  create() {
    this.g = this.add.graphics();
    const t8 = { fontFamily: FONT, fontSize: "8px", color: "#e9e6f2" };
    this.tTimer = this.add.text(C.W / 2, 5, "90", { fontFamily: FONT, fontSize: "16px", color: "#fdfdf8" }).setOrigin(0.5, 0);
    this.tName = [this.add.text(8, 3, "P1", t8), this.add.text(C.W - 8, 3, "P2", t8).setOrigin(1, 0)];
    this.tTag = [0, 1].map(() => this.add.text(0, 0, "", { ...t8, fontSize: "8px" }).setOrigin(0.5, 1));
    this.tBanner = this.add.text(C.W / 2, 70, "", { fontFamily: FONT, fontSize: "16px", color: "#ffe066", stroke: "#1b1630", strokeThickness: 4 }).setOrigin(0.5);
    this.tSub = this.add.text(C.W / 2, 92, "", { ...t8, stroke: "#1b1630", strokeThickness: 3 }).setOrigin(0.5);
    this.tWait = this.add.text(C.W / 2, 200, "", { ...t8, color: "#ff5a5a" }).setOrigin(0.5);
  }

  update() {
    // the simulation runs on its own loop (main.ts); this only draws the latest state
    this.draw(this.driver.state);
  }

  private draw(s: State) {
    const g = this.g, S = C.SUB;
    g.clear();
    // arena: The Terminal
    g.fillStyle(0x07140d); g.fillRect(0, 0, C.W, C.H);
    g.fillStyle(0x0c2416);
    for (let x = 0; x < C.W; x += 16) g.fillRect(x, 0, 1, C.H);
    for (let y = 8; y < C.H; y += 16) g.fillRect(0, y, C.W, 1);
    g.fillStyle(0x0f3a22); g.fillRect(0, C.FLOOR_Y + 2, C.W, C.H - C.FLOOR_Y);
    g.fillRect(0, 0, C.WALL_L, C.H); g.fillRect(C.WALL_R, 0, C.W - C.WALL_R, C.H);
    g.fillStyle(0x39ff7a); g.fillRect(0, C.FLOOR_Y, C.W, 2);
    for (const p of C.PLATFORMS) {
      g.fillStyle(0x39ff7a); g.fillRect(p.x1, p.y, p.x2 - p.x1, 2);
      g.fillStyle(0x0f3a22); g.fillRect(p.x1, p.y + 2, p.x2 - p.x1, 4);
    }

    // fighters
    const you = this.driver.mode === "attract" ? -1 : this.driver.me;
    for (let i = 0; i < 2; i++) {
      const f = s.f[i];
      const px = Math.round(f.x / S), py = Math.round(f.y / S);
      let col: number = COLORS[i];
      if (f.burnout > 0) col = 0x6a6a7a;
      if (f.flash > 0 && f.flash % 2 === 0) col = 0xffffff;
      const alpha = f.iframes > 0 ? 0.5 : 1;
      if (f.dash > 0) { g.fillStyle(col, 0.22); g.fillRect(px - f.dashDir * 14 - 10, py - 36, 20, 36); }
      g.fillStyle(0x1b1630, alpha); g.fillRect(px - 11, py - 37, 22, 38);
      g.fillStyle(col, alpha); g.fillRect(px - 10, py - 36, 20, 36);
      g.fillStyle(0x1b1630, alpha); g.fillRect(px + f.facing * 5 - 1, py - 29, 3, 4);
      // charge meter
      if (f.charging) {
        const full = f.charge >= C.CHARGE_FULL;
        const w = Math.min(20, Math.trunc((f.charge * 20) / C.CHARGE_FULL));
        g.fillStyle(0x1b1630); g.fillRect(px - 11, py - 44, 22, 4);
        g.fillStyle(full ? (Math.trunc(s.frame / 4) % 2 ? 0xffffff : 0xffe066) : 0xe9e6f2); g.fillRect(px - 10, py - 43, w, 2);
      }
      // attack: wind-up then hitbox
      if (f.atk > 0) {
        const active = f.atk > C.ATK_STARTUP && f.atk <= C.ATK_STARTUP + C.ATK_ACTIVE;
        const hx = f.facing > 0 ? px + 6 : px - 6 - C.HITBOX_REACH;
        g.fillStyle(active ? 0xffffff : col, active ? 0.75 : 0.3);
        g.fillRect(hx, py - 30, C.HITBOX_REACH, 20);
      }
      // labels above heads
      const tag = this.tTag[i];
      tag.setPosition(px, py - 46);
      tag.setText(f.burnout > 0 ? "BURNOUT" : f.charging && f.charge >= C.CHARGE_FULL ? "FULL!" : i === you ? "YOU" : "");
      tag.setColor(f.burnout > 0 ? "#c6c3d2" : i === you ? "#ffffff" : "#ffe066");
      // damage numbers (visual only)
      if (f.flash === 6 && this.lastFlash[i] !== s.frame) {
        this.lastFlash[i] = s.frame;
        const t = this.add.text(px, py - 40, String(f.lastDmg), { fontFamily: FONT, fontSize: f.lastDmg >= 70 ? "16px" : "8px", color: f.lastDmg >= 70 ? "#ffe066" : "#ffffff", stroke: "#1b1630", strokeThickness: 3 }).setOrigin(0.5, 1);
        this.floaters.push({ x: px, y: py - 40, text: t, born: this.time.now });
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
      const f = s.f[i], rtl = i === 1;
      const bar = (y: number, w: number, h: number, frac: number, fill: number, bg: number) => {
        const x = rtl ? C.W - 8 - w : 8;
        g.fillStyle(0x1b1630); g.fillRect(x - 1, y - 1, w + 2, h + 2);
        g.fillStyle(bg); g.fillRect(x, y, w, h);
        const fw = Math.round(w * frac);
        g.fillStyle(fill); g.fillRect(rtl ? x + w - fw : x, y, fw, h);
      };
      bar(15, 140, 6, f.hp / C.HP_MAX, 0x5cb043, 0x3a1f2e);
      bar(24, 100, 3, f.mot / C.MOT_MAX, f.burnout > 0 ? 0x66637a : 0xffb03a, 0x2a2340);
      for (let k = 0; k < C.ROUNDS_TO_WIN; k++) {
        const x = rtl ? C.W - 106 - k * 9 : 100 + k * 9;
        g.fillStyle(0x1b1630); g.fillRect(x, 3, 6, 6);
        g.fillStyle(s.wins[i] > k ? COLORS[i] : 0x3d3a4a); g.fillRect(x + 1, 4, 4, 4);
      }
      this.tName[i].setText(this.driver.mode === "attract" ? (i === 0 ? "CPU" : "CPU") : i === you ? (i === 0 ? "P1 · YOU" : "YOU · P2") : i === 0 ? "P1" : "P2");
    }
    this.tTimer.setText(String(Math.max(0, Math.ceil(s.timer / 60))));

    // banners
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
