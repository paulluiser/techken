// Per-browser settings (Control Panel). No login: everything lives in localStorage.
import { IN_ATTACK, IN_DASH, IN_DOWN, IN_GUARD, IN_LEFT, IN_RIGHT, IN_S1, IN_S2, IN_S3, IN_UP } from "../sim/input";

export const ACTIONS = [
  { id: "left", label: "Move left", bit: IN_LEFT, keys: ["KeyA", "ArrowLeft"] },
  { id: "right", label: "Move right", bit: IN_RIGHT, keys: ["KeyD", "ArrowRight"] },
  { id: "jump", label: "Jump", bit: IN_UP, keys: ["KeyW", "Space", "ArrowUp"] },
  { id: "down", label: "Drop through", bit: IN_DOWN, keys: ["KeyS", "ArrowDown"] },
  { id: "attack", label: "Attack (hold to charge)", bit: IN_ATTACK, keys: ["KeyJ"] },
  { id: "guard", label: "Guard", bit: IN_GUARD, keys: ["KeyK"] },
  { id: "dash", label: "Dash", bit: IN_DASH, keys: ["KeyL", "ShiftLeft"] },
  { id: "s1", label: "Skill 1", bit: IN_S1, keys: ["KeyU"] },
  { id: "s2", label: "Skill 2", bit: IN_S2, keys: ["KeyI"] },
  { id: "s3", label: "Skill 3", bit: IN_S3, keys: ["KeyO"] },
] as const;
export type ActionId = (typeof ACTIONS)[number]["id"];

export interface Settings {
  name: string;
  // online / test
  delay: number; lag: number; jitter: number; loss: number; relay: boolean; auto: boolean; debug: boolean;
  // last picks
  job: number; set: number; palette: number; arena: number; cpu: number; items: boolean; hazards: boolean;
  // controls
  keys: Record<ActionId, string[]>;
  touch: { leftHanded: boolean; size: number; opacity: number; lx: number; ly: number; rx: number; ry: number };
  // audio (used from phase 7)
  vol: { master: number; music: number; sfx: number; announcer: number }; mono: boolean; muffle: boolean;
  // gameplay / display / accessibility
  dmgNumbers: boolean; shake: boolean; tips: boolean; crt: boolean; scaling: "fit" | "integer";
  reduceFlash: boolean; bigText: boolean; colorblind: boolean;
}

const defaultKeys = () => Object.fromEntries(ACTIONS.map((a) => [a.id, [...a.keys]])) as Record<ActionId, string[]>;

export const DEFAULTS: Settings = {
  name: "",
  delay: 2, lag: 0, jitter: 0, loss: 0, relay: false, auto: false, debug: false,
  job: 0, set: 0, palette: 0, arena: 0, cpu: -1, items: true, hazards: true,
  keys: defaultKeys(),
  touch: { leftHanded: false, size: 100, opacity: 100, lx: 0, ly: 0, rx: 0, ry: 0 },
  vol: { master: 80, music: 70, sfx: 80, announcer: 80 }, mono: false, muffle: true,
  dmgNumbers: true, shake: true, tips: true, crt: false, scaling: "fit",
  reduceFlash: false, bigText: false, colorblind: false,
};

const KEY = "techken.settings.v1";
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem("techken.test.settings") || "{}");
    return { ...DEFAULTS, ...raw, keys: { ...defaultKeys(), ...(raw.keys ?? {}) }, touch: { ...DEFAULTS.touch, ...(raw.touch ?? {}) }, vol: { ...DEFAULTS.vol, ...(raw.vol ?? {}) } };
  } catch { return structuredClone(DEFAULTS); }
}
export function saveSettings(s: Settings) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }
export function resetSettings(keepName: string): Settings { const s = structuredClone(DEFAULTS); s.name = keepName; saveSettings(s); return s; }

export function keyLabel(code: string): string {
  return code.replace(/^Key/, "").replace(/^Digit/, "").replace("Arrow", "").replace("Left", "L").replace("Right", "R").replace("Space", "Space");
}

// temporary names (GDD 13.1): 3–16 of letters, numbers, _ and -; basic filter
const BLOCK = ["fuck", "shit", "cunt", "nigg", "fag", "bitch", "rape", "nazi", "whore", "slut", "dick", "pussy"];
export function validName(n: string): string | null {
  if (!/^[A-Za-z0-9_-]{3,16}$/.test(n)) return "Use 3–16 letters, numbers, _ or -.";
  if (BLOCK.some((w) => n.toLowerCase().includes(w))) return "Pick a different name.";
  return null;
}
export const randomGuest = () => `guest_${1000 + Math.floor(Math.random() * 9000)}`;
