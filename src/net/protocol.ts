// Messages exchanged between the two browsers.
// "game" channel (unreliable, unordered): in, cs, ping, pong
// "ctrl" channel (reliable, ordered): hello, pick, start, bye
import type { MatchConfig } from "../sim/types";

export type GameMsg =
  | { t: "in"; s: number; a: number[]; ack: number; f: number } // inputs for frames s..s+a.length-1
  | { t: "cs"; f: number; h: number } // checksum of the state after frame f
  | { t: "ping"; ts: number }
  | { t: "pong"; ts: number };

export type CtrlMsg =
  | { t: "hello"; v: number; delay: number }
  | { t: "pick"; job: number; set: number; arena?: number }
  | { t: "start"; cfg: MatchConfig }
  | { t: "bye" };

export const PROTOCOL_VERSION = 2;
