// Two rollback sessions talking through a fake network with latency, jitter and packet loss.
// They must agree on every confirmed checksum and end in exactly the state a single
// authoritative simulation reaches with the same inputs.
import { describe, expect, it } from "vitest";
import { RollbackSession } from "../src/net/rollback";
import type { GameMsg } from "../src/net/protocol";
import { checksum, initState, step } from "../src/sim/sim";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

interface Net { minDelay: number; maxDelay: number; loss: number }

function play(net: Net, ticks: number, delays: [number, number], seed = 1) {
  const r = rng(seed);
  let clock = 0;
  const now = () => clock;
  const queues: { at: number; m: GameMsg }[][] = [[], []]; // queues[i] = messages to session i
  const sendFrom = (from: 0 | 1) => (m: GameMsg) => {
    if (m.t === "in" && r() < net.loss) return;
    const d = net.minDelay + Math.floor(r() * (net.maxDelay - net.minDelay + 1));
    queues[1 - from].push({ at: clock + d * (1000 / 60), m: JSON.parse(JSON.stringify(m)) });
  };
  const sess = [
    new RollbackSession({ me: 0, delay: delays[0], send: sendFrom(0), now, initial: initState() }),
    new RollbackSession({ me: 1, delay: delays[1], send: sendFrom(1), now, initial: initState() }),
  ];
  // what each player actually pressed, by the frame it applies to
  const log: Map<number, number>[] = [new Map(), new Map()];
  const cur = [0, 0], left = [0, 0];
  const nextInput = (i: number) => {
    if (--left[i] <= 0) { cur[i] = Math.floor(r() * 64); left[i] = 3 + Math.floor(r() * 25); }
    return cur[i];
  };
  for (let t = 0; t < ticks; t++) {
    clock += 1000 / 60;
    for (const i of [0, 1] as const) {
      const due = queues[i].filter((q) => q.at <= clock);
      queues[i] = queues[i].filter((q) => q.at > clock);
      for (const q of due) sess[i].onMessage(q.m);
    }
    for (const i of [0, 1] as const) {
      const inp = t < ticks - 180 ? nextInput(i) : 0; // idle tail so everything gets confirmed
      const f = sess[i].frame;
      if (sess[i].tick(inp) && !log[i].has(f + delays[i])) log[i].set(f + delays[i], inp);
    }
  }
  return { sess, log };
}

/** Straight simulation (no rollback) to frame n with the inputs players really pressed. */
function reference(log: Map<number, number>[], n: number) {
  const s = initState();
  for (let f = 0; f < n; f++) step(s, [log[0].get(f) ?? 0, log[1].get(f) ?? 0]);
  return checksum(s);
}

function expectMatchesReference(sess: RollbackSession[], log: Map<number, number>[]) {
  for (const s of sess) expect(checksum(s.state)).toBe(reference(log, s.frame));
}

describe("rollback session", () => {
  it("stays in sync on a clean connection", () => {
    const { sess, log } = play({ minDelay: 1, maxDelay: 2, loss: 0 }, 3000, [2, 2]);
    for (const s of sess) { expect(s.stats.desync).toBe(false); expect(s.stats.checksOk).toBeGreaterThan(20); }
    expectMatchesReference(sess, log);
  });

  it("stays in sync with ~150 ms jittery latency and 15 % packet loss", () => {
    const { sess, log } = play({ minDelay: 3, maxDelay: 9, loss: 0.15 }, 4000, [2, 2], 99);
    for (const s of sess) {
      expect(s.stats.desync).toBe(false);
      expect(s.stats.rollbacks).toBeGreaterThan(50); // rollback really happened
      expect(s.stats.maxRollback).toBeLessThanOrEqual(10);
      expect(s.stats.checksOk).toBeGreaterThan(20);
    }
    expectMatchesReference(sess, log);
  });

  it("works when the two players use different input delays", () => {
    const { sess, log } = play({ minDelay: 2, maxDelay: 5, loss: 0.05 }, 2500, [1, 3], 5);
    for (const s of sess) expect(s.stats.desync).toBe(false);
    expectMatchesReference(sess, log);
  });

  it("survives many seeds of bad networks", () => {
    for (let seed = 200; seed < 230; seed++) {
      const { sess, log } = play({ minDelay: 1, maxDelay: 12, loss: 0.2 }, 1500, [2, 2], seed);
      for (const s of sess) expect(s.stats.desync).toBe(false);
      expectMatchesReference(sess, log);
    }
  });
});
