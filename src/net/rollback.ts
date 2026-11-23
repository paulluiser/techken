// GGPO-style rollback session for two players.
//
// Each tick:
//   1. the local input is scheduled `delay` frames ahead and sent (with redundancy)
//   2. if a remote input arrived that differs from what we predicted, we load the saved
//      state from that frame and re-simulate up to now
//   3. the current frame is simulated with the real remote input if we have it, otherwise
//      a prediction (repeat the last confirmed remote input)
// Saved states let us rewind; checksums of fully confirmed frames detect desyncs.
import { checksum, cloneState, step, type State } from "../sim/sim";
import type { GameMsg } from "./protocol";

export const RING = 128; // saved states kept
export const MAX_ROLLBACK = 8; // stall instead of predicting further than this
export const CHECK_EVERY = 60; // checksum one confirmed frame per second
const RESEND_WINDOW = 60;

export interface SessionStats {
  rollbacks: number;
  rolledFrames: number;
  maxRollback: number;
  stalls: number;
  syncStalls: number;
  pingMs: number;
  advantage: number;
  confirmed: number;
  checksOk: number;
  desync: boolean;
  desyncFrame: number;
  lastHeard: number;
}

export interface SessionOptions {
  me: 0 | 1;
  delay: number;
  send: (m: GameMsg) => void;
  now: () => number; // ms clock (injectable for tests)
  initial: State;
}

export class RollbackSession {
  readonly me: 0 | 1;
  readonly delay: number;
  frame = 0; // next frame to simulate
  state: State;
  stats: SessionStats;

  private send: (m: GameMsg) => void;
  private now: () => number;
  private saved: ({ frame: number; s: State } | null)[] = new Array(RING).fill(null);
  private local = new Map<number, number>();
  private remote = new Map<number, number>();
  private predicted = new Map<number, number>();
  private lastRemote = -1; // highest frame with all remote inputs confirmed
  private remoteAck = -1; // highest local frame the peer has confirmed
  private remoteFrame = 0; // peer's last reported "next frame"
  private rollbackFrom = Number.POSITIVE_INFINITY;
  private myChecks = new Map<number, number>();
  private theirChecks = new Map<number, number>();
  private nextCheck = CHECK_EVERY;
  private ticks = 0;
  private lastSyncStall = -100;

  constructor(o: SessionOptions) {
    this.me = o.me;
    this.delay = o.delay;
    this.send = o.send;
    this.now = o.now;
    this.state = cloneState(o.initial);
    for (let f = 0; f < this.delay; f++) this.local.set(f, 0);
    this.stats = {
      rollbacks: 0, rolledFrames: 0, maxRollback: 0, stalls: 0, syncStalls: 0, pingMs: 0,
      advantage: 0, confirmed: -1, checksOk: 0, desync: false, desyncFrame: -1, lastHeard: o.now(),
    };
  }

  /** Feed a message from the peer. */
  onMessage(m: GameMsg) {
    this.stats.lastHeard = this.now();
    switch (m.t) {
      case "in": {
        for (let k = 0; k < m.a.length; k++) {
          const g = m.s + k;
          if (g <= this.lastRemote || this.remote.has(g)) continue; // already confirmed
          this.remote.set(g, m.a[k]);
          if (g < this.frame && this.predicted.get(g) !== m.a[k]) {
            if (g < this.rollbackFrom) this.rollbackFrom = g;
          }
        }
        while (this.remote.has(this.lastRemote + 1)) this.lastRemote++;
        if (m.ack > this.remoteAck) this.remoteAck = m.ack;
        if (m.f > this.remoteFrame) this.remoteFrame = m.f;
        this.stats.confirmed = this.lastRemote;
        break;
      }
      case "cs": {
        this.theirChecks.set(m.f, m.h);
        this.compareCheck(m.f);
        break;
      }
      case "ping":
        this.send({ t: "pong", ts: m.ts });
        break;
      case "pong": {
        const rtt = this.now() - m.ts;
        this.stats.pingMs = this.stats.pingMs === 0 ? rtt : Math.round(this.stats.pingMs * 0.8 + rtt * 0.2);
        break;
      }
    }
  }

