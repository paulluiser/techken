// Headless CPU-vs-CPU matches (no browser, no renderer). Used by the balance runner and tests.
import * as C from "../sim/constants";
import { DEFAULT_CONFIG, initState, PHASE_MATCH_END, step, type MatchConfig } from "../sim/sim";
import { cpuInput, newCpu } from "./cpu";

export interface MatchResult { winner: number; frames: number; wins: [number, number]; hp: [number, number] }

export function playMatch(cfg: MatchConfig, levels: [number, number], maxFrames = 3 * C.ROUND_FRAMES + 3000): MatchResult {
  const s = initState({ ...cfg, loop: false });
  const mem = [newCpu(cfg.seed * 31 + 1), newCpu(cfg.seed * 17 + 2)] as const;
  let n = 0;
  while (s.phase !== PHASE_MATCH_END && n < maxFrames) {
    step(s, [cpuInput(s, 0, levels[0], mem[0]), cpuInput(s, 1, levels[1], mem[1])]);
    n++;
  }
  const w = s.phase === PHASE_MATCH_END ? s.matchWinner : s.wins[0] === s.wins[1] ? 2 : s.wins[0] > s.wins[1] ? 0 : 1;
  return { winner: w, frames: n, wins: [s.wins[0], s.wins[1]], hp: [s.f[0].hp, s.f[1].hp] };
}

export const kitOf = (k: number) => ({ job: k >> 1, set: k & 1 }); // 34 kits: job*2+set
export const KITS = 34;

export function matchConfig(a: number, b: number, seed: number): MatchConfig {
  const A = kitOf(a), B = kitOf(b);
  return { ...DEFAULT_CONFIG, jobs: [A.job, B.job], sets: [A.set, B.set], arena: seed % 13, items: true, hazards: true, seed };
}
