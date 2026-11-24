// Turns keyboard, mouse, gamepad and touch into one packed sim input per frame (GAME_DESIGN.md 7).
// Aiming: the sim auto-aims at the opponent unless a device aims manually (mouse, right stick, touch drag).
import { angleOf, dist } from "../sim/fixed";
import { IN_ATTACK, IN_DASH, IN_S1, IN_S2, IN_S3, IN_SKILLS, packInput } from "../sim/input";
import { ACTIONS, type Settings } from "../ui/settings";

/** Converts a screen point to sim floor coordinates. Set by the renderer. */
export type ScreenToFloor = (clientX: number, clientY: number) => { x: number; y: number } | null;
/** What the local player is aiming right now, for the renderer's aim guide. */
export interface AimPreview { on: boolean; kind: "attack" | "skill" | "mouse"; slot: number; angle: number; dist: number }

const toDir16 = (vx: number, vy: number) => (vx === 0 && vy === 0 ? -1 : Math.round(angleOf(vx, vy) / 4) & 15);
const halfTiles = (units: number) => Math.max(1, Math.min(15, Math.round(units / 500)));

/** Keyboard with rebindable keys (Control Panel → Controls), plus the mouse. */
export class Keyboard {
  private down = new Set<string>();
  private map: Record<string, number> = {};
  private mouseBtn = 0;
  mouse: { x: number; y: number; active: boolean } = { x: 0, y: 0, active: false };
  enabled = true;
  constructor(private settings: () => Settings) {
    this.rebuild();
    addEventListener("keydown", (e) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (e.code in this.map) { this.down.add(e.code); if (this.enabled) e.preventDefault(); }
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => { this.down.clear(); this.mouseBtn = 0; });
    addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.active = true; } });
    addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || !this.enabled || (e.target as HTMLElement).closest("#ui, #menu-btn")) return;
      this.mouse.active = true;
      this.mouseBtn |= e.button === 0 ? IN_ATTACK : e.button === 2 ? IN_DASH : 0;
    });
    addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") this.mouseBtn &= e.button === 0 ? ~IN_ATTACK : e.button === 2 ? ~IN_DASH : ~0; });
    addEventListener("contextmenu", (e) => { if (this.enabled) e.preventDefault(); });
  }
  rebuild() {
    this.map = {};
    const keys = this.settings().keys;
    for (const a of ACTIONS) for (const k of keys[a.id] ?? []) this.map[k] = (this.map[k] ?? 0) | (1 << ACTIONS.indexOf(a));
  }
  private has(id: string) { const b = 1 << ACTIONS.findIndex((a) => a.id === id); for (const k of this.down) if ((this.map[k] ?? 0) & b) return true; return false; }
  buttons(): number {
    if (!this.enabled) return 0;
    return (this.has("attack") ? IN_ATTACK : 0) | (this.has("dash") ? IN_DASH : 0) | (this.has("s1") ? IN_S1 : 0) | (this.has("s2") ? IN_S2 : 0) | (this.has("s3") ? IN_S3 : 0) | this.mouseBtn;
  }
  move(): number {
    if (!this.enabled) return -1;
    return toDir16((this.has("right") ? 1 : 0) - (this.has("left") ? 1 : 0), (this.has("down") ? 1 : 0) - (this.has("up") ? 1 : 0));
  }
  /** Mouse aim is used once the mouse has moved; keyboard-only players keep auto-aim. */
  get mouseAims() { return this.mouse.active && this.settings().mouseAim; }
}