  /** Advance one frame with this tick's local input. Returns false if we had to wait. */
  tick(localInput: number): boolean {
    this.ticks++;
    if (this.ticks % 30 === 1) this.send({ t: "ping", ts: this.now() });

    // Too far ahead of confirmed remote input: wait instead of predicting further.
    if (this.frame - this.lastRemote > MAX_ROLLBACK) {
      this.stats.stalls++;
      this.applyRollback();
      this.sendInputs();
      return false;
    }
    // Time sync: if we're consistently ahead of the peer, skip a frame now and then so
    // the side with the better connection doesn't do all the rolling back.
    const rttFrames = Math.round(this.stats.pingMs / (1000 / 60));
    const adv = this.frame - (this.remoteFrame + Math.trunc(rttFrames / 2));
    this.stats.advantage = adv;
    if (adv > 2 && this.ticks - this.lastSyncStall > 8) {
      this.lastSyncStall = this.ticks;
      this.stats.syncStalls++;
      this.sendInputs();
      return false;
    }

    const target = this.frame + this.delay;
    if (!this.local.has(target)) this.local.set(target, localInput & 63);

    this.applyRollback();
    this.simulate(this.frame);
    this.frame++;
    this.doChecksums();
    this.prune();
    this.sendInputs();
    return true;
  }

  /** Inputs actually used for a frame (for tests/replays). */
  inputsFor(frame: number): [number, number] | null {
    const l = this.local.get(frame), r = this.remote.get(frame);
    if (l === undefined || r === undefined) return null;
    return this.me === 0 ? [l, r] : [r, l];
  }

  confirmedFrame() { return this.lastRemote; }

  private applyRollback() {
    if (this.rollbackFrom >= this.frame) { this.rollbackFrom = Number.POSITIVE_INFINITY; return; }
    const from = this.rollbackFrom;
    this.rollbackFrom = Number.POSITIVE_INFINITY;
    const snap = this.saved[from % RING];
    if (!snap || snap.frame !== from) throw new Error(`rollback target ${from} not saved (now ${this.frame})`);
    this.state = cloneState(snap.s);
    const n = this.frame - from;
    for (let g = from; g < this.frame; g++) this.simulate(g);
    this.stats.rollbacks++;
    this.stats.rolledFrames += n;
    if (n > this.stats.maxRollback) this.stats.maxRollback = n;
  }

  private remoteInputFor(g: number): { v: number; confirmed: boolean } {
    const r = this.remote.get(g);
    if (r !== undefined) return { v: r, confirmed: true };
    // predict: repeat the latest remote input we know at or before g
    let k = Math.min(g, this.lastRemote);
    while (k >= 0 && !this.remote.has(k)) k--;
    return { v: k >= 0 ? this.remote.get(k)! : 0, confirmed: false };
  }

  private simulate(g: number) {
    this.saved[g % RING] = { frame: g, s: cloneState(this.state) };
    const l = this.local.get(g) ?? 0;
    const r = this.remoteInputFor(g);
    if (r.confirmed) this.predicted.delete(g); else this.predicted.set(g, r.v);
    step(this.state, this.me === 0 ? [l, r.v] : [r.v, l]);
  }

  private doChecksums() {
    // state after frame c == state saved before frame c+1
    while (this.nextCheck <= this.lastRemote && this.nextCheck + 1 < this.frame) {
      const c = this.nextCheck;
      this.nextCheck += CHECK_EVERY;
      const snap = this.saved[(c + 1) % RING];
      if (!snap || snap.frame !== c + 1) continue;
      const h = checksum(snap.s);
      this.myChecks.set(c, h);
      this.send({ t: "cs", f: c, h });
      this.compareCheck(c);
    }
  }

  private compareCheck(c: number) {
    const a = this.myChecks.get(c), b = this.theirChecks.get(c);
    if (a === undefined || b === undefined) return;
    if (a === b) this.stats.checksOk++;
    else if (!this.stats.desync) { this.stats.desync = true; this.stats.desyncFrame = c; }
    this.myChecks.delete(c); this.theirChecks.delete(c);
  }

  private sendInputs() {
    const last = this.frame + this.delay - 1; // highest local frame we have an input for
    const s = Math.max(this.remoteAck + 1, last - RESEND_WINDOW + 1, 0);
    const a: number[] = [];
    for (let g = s; g <= last; g++) a.push(this.local.get(g) ?? 0);
    this.send({ t: "in", s, a, ack: this.lastRemote, f: this.frame });
  }

  private prune() {
    const old = this.frame - RING - 8;
    if (old <= 0 || this.frame % 32 !== 0) return;
    for (const m of [this.local, this.predicted]) for (const k of m.keys()) if (k < old) m.delete(k);
    for (const k of this.remote.keys()) if (k < Math.min(old, this.lastRemote - RING)) this.remote.delete(k);
    for (const m of [this.myChecks, this.theirChecks]) for (const k of m.keys()) if (k < old - 600) m.delete(k);
  }
}
