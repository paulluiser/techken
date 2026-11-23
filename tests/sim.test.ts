import { describe, expect, it } from "vitest";
import * as C from "../src/sim/constants";
import { ARENAS } from "../src/sim/arenas";
import { ITEMS } from "../src/sim/items";
import { IN_ATTACK, IN_DASH, IN_GUARD, IN_LEFT, IN_RIGHT, IN_S1, IN_S2, IN_S3 } from "../src/sim/input";
import { JOBS } from "../src/sim/registry";
import { checksum, cloneState, DEFAULT_CONFIG, initState, step, type MatchConfig, type State } from "../src/sim/sim";
import { S } from "../src/sim/types";
import { stun } from "../src/sim/core";

const IMPL = JOBS.map((j, k) => (j ? k : -1)).filter((k) => k >= 0);

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
}
function randomInputs(seed: number, frames: number): [number, number][] {
  const r = lcg(seed), out: [number, number][] = [];
  let a = 0, b = 0;
  for (let i = 0; i < frames; i++) {
    if (r() % 9 === 0) a = r() & 1023;
    if (r() % 9 === 0) b = r() & 1023;
    out.push([a, b]);
  }
  return out;
}
function run(cfg: MatchConfig, inputs: [number, number][]): { s: State; sums: number[] } {
  const s = initState(cfg), sums: number[] = [];
  inputs.forEach((inp, i) => { step(s, inp); if (i % 100 === 0) sums.push(checksum(s)); });
  return { s, sums };
}
const cfg = (a: number, b: number, sa = 0, sb = 0, arena = 0, items = false): MatchConfig =>
  ({ ...DEFAULT_CONFIG, jobs: [a, b], sets: [sa, sb], arena, items });

describe("sim determinism", () => {
  it("implements all 17 jobs", () => {
    expect(IMPL).toEqual([...Array(17).keys()]);
  });

  it("every job pairing, set and arena replays identically (with items and skills)", () => {
    let n = 0;
    for (const a of IMPL) for (const b of IMPL) {
      const c = { ...cfg(a, b, n % 2, (n >> 1) % 2, n % ARENAS.length, true), seed: 1000 + n };
      const inputs = randomInputs(77 + n, 2400);
      const x = run(c, inputs), y = run(c, inputs);
      expect(x.sums).toEqual(y.sums);
      n++;
    }
  });

  it("clone + resume equals an uninterrupted run (what rollback relies on)", () => {
    const c = { ...cfg(16, 8, 0, 1, 4, true), seed: 9 };
    const inputs = randomInputs(7, 1800);
    const full = run(c, inputs).s;
    const s = initState(c);
    inputs.slice(0, 700).forEach((i) => step(s, i));
    const snap = cloneState(s);
    inputs.slice(700, 760).forEach((i) => step(s, i));
    const resumed = cloneState(snap);
    inputs.slice(700).forEach((i) => step(resumed, i));
    expect(checksum(resumed)).toBe(checksum(full));
  });

  it("keeps all numbers integers", () => {
    for (const a of IMPL) {
      const { s } = run({ ...cfg(a, IMPL[(IMPL.indexOf(a) + 1) % IMPL.length], 1, 0, 2, true), seed: a + 1 }, randomInputs(9 + a, 2000));
      for (const f of s.f) {
        for (const v of Object.values(f)) if (typeof v === "number") expect(Number.isInteger(v)).toBe(true);
        for (const arr of [f.st, f.res, f.cd]) for (const v of arr) expect(Number.isInteger(v)).toBe(true);
      }
      for (const e of s.ents) for (const v of Object.values(e)) if (typeof v === "number") expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("core rules", () => {
  const closeUp = (a = 0, b = 0) => {
    const s = initState(cfg(a, b));
    s.f[0].x = 150 * C.SUB; s.f[1].x = 175 * C.SUB;
    return s;
  };
  const idle = (s: State, n: number, inp: [number, number] = [0, 0]) => { for (let i = 0; i < n; i++) step(s, inp); };

  it("a Software Engineer full charge (0.8 s) deals 70, a tap 25", () => {
    const s = closeUp();
    idle(s, 48, [IN_ATTACK, 0]); idle(s, 20);
    expect(s.f[1].hp).toBe(C.HP_MAX - 70);
    const t = closeUp();
    idle(t, 2, [IN_ATTACK, 0]); idle(t, 20);
    expect(t.f[1].hp).toBe(C.HP_MAX - 25);
  });

  it("guard blocks 70 % and costs 5 Motivation; a full charge breaks it", () => {
    const s = closeUp();
    idle(s, 2, [IN_ATTACK, IN_GUARD]); idle(s, 20, [0, IN_GUARD]);
    expect(s.f[1].hp).toBe(C.HP_MAX - Math.trunc(25 * 0.3));
    expect(s.f[1].mot).toBeLessThan(C.MOT_MAX);
    const t = closeUp();
    idle(t, 48, [IN_ATTACK, IN_GUARD]); idle(t, 20, [0, IN_GUARD]);
    expect(t.f[1].hp).toBe(C.HP_MAX - 70);
  });

  it("skills spend Motivation, start their cooldown, and Crunch Cast burns you out", () => {
    const s = closeUp();
    step(s, [IN_S1, 0]);
    expect(s.f[0].cd[0]).toBeGreaterThan(0);
    expect(s.f[0].mot).toBe(C.MOT_MAX - 2000);
    const t = closeUp();
    t.f[0].mot = 500;
    step(t, [IN_S3, 0]);
    expect(t.f[0].burnout).toBe(C.BURNOUT_FRAMES);
  });

  it("dashing costs 10 Motivation and gives i-frames", () => {
    const s = initState(cfg(0, 0));
    step(s, [IN_DASH | IN_RIGHT, 0]);
    expect(s.f[0].mot).toBe(C.MOT_MAX - C.DASH_COST);
    expect(s.f[0].iframes).toBeGreaterThan(0);
  });

  it("hard CC is capped at 1.5 s and followed by 1 s of immunity", () => {
    const s = initState(cfg(0, 0));
    stun(s, 1, 500);
    expect(s.f[1].st[S.STUN]).toBe(C.HARD_CC_MAX);
    idle(s, C.HARD_CC_MAX);
    expect(s.f[1].st[S.STUN]).toBe(0);
    expect(stun(s, 1, 60)).toBe(false);
  });

  it("a KO ends the round and scores a point", () => {
    const s = closeUp();
    s.f[1].hp = 20;
    idle(s, 2, [IN_ATTACK, 0]); idle(s, 10);
    expect(s.wins[0]).toBe(1);
  });

  it("items spawn from the seeded RNG and apply when walked over", () => {
    const s = initState({ ...cfg(0, 0, 0, 0, 0, true), seed: 5 });
    idle(s, C.ITEM_FIRST + 1);
    expect(s.items.length).toBe(1);
    const it = s.items[0];
    s.f[0].x = it.x; s.f[0].y = it.y;
    step(s, [0, 0]);
    expect(s.items.length).toBe(0);
    expect(ITEMS[it.kind]).toBeDefined();
  });

  it("every skill of every implemented job can be cast without errors", () => {
    for (const a of IMPL) for (const set of [0, 1]) {
      const s = closeUp(a, 0);
      s.f[0].job = a; s.f[0].set = set;
      for (const b of [IN_S1, IN_S2, IN_S3]) { step(s, [b, 0]); idle(s, 40); }
      idle(s, 300, [IN_LEFT, IN_RIGHT]);
      expect(s.f[0].hp).toBeGreaterThan(0);
    }
  });
});
