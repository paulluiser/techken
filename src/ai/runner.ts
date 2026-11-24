// Headless CPU-vs-CPU matches, for tests and the balance runner (R4).
import { initState, PHASE_MATCH_END, step, type MatchConfig } from "../sim/sim";
import { cpuInput, newCpu } from "./cpu";

export interface MatchResult { winner: number; frames: number; wins: [number, number]; rounds: number }

/** Plays a full match between two CPUs. Stops after maxFrames (about 20 minutes of game time by default). */
export function playMatch(cfg: MatchConfig, levels: [number, number], maxFrames = 72000): MatchResult {
  const s = initState(cfg);
  const mem = [newCpu(cfg.seed), newCpu(cfg.seed ^ 0x5bd1e995)];
  while (s.phase !== PHASE_MATCH_END && s.frame < maxFrames) step(s, [cpuInput(s, 0, levels[0], mem[0]), cpuInput(s, 1, levels[1], mem[1])]);
  return { winner: s.matchWinner, frames: s.frame, wins: [s.wins[0], s.wins[1]], rounds: s.round };
}
