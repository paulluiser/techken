// Runs the simulation at a fixed 60 Hz, either locally (attract/practice) or through the
// rollback session (online). Rendering reads `state` and never changes it.
import { SUB } from "../sim/constants";
import { IN_ATTACK, IN_GUARD, IN_LEFT, IN_RIGHT, IN_S1, IN_S2, IN_S3, IN_UP } from "../sim/input";
import { JOBS } from "../sim/registry";
import { DEFAULT_CONFIG, initState, step, type MatchConfig, type State } from "../sim/sim";
import { RollbackSession } from "../net/rollback";
import type { PeerLink } from "../net/transport";

const STEP_MS = 1000 / 60;

export type Mode = "attract" | "practice" | "online";
export interface InputReader { read(): number }

export const implementedJobs = () => JOBS.map((j, k) => (j ? k : -1)).filter((k) => k >= 0);

/** Simple CPU for practice/attract: walks in, charges, uses skills now and then. */
export function dummyBot(s: State, who: 0 | 1): number {
  const me = s.f[who], you = s.f[1 - who];
  const dx = you.x - me.x, adx = dx > 0 ? dx : -dx;
  const t = (s.frame + who * 70) % 240;
  let b = 0;
  if (adx > 44 * SUB && t < 150) b |= dx > 0 ? IN_RIGHT : IN_LEFT;
  else if (t < 50) b |= IN_ATTACK;
  if (t === 100 || t === 101) b |= IN_UP;
  if (t === 60) b |= IN_S1;
  if (t === 140) b |= IN_S2;
  if (t === 200) b |= IN_S3;
  if (t > 210 && you.charging) b |= IN_GUARD;
  return b;
}

export function randomConfig(arena?: number): MatchConfig {
  const jobs = implementedJobs();
  const r = (n: number) => Math.floor(Math.random() * n);
  return {
    ...DEFAULT_CONFIG,
    jobs: [jobs[r(jobs.length)], jobs[r(jobs.length)]],
    sets: [r(2), r(2)],
    arena: arena ?? r(13),
    seed: (Math.random() * 2 ** 31) | 0,
  };
}

export class Driver {
  mode: Mode = "attract";
  me: 0 | 1 = 0;
  session: RollbackSession | null = null;
  link: PeerLink | null = null;
  stalls = 0;
  lastStallAt = 0;
  private local: State = initState(randomConfig());
  private acc = 0;
  private lastTime = 0;

  constructor(private input: InputReader) {}

  get state(): State { return this.mode === "online" && this.session ? this.session.state : this.local; }

  startAttract() { this.stopOnline(); this.mode = "attract"; this.local = initState(randomConfig()); this.acc = 0; }
  startPractice(cfg: MatchConfig) { this.stopOnline(); this.mode = "practice"; this.me = 0; this.local = initState(cfg); this.acc = 0; }
  startOnline(link: PeerLink, me: 0 | 1, delay: number, cfg: MatchConfig) {
    this.mode = "online";
    this.me = me;
    this.link = link;
    this.acc = 0;
    this.session = new RollbackSession({ me, delay, send: (m) => link.sendGame(m), now: () => performance.now(), initial: initState(cfg) });
  }
  stopOnline() {
    this.link?.close();
    this.link = null;
    this.session = null;
  }

  /** Steps by the real clock (not the renderer's smoothed delta). Safe to call often. */
  update() {
    const now = performance.now();
    const dt = this.lastTime ? now - this.lastTime : STEP_MS;
    this.lastTime = now;
    this.acc += Math.min(dt, 250);
    let n = 0;
    while (this.acc >= STEP_MS && n < 10) { this.tick(); this.acc -= STEP_MS; n++; }
    if (this.acc > STEP_MS * 10) this.acc = 0;
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
