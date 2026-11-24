// Messages exchanged between the two browsers.
// "game" channel (unreliable, unordered): in, cs, ping, pong
// "ctrl" channel (reliable, ordered): hello, pick, start, bye
import type { MatchConfig } from "../sim/types";

export type GameMsg = (
  | { t: "in"; s: number; a: number[]; ack: number; f: number } // inputs for frames s..s+a.length-1
  | { t: "cs"; f: number; h: number } // checksum of the state after frame f
  | { t: "ping"; ts: number }
  | { t: "pong"; ts: number }
) & { e?: number }; // match epoch: messages from a previous match are ignored

export type CtrlMsg =
  | { t: "hello"; v: number; delay: number; name: string }
  | { t: "pick"; job: number; palette: number }
  | { t: "start"; cfg: MatchConfig; palettes: [number, number] }
  | { t: "rematch" }
  | { t: "repick" }
  | { t: "bye" };

export const PROTOCOL_VERSION = 4; // v4: top-down sim, 21-bit inputs
