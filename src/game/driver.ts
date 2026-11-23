// Runs the simulation at a fixed 60 Hz, either locally (attract/practice) or through the
// rollback session (online). Rendering reads `state` and never changes it.
import { SUB } from "../sim/constants";
import { IN_ATTACK, IN_LEFT, IN_RIGHT, IN_UP } from "../sim/input";
import { initState, step, type State } from "../sim/sim";
import { RollbackSession } from "../net/rollback";
import type { PeerLink } from "../net/transport";

const STEP_MS = 1000 / 60;

export type Mode = "attract" | "practice" | "online";

export interface InputReader { read(): number }

/** Simple CPU for practice/attract: walks in, holds a full charge, jumps now and then. */
export function dummyBot(s: State, who: 0 | 1): number {
  const me = s.f[who], you = s.f[1 - who];
  const dx = you.x - me.x;
  const t = (s.frame + who * 70) % 180;
  let b = 0;
  if ((dx > 0 ? dx : -dx) > 40 * SUB) b |= dx > 0 ? IN_RIGHT : IN_LEFT;
  else if (t < 50) b |= IN_ATTACK;
  if (t === 100 || t === 101) b |= IN_UP;
  return b;
}

export class Driver {
  mode: Mode = "attract";
  me: 0 | 1 = 0;
  session: RollbackSession | null = null;
  link: PeerLink | null = null;
  stalls = 0;
  lastStallAt = 0;
  private local: State = initState();
  private acc = 0;

  constructor(private input: InputReader) {}

  get state(): State { return this.mode === "online" && this.session ? this.session.state : this.local; }

  startAttract() { this.stopOnline(); this.mode = "attract"; this.local = initState(); this.acc = 0; }
  startPractice() { this.stopOnline(); this.mode = "practice"; this.me = 0; this.local = initState(); this.acc = 0; }
  startOnline(link: PeerLink, me: 0 | 1, delay: number) {
    this.mode = "online";
    this.me = me;
    this.link = link;
    this.acc = 0;
    this.session = new RollbackSession({ me, delay, send: (m) => link.sendGame(m), now: () => performance.now(), initial: initState() });
  }
  stopOnline() {
    this.link?.close();
    this.link = null;
    this.session = null;
  }

  private lastTime = 0;

  /** Call once per rendered frame. Uses the real clock (not the renderer's smoothed delta)
   *  so a slow or throttled display never makes this player fall behind in game time. */
  update() {
    const now = performance.now();
    const dt = this.lastTime ? now - this.lastTime : STEP_MS;
    this.lastTime = now;
    this.acc += Math.min(dt, 250);
    let n = 0;
    while (this.acc >= STEP_MS && n < 10) { this.tick(); this.acc -= STEP_MS; n++; }
    if (this.acc > STEP_MS * 10) this.acc = 0; // way behind (tab was hidden): don't spiral
  }

  private tick() {
    if (this.mode === "online" && this.session) {
      if (!this.session.tick(this.input.read())) { this.stalls++; this.lastStallAt = performance.now(); }
      return;
    }
    const p1 = this.mode === "practice" ? this.input.read() : dummyBot(this.local, 0);
    step(this.local, [p1, dummyBot(this.local, 1)]);
  }
}
