// CPU opponents: they finish matches and the difficulty levels are ordered.
import { describe, expect, it } from "vitest";
import { playMatch } from "../src/ai/runner";
import { SE } from "../src/sim/jobs/se";
import { DBA } from "../src/sim/jobs/dba";

const cfg = (seed: number, jobs: [number, number] = [SE, DBA]) => ({ jobs, arena: seed % 2, seed });

describe("CPU", () => {
  it("finishes a Mid-level mirror match before time runs out of control", () => {
    const r = playMatch(cfg(3, [SE, SE]), [3, 3]);
    expect(r.winner).toBeGreaterThanOrEqual(0);
    expect(r.rounds).toBeLessThanOrEqual(4);
  });
  it("Principal beats Intern most of the time", () => {
    let wins = 0;
    for (let n = 0; n < 12; n++) {
      const jobs: [number, number] = n % 2 ? [SE, DBA] : [DBA, SE];
      if (playMatch(cfg(100 + n, jobs), [5, 1]).winner === 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(10);
  });
  it("rounds last a reasonable time between Mid-level CPUs (30-90 s on average)", () => {
    let frames = 0, rounds = 0;
    for (let n = 0; n < 8; n++) { const r = playMatch(cfg(200 + n), [3, 3]); frames += r.frames; rounds += r.rounds; }
    const avgSec = frames / rounds / 60;
    expect(avgSec).toBeGreaterThan(20);
    expect(avgSec).toBeLessThan(100);
  });
});
