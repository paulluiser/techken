// The 13 arenas (GDD section 5). Layouts only here; hazards arrive in phase 3.
export interface Platform { x1: number; x2: number; y: number }
export interface ArenaDef {
  id: string;
  name: string;
  floor: number;
  platforms: Platform[];
  spawns: [number, number][]; // item spawn points (x, y of the surface)
  hazard: string; // description; behavior comes in phase 3
  bg: number; // placeholder colors until the art phase
  line: number;
}

const P = (x1: number, x2: number, y: number): Platform => ({ x1, x2, y });

export const ARENAS: ArenaDef[] = [
  { id: "terminal", name: "The Terminal", floor: 184, platforms: [P(64, 160, 136), P(224, 320, 136), P(152, 232, 92)],
    spawns: [[112, 136], [272, 136], [192, 92], [192, 184]], hazard: "none", bg: 0x07140d, line: 0x39ff7a },
  { id: "office", name: "Open Office", floor: 184, platforms: [P(40, 120, 140), P(152, 232, 120), P(264, 344, 140)],
    spawns: [[80, 140], [192, 120], [304, 140], [192, 184]], hazard: "Printer jam sprays paper every 30 s", bg: 0x1d2433, line: 0xc8d0e0 },
  { id: "servers", name: "Server Room", floor: 184, platforms: [P(56, 136, 128), P(248, 328, 128), P(160, 224, 88)],
    spawns: [[96, 128], [288, 128], [192, 88], [192, 184]], hazard: "Power outage: 4 s of darkness", bg: 0x0a1630, line: 0x59d3e8 },
  { id: "garage", name: "Startup Garage", floor: 184, platforms: [P(48, 144, 144), P(216, 336, 132)],
    spawns: [[96, 144], [276, 132], [192, 184]], hazard: "Funding Round: 3 items at once", bg: 0x2a1d14, line: 0xffb03a },
  { id: "cloud", name: "Cloud Region", floor: 184, platforms: [P(32, 112, 132), P(152, 232, 104), P(272, 352, 132), P(120, 176, 60), P(208, 264, 60)],
    spawns: [[72, 132], [192, 104], [312, 132], [148, 60], [236, 60]], hazard: "Wind gusts push sideways", bg: 0x5b8fd6, line: 0xffffff },
  { id: "basement", name: "Legacy Basement", floor: 184, platforms: [P(64, 176, 136), P(208, 320, 136)],
    spawns: [[120, 136], [264, 136], [192, 184]], hazard: "Spaghetti cables slow movement", bg: 0x14180f, line: 0x7cc24a },
  { id: "expo", name: "Tech Expo Hall", floor: 184, platforms: [P(24, 104, 140), P(280, 360, 140), P(136, 248, 112)],
    spawns: [[64, 140], [320, 140], [192, 112]], hazard: "Spotlight: +15 % damage inside", bg: 0x241433, line: 0xff6ad5 },
  { id: "coffee", name: "Coffee Shop", floor: 184, platforms: [P(56, 128, 144), P(160, 224, 128), P(256, 328, 144)],
    spawns: [[92, 144], [192, 128], [292, 144], [192, 184]], hazard: "Coffee spawns twice as often; Wi-Fi drops", bg: 0x2a1a12, line: 0xd09a62 },
  { id: "warroom", name: "3 AM War Room", floor: 184, platforms: [P(48, 152, 132), P(232, 336, 132)],
    spawns: [[100, 132], [284, 132], [192, 184]], hazard: "Prod is down: −15 Motivation every 30 s", bg: 0x2a0a0e, line: 0xff4b3a },
  { id: "home", name: "Home Office", floor: 184, platforms: [P(40, 136, 148), P(248, 344, 120)],
    spawns: [[88, 148], [296, 120], [192, 184]], hazard: "The cat blocks one attack; doorbell drops an item", bg: 0x1f2a3a, line: 0xf6cba4 },
  { id: "hackathon", name: "Hackathon Night", floor: 184, platforms: [P(72, 152, 140), P(232, 312, 140), P(152, 232, 100)],
    spawns: [[112, 140], [272, 140], [192, 100]], hazard: "Lights dim as the timer runs down", bg: 0x120e24, line: 0x9a90c4 },
  { id: "retreat", name: "Team-Building Retreat", floor: 184, platforms: [P(58, 142, 138), P(242, 322, 124)],
    spawns: [[100, 138], [282, 124], [192, 184]], hazard: "Campfire 10 dmg/s; trust-fall platform drops", bg: 0x16215a, line: 0x5cb043 },
  { id: "rooftop", name: "Campus Rooftop", floor: 184, platforms: [P(48, 128, 136), P(256, 336, 136), P(160, 224, 104)],
    spawns: [[88, 136], [296, 136], [192, 104], [192, 184]], hazard: "Window-cleaning gondola slides across", bg: 0x5aa8e8, line: 0xf2f6ff },
];
