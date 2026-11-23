// Balance runner: every kit plays every other kit, from both sides, CPU Senior vs Senior.
// Run with:  npm run balance   (writes design/balance-report.md)
import { writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { KITS, kitOf, matchConfig, playMatch } from "../src/ai/runner";
import { JOBS } from "../src/sim/registry";

const RUN = !!process.env.BALANCE;

describe.skipIf(!RUN)("balance", () => {
  it("round-robin", () => {
    const LEVEL = Number(process.env.BALANCE_LEVEL ?? 4);
    const wins = new Array(KITS).fill(0), games = new Array(KITS).fill(0), draws = new Array(KITS).fill(0);
    const vs: number[][] = Array.from({ length: KITS }, () => new Array(KITS).fill(0));
    let seed = 1, frames = 0;
    const t0 = Date.now();
    for (let a = 0; a < KITS; a++) for (let b = 0; b < KITS; b++) {
      if (a === b) continue;
      const r = playMatch(matchConfig(a, b, seed++), [LEVEL, LEVEL]);
      frames += r.frames;
      games[a]++; games[b]++;
      if (r.winner === 0) { wins[a]++; vs[a][b]++; } else if (r.winner === 1) { wins[b]++; vs[b][a]++; } else { draws[a]++; draws[b]++; }
    }
    const secs = (Date.now() - t0) / 1000;
    const name = (k: number) => `${JOBS[kitOf(k).job]!.name} ${"AB"[kitOf(k).set]} "${JOBS[kitOf(k).job]!.sets[kitOf(k).set].name}"`;
    const rows = [...Array(KITS).keys()].map((k) => ({ k, rate: wins[k] / games[k] })).sort((x, y) => y.rate - x.rate);
    const flag = (r: number) => (r > 0.55 ? "⬆ too strong" : r < 0.45 ? "⬇ too weak" : "ok");
    const out = [
      "# Techken balance report",
      "",
      `CPU level ${LEVEL} vs ${LEVEL}, every kit against every other kit from both sides (${KITS * (KITS - 1)} matches, ${frames.toLocaleString()} frames in ${secs.toFixed(0)} s). Random arenas, items and hazards on. Target: every kit between 45 % and 55 %.`,
      "",
      "These numbers measure kits as the CPU plays them, so they flag outliers to look at, not final truth. Regenerate with `npm run balance`.",
      "",
      "| # | Kit | Win rate | Wins | Draws | Games | |",
      "|---|---|---|---|---|---|---|",
      ...rows.map((r, n) => `| ${n + 1} | ${name(r.k)} | ${(r.rate * 100).toFixed(1)} % | ${wins[r.k]} | ${draws[r.k]} | ${games[r.k]} | ${flag(r.rate)} |`),
      "",
      `Spread: ${(rows[rows.length - 1].rate * 100).toFixed(1)} % – ${(rows[0].rate * 100).toFixed(1)} %. Kits in the 45–55 % band: ${rows.filter((r) => r.rate >= 0.45 && r.rate <= 0.55).length} of ${KITS}.`,
      "",
    ];
    writeFileSync("design/balance-report.md", out.join("\n"));
    console.log(out.slice(0, 4).join("\n"));
  }, 3_600_000);
});
