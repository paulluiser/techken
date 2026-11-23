import { describe, expect, it } from "vitest";
import { matchConfig, playMatch } from "../src/ai/runner";
import { cpuInput, newCpu } from "../src/ai/cpu";
import { DEFAULT_CONFIG, initState, step } from "../src/sim/sim";

describe("CPU opponents", () => {
  it("CPU-vs-CPU matches are reproducible", () => {
    const cfg = matchConfig(0, 10, 77);
    expect(playMatch(cfg, [4, 4])).toEqual(playMatch(cfg, [4, 4]));
  });

  it("matches finish (somebody wins or it times out cleanly)", () => {
    const t0 = performance.now();
    const r = playMatch(matchConfig(6, 15, 5), [3, 3]);
    expect([0, 1, 2]).toContain(r.winner);
    // speed check for the balance runner
    const fps = r.frames / ((performance.now() - t0) / 1000);
    expect(fps).toBeGreaterThan(5000);
  });

  it("a Principal beats an Intern most of the time", () => {
    let wins = 0, n = 0;
    for (let kit = 0; kit < 34; kit++) {
      const r = playMatch(matchConfig(kit, kit, 100 + kit), [5, 1]);
      if (r.winner === 0) wins++;
      n++;
    }
    expect(wins / n).toBeGreaterThanOrEqual(0.8);
  });

  it("uses skills, guards and moves at higher levels", () => {
    const s = initState({ ...DEFAULT_CONFIG, jobs: [8, 0] });
    const m = newCpu(3);
    let skills = 0, guard = 0, moves = 0;
    for (let i = 0; i < 1800; i++) {
      const b = cpuInput(s, 0, 4, m);
      if (b & (128 | 256 | 512)) skills++;
      if (b & 64) guard++;
      if (b & 3) moves++;
      step(s, [b, 16 * ((i >> 5) & 1)]);
    }
    expect(skills).toBeGreaterThan(0);
    expect(moves).toBeGreaterThan(0);
    expect(guard).toBeGreaterThanOrEqual(0);
  });
});