/** Standard-mapping gamepads: left stick moves, right stick aims, RT attacks, LT/A dashes, X/Y/B cast. */
export class Pad {
  read(): { buttons: number; move: number; aim: number } {
    const g = navigator.getGamepads?.().find((p) => p && p.connected);
    if (!g) return { buttons: 0, move: -1, aim: -1 };
    const b = (n: number) => !!g.buttons[n]?.pressed;
    const ax = g.axes, dead = 0.35;
    const lx = Math.abs(ax[0]) > dead ? ax[0] : 0, ly = Math.abs(ax[1]) > dead ? ax[1] : 0;
    const rx = ax[2] ?? 0, ry = ax[3] ?? 0;
    let move = toDir16(Math.round(lx * 100), Math.round(ly * 100));
    if (move < 0) move = toDir16((b(15) ? 1 : 0) - (b(14) ? 1 : 0), (b(13) ? 1 : 0) - (b(12) ? 1 : 0)); // d-pad
    const aim = Math.hypot(rx, ry) > 0.5 ? angleOf(Math.round(rx * 1000), Math.round(ry * 1000)) : -1;
    const buttons = (b(7) ? IN_ATTACK : 0) | (b(6) || b(0) ? IN_DASH : 0) | (b(2) ? IN_S1 : 0) | (b(3) ? IN_S2 : 0) | (b(1) ? IN_S3 : 0);
    return { buttons, move, aim };
  }
}

/** Twin-stick touch controls: a floating joystick on the left, Attack/Dash/skills on the right.
 *  Attack and skills can be dragged to aim. Skills cast when you let go; drag back to cancel. */
