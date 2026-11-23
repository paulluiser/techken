import { describe, expect, it } from "vitest";
import * as C from "../src/sim/constants";
import { IN_ATTACK, IN_DASH, IN_LEFT, IN_RIGHT } from "../src/sim/input";
import { checksum, cloneState, initState, step, type State } from "../src/sim/sim";

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s; };
}
function randomInputs(seed: number, frames: number): [number, number][] {
  const r = lcg(seed), out: [number, number][] = [];
  let a = 0, b = 0;
  for (let i = 0; i < frames; i++) {
    if (r() % 9 === 0) a = r() & 63;
    if (r() % 9 === 0) b = r() & 63;
    out.push([a, b]);
  }
  return out;
}
function run(inputs: [number, number][]): { s: State; sums: number[] } {
  const s = initState(), sums: number[] = [];
  inputs.forEach((inp, i) => { step(s, inp); if (i % 100 === 0) sums.push(checksum(s)); });
  return { s, sums };
}

describe("sim determinism", () => {
  it("same inputs give the same checksums every time", () => {
    const inputs = randomInputs(42, 6000);
    const a = run(inputs), b = run(inputs);
    expect(a.sums).toEqual(b.sums);
    expect(checksum(a.s)).toBe(checksum(b.s));
  });

  it("different inputs diverge", () => {
    expect(checksum(run(randomInputs(1, 600)).s)).not.toBe(checksum(run(randomInputs(2, 600)).s));
  });

  it("clone + resume equals an uninterrupted run (what rollback relies on)", () => {
    const inputs = randomInputs(7, 1200);
    const full = run(inputs).s;
    const s = initState();
    inputs.slice(0, 500).forEach((i) => step(s, i));
    const snap = cloneState(s);
    inputs.slice(500, 520).forEach((i) => step(s, i)); // mutate the original
    const resumed = cloneState(snap);
    inputs.slice(500).forEach((i) => step(resumed, i));
    expect(checksum(resumed)).toBe(checksum(full));
  });

  it("only produces integers", () => {
    const { s } = run(randomInputs(9, 3000));
    for (const f of s.f) for (const v of Object.values(f)) expect(Number.isInteger(v)).toBe(true);
  });
});

describe("combat rules", () => {
  const closeUp = () => {
    const s = initState();
    s.f[0].x = 150 * C.SUB; s.f[1].x = 175 * C.SUB;
    return s;
  };

  it("a full charge (held 0.8 s) deals 70", () => {
    const s = closeUp();
    for (let i = 0; i < C.CHARGE_FULL; i++) step(s, [IN_ATTACK, 0]);
    for (let i = 0; i < 20; i++) step(s, [0, 0]);
    expect(s.f[1].hp).toBe(C.HP_MAX - 70);
  });

  it("a tap deals 25", () => {
    const s = closeUp();
    step(s, [IN_ATTACK, 0]); step(s, [IN_ATTACK, 0]);
    for (let i = 0; i < 20; i++) step(s, [0, 0]);
    expect(s.f[1].hp).toBe(C.HP_MAX - 25);
  });

  it("dashing costs 10 Motivation and gives i-frames", () => {
    const s = initState();
    step(s, [IN_DASH | IN_RIGHT, 0]);
    expect(s.f[0].mot).toBe(C.MOT_MAX - C.DASH_COST);
    expect(s.f[0].iframes).toBeGreaterThan(0);
  });

  it("spending to 0 Motivation causes Burnout, then recovery to 35", () => {
    const s = initState();
    s.f[0].mot = 500;
    step(s, [IN_DASH | IN_LEFT, 0]);
    expect(s.f[0].burnout).toBe(C.BURNOUT_FRAMES);
    for (let i = 0; i < C.BURNOUT_FRAMES; i++) step(s, [0, 0]);
    expect(s.f[0].burnout).toBe(0);
    expect(s.f[0].mot).toBeGreaterThanOrEqual(C.BURNOUT_RECOVER);
  });

  it("a KO ends the round and scores a point", () => {
    const s = closeUp();
    s.f[1].hp = 20;
    step(s, [IN_ATTACK, 0]); step(s, [IN_ATTACK, 0]);
    for (let i = 0; i < 10; i++) step(s, [0, 0]);
    expect(s.wins[0]).toBe(1);
  });
});
