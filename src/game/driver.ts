// Runs the simulation at a fixed 60 Hz, either locally (attract/practice) or through the
// rollback session (online). Rendering reads `state` and never changes it.
import { cpuInput, newCpu, type CpuMem } from "../ai/cpu";
import { ARENAS } from "../sim/arenas";
import { implementedJobs } from "../sim/jobs";
import { DEFAULT_CONFIG, initState, step, type MatchConfig, type State } from "../sim/sim";
import { RollbackSession } from "../net/rollback";
import type { PeerLink } from "../net/transport";

const STEP_MS = 1000 / 60;

export type Mode = "attract" | "practice" | "online";
export interface InputReader { read(): number }

export { implementedJobs };

export function randomConfig(arena?: number): MatchConfig {
  const jobs = implementedJobs();
  const r = (n: number) => Math.floor(Math.random() * n);
  return {
    ...DEFAULT_CONFIG,
    jobs: [jobs[r(jobs.length)], jobs[r(jobs.length)]],
    arena: arena ?? r(ARENAS.length),
    seed: (Math.random() * 2 ** 31) | 0,
    loop: true,
  };
}

export class Driver {
  mode: Mode = "attract";
  me: 0 | 1 = 0;
  session: RollbackSession | null = null;
  link: PeerLink | null = null;
  stalls = 0;
  lastStallAt = 0;
  paused = false;
  cpuLevel = 3;
  private cpu: [CpuMem, CpuMem] = [newCpu(1), newCpu(2)];
  epoch = 0;
  /** Cosmetic, not part of the sim: names and palettes for the renderer. */
  view = { names: ["", ""] as [string, string], palettes: [0, 0] as [number, number] };
  private local: State = initState(randomConfig());
  private acc = 0;
  private lastTime = 0;

  constructor(private input: InputReader) {}

  get state(): State { return this.mode === "online" && this.session ? this.session.state : this.local; }

  startAttract() { this.stopOnline(); this.mode = "attract"; this.local = initState(randomConfig()); this.acc = 0; this.cpu = [newCpu(Date.now()), newCpu(Date.now() + 1)]; }
  startPractice(cfg: MatchConfig, level = this.cpuLevel) { this.stopOnline(); this.mode = "practice"; this.me = 0; this.cpuLevel = level; this.local = initState(cfg); this.acc = 0; this.cpu = [newCpu(cfg.seed), newCpu(cfg.seed ^ 0x5bd1e995)]; }
  startOnline(link: PeerLink, me: 0 | 1, delay: number, cfg: MatchConfig) {
    this.mode = "online";
    this.me = me;
    this.link = link;
    this.acc = 0;
    const epoch = (this.epoch = cfg.seed);
    this.session = new RollbackSession({ me, delay, send: (m) => link.sendGame({ ...m, e: epoch }), now: () => performance.now(), initial: initState(cfg) });
  }
  /** Rematch / re-pick keep the connection but start a fresh session. */
  keepLink(): PeerLink | null { const l = this.link; this.link = null; this.session = null; return l; }
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
    if (this.paused) return;
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
    const p1 = this.mode === "practice" ? this.input.read() : cpuInput(this.local, 0, 3, this.cpu[0]);
    step(this.local, [p1, cpuInput(this.local, 1, this.mode === "practice" ? this.cpuLevel : 3, this.cpu[1])]);
  }
}
