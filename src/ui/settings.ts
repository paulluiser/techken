// Per-browser settings (Control Panel). No login: everything lives in localStorage.

/** Rebindable keyboard actions (GAME_DESIGN.md 7.1). Mouse: left click attacks, right click dashes. */
export const ACTIONS = [
  { id: "up", label: "Move up", keys: ["KeyW", "ArrowUp"] },
  { id: "down", label: "Move down", keys: ["KeyS", "ArrowDown"] },
  { id: "left", label: "Move left", keys: ["KeyA", "ArrowLeft"] },
  { id: "right", label: "Move right", keys: ["KeyD", "ArrowRight"] },
  { id: "attack", label: "Attack (hold to charge)", keys: ["KeyJ"] },
  { id: "dash", label: "Dash", keys: ["Space", "ShiftLeft", "KeyK"] },
  { id: "s1", label: "Skill 1", keys: ["KeyQ", "KeyU"] },
  { id: "s2", label: "Skill 2", keys: ["KeyE", "KeyI"] },
  { id: "s3", label: "Skill 3", keys: ["KeyR", "KeyO"] },
] as const;
export type ActionId = (typeof ACTIONS)[number]["id"];
const KEYS_VERSION = 3; // bump when the action list changes; old bindings reset

export interface Settings {
  name: string;
  // online / test
  delay: number; lag: number; jitter: number; loss: number; relay: boolean; auto: boolean; debug: boolean;
  // last picks
  job: number; palette: number; arena: number; cpu: number; cpuLevel: number;
  // controls
  keys: Record<ActionId, string[]>; keysV: number; mouseAim: boolean;
  touch: { leftHanded: boolean; size: number; opacity: number; lx: number; ly: number; rx: number; ry: number };
  // audio (used from R7)
  vol: { master: number; music: number; sfx: number; announcer: number }; mono: boolean; muffle: boolean;
  // gameplay / display / accessibility
  dmgNumbers: boolean; shake: boolean; tips: boolean; quality: "high" | "low";
  reduceFlash: boolean; bigText: boolean; colorblind: boolean;
}

const defaultKeys = () => Object.fromEntries(ACTIONS.map((a) => [a.id, [...a.keys]])) as Record<ActionId, string[]>;

export const DEFAULTS: Settings = {
  name: "",
  delay: 2, lag: 0, jitter: 0, loss: 0, relay: false, auto: false, debug: false,
  job: 0, palette: 0, arena: 0, cpu: -1, cpuLevel: 3,
  keys: defaultKeys(), keysV: KEYS_VERSION, mouseAim: true,
  touch: { leftHanded: false, size: 100, opacity: 100, lx: 0, ly: 0, rx: 0, ry: 0 },
  vol: { master: 80, music: 70, sfx: 80, announcer: 80 }, mono: false, muffle: true,
  dmgNumbers: true, shake: true, tips: true, quality: "high",
  reduceFlash: false, bigText: false, colorblind: false,
};

const KEY = "techken.settings.v1";
export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const keys = raw.keysV === KEYS_VERSION ? { ...defaultKeys(), ...(raw.keys ?? {}) } : defaultKeys();
    return { ...DEFAULTS, ...raw, keys, keysV: KEYS_VERSION, touch: { ...DEFAULTS.touch, ...(raw.touch ?? {}) }, vol: { ...DEFAULTS.vol, ...(raw.vol ?? {}) } };
  } catch { return structuredClone(DEFAULTS); }
}
export function saveSettings(s: Settings) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } }
export function resetSettings(keepName: string): Settings { const s = structuredClone(DEFAULTS); s.name = keepName; saveSettings(s); return s; }

export function keyLabel(code: string): string {
  return code.replace(/^Key/, "").replace(/^Digit/, "").replace("Arrow", "").replace("ShiftLeft", "Shift").replace("Left", "L").replace("Right", "R");
}

// temporary names (GDD 13.1): 3–16 of letters, numbers, _ and -; basic filter
const BLOCK = ["fuck", "shit", "cunt", "nigg", "fag", "bitch", "rape", "nazi", "whore", "slut", "dick", "pussy"];
export function validName(n: string): string | null {
  if (!/^[A-Za-z0-9_-]{3,16}$/.test(n)) return "Use 3–16 letters, numbers, _ or -.";
  if (BLOCK.some((w) => n.toLowerCase().includes(w))) return "Pick a different name.";
  return null;
}
export const randomGuest = () => `guest_${1000 + Math.floor(Math.random() * 9000)}`;
