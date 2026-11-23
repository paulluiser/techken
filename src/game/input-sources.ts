import { IN_ATTACK, IN_DASH, IN_DOWN, IN_LEFT, IN_RIGHT, IN_UP } from "../sim/input";

const KEYMAP: Record<string, number> = {
  ArrowLeft: IN_LEFT, KeyA: IN_LEFT,
  ArrowRight: IN_RIGHT, KeyD: IN_RIGHT,
  ArrowUp: IN_UP, KeyW: IN_UP, Space: IN_UP,
  ArrowDown: IN_DOWN, KeyS: IN_DOWN,
  KeyJ: IN_ATTACK,
  KeyL: IN_DASH, ShiftLeft: IN_DASH, ShiftRight: IN_DASH,
};

export class Keyboard {
  private down = new Set<string>();
  enabled = true;
  constructor() {
    addEventListener("keydown", (e) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      if (e.code in KEYMAP) { this.down.add(e.code); if (this.enabled) e.preventDefault(); }
    });
    addEventListener("keyup", (e) => this.down.delete(e.code));
    addEventListener("blur", () => this.down.clear());
  }
  bits(): number {
    let b = 0;
    for (const k of this.down) b |= KEYMAP[k] ?? 0;
    return b;
  }
}

/** On-screen buttons: any element with data-bit inside the container. Multi-touch safe. */
export class TouchPad {
  private held = new Map<number, number>(); // pointerId -> bit
  constructor(root: HTMLElement) {
    for (const el of root.querySelectorAll<HTMLElement>("[data-bit]")) {
      const bit = Number(el.dataset.bit);
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el.setPointerCapture?.(e.pointerId);
        this.held.set(e.pointerId, bit);
        el.classList.add("on");
        navigator.vibrate?.(bit === IN_ATTACK ? 8 : 4);
      });
      const up = (e: PointerEvent) => { this.held.delete(e.pointerId); el.classList.remove("on"); };
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("lostpointercapture", up);
      el.addEventListener("contextmenu", (e) => e.preventDefault());
    }
  }
  bits(): number {
    let b = 0;
    for (const v of this.held.values()) b |= v;
    return b;
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
      if (r < 0.35) b |= IN_LEFT; else if (r < 0.7) b |= IN_RIGHT;
      if (Math.random() < 0.35) b |= IN_ATTACK;
      if (Math.random() < 0.12) b |= IN_UP;
      if (Math.random() < 0.06) b |= IN_DASH;
      if (Math.random() < 0.05) b |= IN_DOWN;
      this.cur = b;
      this.left = 6 + Math.floor(Math.random() * 40);
    }
    return this.cur;
  }
}

export class CombinedInput {
  constructor(public kb: Keyboard, public touch: TouchPad, public auto: Autoplay) {}
  read(): number {
    return this.kb.bits() | this.touch.bits() | (this.auto.enabled ? this.auto.next() : 0);
  }
}