export class TouchControls {
  editing = false;
  private moveDir = -1;
  private held = 0;
  private queued = 0; // skill bits to send on the next read
  private queuedAim = -1; private queuedDist = 0;
  preview: AimPreview = { on: false, kind: "skill", slot: 0, angle: 0, dist: 0 };
  /** Called with each skill button so the HUD can draw cooldowns on it. */
  readonly skillButtons: HTMLElement[] = [];
  constructor(root: HTMLElement) {
    const zone = root.querySelector<HTMLElement>("#stick-zone")!, stick = root.querySelector<HTMLElement>("#stick")!, knob = stick.querySelector<HTMLElement>(".knob")!;
    let sid = -1, cx = 0, cy = 0;
    zone.addEventListener("pointerdown", (e) => {
      if (this.editing || sid >= 0) return;
      e.preventDefault(); zone.setPointerCapture(e.pointerId); sid = e.pointerId;
      const r = zone.getBoundingClientRect(); cx = e.clientX; cy = e.clientY;
      stick.hidden = false; stick.style.left = `${cx - r.left}px`; stick.style.top = `${cy - r.top}px`; knob.style.transform = "";
    });
    zone.addEventListener("pointermove", (e) => {
      if (e.pointerId !== sid) return;
      const vx = e.clientX - cx, vy = e.clientY - cy, len = Math.hypot(vx, vy), k = Math.min(1, 46 / (len || 1));
      knob.style.transform = `translate(${vx * k}px, ${vy * k}px)`;
      this.moveDir = len > 14 ? toDir16(Math.round(vx), Math.round(vy)) : -1;
    });
    const endStick = (e: PointerEvent) => { if (e.pointerId !== sid) return; sid = -1; this.moveDir = -1; stick.hidden = true; };
    zone.addEventListener("pointerup", endStick); zone.addEventListener("pointercancel", endStick);

    for (const el of root.querySelectorAll<HTMLElement>("[data-act], [data-skill]")) {
      const skill = el.dataset.skill !== undefined ? Number(el.dataset.skill) : -1;
      if (skill >= 0) this.skillButtons[skill] = el;
      const bit = el.dataset.act === "attack" ? IN_ATTACK : el.dataset.act === "dash" ? IN_DASH : 0;
      let pid = -1, ox = 0, oy = 0, cancel = false;
      el.addEventListener("pointerdown", (e) => {
        if (this.editing) return;
        e.preventDefault(); el.setPointerCapture(e.pointerId); pid = e.pointerId; cancel = false;
        const r = el.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2;
        el.classList.add("on"); navigator.vibrate?.(bit === IN_ATTACK ? 8 : 4);
        if (bit) this.held |= bit;
        this.preview = { on: false, kind: skill >= 0 ? "skill" : "attack", slot: skill, angle: 0, dist: 0 };
      });
      el.addEventListener("pointermove", (e) => {
        if (e.pointerId !== pid || bit === IN_DASH) return;
        const vx = e.clientX - ox, vy = e.clientY - oy, len = Math.hypot(vx, vy);
        cancel = skill >= 0 && this.preview.on && len < 18;
        if (len > 22) this.preview = { ...this.preview, on: true, angle: angleOf(Math.round(vx), Math.round(vy)), dist: halfTiles((len - 22) * 60) };
        else if (cancel) this.preview = { ...this.preview, on: false };
        el.classList.toggle("cancel", cancel);
      });
      const up = (e: PointerEvent) => {
        if (e.pointerId !== pid) return;
        pid = -1; el.classList.remove("on", "cancel");
        if (bit) this.held &= ~bit;
        if (skill >= 0 && !cancel) { this.queued |= IN_SKILLS[skill]; this.queuedAim = this.preview.on ? this.preview.angle : -1; this.queuedDist = this.preview.dist; }
        this.preview = { ...this.preview, on: false };
      };
      el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }
  /** Returns this frame's touch state. Queued skill casts are sent once. */
  take(): { buttons: number; move: number; aim: number; dist: number } {
    const q = this.queued; this.queued = 0;
    const aiming = this.preview.on && this.preview.kind === "attack";
    return { buttons: this.held | q, move: this.moveDir, aim: q ? this.queuedAim : aiming ? this.preview.angle : -1, dist: q ? this.queuedDist : 0 };
  }
}

/** Random-but-plausible inputs, for soak-testing rollback without a human. */
export class Autoplay {
  enabled = false;
  private cur = 0;
  private left = 0;
  next(): number {
    if (--this.left <= 0) {
      const r = Math.random();
      let b = 0;
      if (Math.random() < 0.4) b |= IN_ATTACK;
      if (Math.random() < 0.06) b |= IN_DASH;
      if (Math.random() < 0.05) b |= IN_SKILLS[Math.floor(Math.random() * 3)];
      this.cur = packInput(b, r < 0.2 ? -1 : Math.floor(Math.random() * 16));
      this.left = 6 + Math.floor(Math.random() * 40);
    }
    return this.cur;
  }
}

/** Merges every device into one packed input. Needs the renderer for mouse aim. */
export class CombinedInput {
  screenToFloor: ScreenToFloor | null = null;
  /** The local fighter's position in sim units (set by the app every frame). */
  me: () => { x: number; y: number } | null = () => null;
  preview: AimPreview = { on: false, kind: "mouse", slot: 0, angle: 0, dist: 0 };
  readonly pad = new Pad();
  /** Auto-aim for basic attacks (Control Panel → Controls). */
  autoAttack: () => boolean = () => true;
  constructor(public kb: Keyboard, public touch: TouchControls, public auto: Autoplay) {}
  read(): number {
    if (this.auto.enabled) return this.auto.next();
    const t = this.touch.take(), p = this.pad.read();
    const buttons = this.kb.buttons() | t.buttons | p.buttons;
    const move = [this.kb.move(), p.move, t.move].find((m) => m >= 0) ?? -1;
    // auto attack aim: the mouse and right stick only aim skills, on the frame they're cast
    const skillNow = (buttons & (IN_S1 | IN_S2 | IN_S3)) !== 0, freeAim = !this.autoAttack() || skillNow;
    let aim = t.aim >= 0 ? t.aim : freeAim ? p.aim : -1, d = t.aim >= 0 ? t.dist : 0;
    this.preview = this.touch.preview.on ? this.touch.preview : { on: false, kind: "mouse", slot: 0, angle: 0, dist: 0 };
    if (aim < 0 && this.kb.mouseAims && this.screenToFloor && (freeAim || !this.autoAttack())) {
      const me = this.me(), at = this.screenToFloor(this.kb.mouse.x, this.kb.mouse.y);
      if (me && at) {
        aim = angleOf(at.x - me.x, at.y - me.y);
        d = halfTiles(dist(me.x, me.y, at.x, at.y));
        this.preview = { on: true, kind: "mouse", slot: 0, angle: aim, dist: d };
      }
    }
    return packInput(buttons, move, aim, d);
  }
}
