// Presentation data for the Employee Directory and Swag Drawer (GDD sections 2 and 14.4).
export interface JobMeta {
  tag: string; arch: string; diff: number; stats: [number, number, number, number]; weapon: string;
  hair: string; outfit: string; persona: string; emote: string;
}

export const META: JobMeta[] = [
  { tag: "Syntax", arch: "All-rounder", diff: 2, stats: [3, 3, 3, 3], weapon: "Mechanical keyboard",
    hair: "Messy black hair with one ahoge, round glasses that glint", outfit: "Oversized green hoodie with a { } print", persona: "Sleepy genius", emote: "Glasses glint ✦ when Compiler is ready" },
  { tag: "Everything's on the phone", arch: "Hit-and-run", diff: 2, stats: [4, 3, 2, 4], weapon: "Phone on a selfie stick",
    hair: "Backwards cap, hot-pink hair tips", outfit: "Bomber jacket, phone holster", persona: "Hyper, always filming", emote: "Peace-sign selfie flash on victory" },
  { tag: "Finds your weaknesses", arch: "Debuffer", diff: 2, stats: [3, 3, 3, 4], weapon: "Bug net",
    hair: "Short bob with bug-antenna clips, goggles on the forehead", outfit: "Lab coat with sleeves past the hands", persona: "Deadpan perfectionist", emote: "One eye magnified huge" },
  { tag: "Designs the battlefield", arch: "Area control", diff: 3, stats: [3, 4, 3, 2], weapon: "Telescopic pointer",
    hair: "Neat side part, square glasses", outfit: "Sweater vest and tie", persona: "Over-organized planner", emote: "Lightbulb pops above the head" },
  { tag: "Signals", arch: "Zoner", diff: 3, stats: [2, 5, 2, 2], weapon: "Router (signal waves)",
    hair: "Spiky hair in Wi-Fi arcs, antenna headphones", outfit: "Black tee with neon-green trim", persona: "Chill gamer", emote: "Signal bars over the head" },
  { tag: "The Heavy", arch: "Grappler", diff: 2, stats: [1, 2, 5, 1], weapon: "A literal table",
    hair: "Tiny bun, big beard, gentle eyes", outfit: "Cardigan, rolled sleeves", persona: "Gentle giant", emote: "Sips tea during your Burnout" },
  { tag: "Automates the fight", arch: "Builder", diff: 3, stats: [3, 3, 4, 3], weapon: "Pipe wrench",
    hair: "Messy orange hair under a hard hat", outfit: "Hazard vest, tool belt", persona: "Sleep-deprived firefighter", emote: "Pager buzzing \"!!\"" },
  { tag: "Literally clouds", arch: "Artillery", diff: 3, stats: [3, 5, 1, 3], weapon: "Umbrella (glide)",
    hair: "Fluffy white cloud hair, sky-blue eyes", outfit: "Yellow raincoat", persona: "Dreamy airhead", emote: "Little clouds float out" },
  { tag: "Customers & tickets", arch: "Summoner", diff: 2, stats: [3, 3, 3, 3], weapon: "Stack of tickets",
    hair: "High ponytail, headset, forced smile", outfit: "Hi-vis polo, name badge", persona: "Smile hiding rage", emote: "💢 while still smiling" },
  { tag: "Defense & reflection", arch: "Counter", diff: 3, stats: [2, 2, 4, 3], weapon: "Riot shield + baton",
    hair: "Hood up, eyes glow red in the shadow", outfit: "Black hoodie, face mask", persona: "Edgy loner", emote: "Eyes glint in the dark" },
  { tag: "Probability", arch: "Ranged", diff: 3, stats: [3, 3, 2, 3], weapon: "Scatter-plot notebook",
    hair: "Long hair in a bun with a pencil, round glasses", outfit: "Cardigan with a chart pattern", persona: "Calculating gambler", emote: "A d20 spins over the head" },
  { tag: "The bot does the work", arch: "Summoner", diff: 4, stats: [3, 3, 2, 2], weapon: "Holo-tablet",
    hair: "Silver and purple hair, visor", outfit: "Lab jacket with circuit lines", persona: "Cheerful mad scientist", emote: "A loading spinner over the head" },
  { tag: "Technical debt", arch: "Attrition", diff: 2, stats: [3, 2, 3, 3], weapon: "Binder + sticky notes",
    hair: "Slick hair, a sticky note on the forehead", outfit: "Suit covered in sticky notes", persona: "Smug consultant", emote: "Toxic-green sparkle as Debt ticks" },
  { tag: "Tickets & timelines", arch: "Controller", diff: 4, stats: [3, 4, 3, 2], weapon: "Alarm clock on a chain",
    hair: "Sharp bob, wristwatch held up", outfit: "Navy suit, lanyard", persona: "Drill sergeant", emote: "⏰ speech bubble" },
  { tag: "Pixel-perfect rushdown", arch: "Rushdown", diff: 3, stats: [5, 3, 1, 5], weapon: "Stylus rapier",
    hair: "Beret, pastel two-tone hair", outfit: "Paint-stained smock", persona: "Perfectionist artist", emote: "✨ sparkle eyes" },
  { tag: "The pen is mightier", arch: "Trapper", diff: 3, stats: [3, 3, 2, 3], weapon: "Fountain pen",
    hair: "Long straight black hair, pen behind the ear", outfit: "Turtleneck, ink-stained fingers", persona: "Quiet bookworm", emote: "\"…\" speech bubble" },
  { tag: "Burst, then rate-limited", arch: "Glass cannon", diff: 2, stats: [4, 3, 2, 4], weapon: "Stickered laptop",
    hair: "Messy pink and teal hair, sunglasses", outfit: "Oversized hoodie, slippers", persona: "Overconfident and chill", emote: "✨ and \"lol\"" },
];

export const PALETTES = ["Default", "Alt", "Gold"] as const;
/** Palette 2 (Gold) unlocks from Career in phase 9; Default and Alt are open. */
export const paletteUnlocked = (p: number) => p < 2;

/** Cosmetic palette color for the placeholder renderer (real palettes swap sprite colors in phase 6). */
export function paletteColor(base: number, p: number): number {
  if (p === 2) return 0xd4a72c;
  if (p === 1) {
    const r = (base >> 16) & 255, g = (base >> 8) & 255, b = base & 255;
    return ((255 - r) << 16) | ((Math.min(255, g + 40)) << 8) | (255 - b); // inverted hue
  }
  return base;
}
