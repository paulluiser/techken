// Cybersecurity Analyst (data/kits.gen.ts). Passive Hardened: every 4 s untouched, +30 Shield (max 120).
// S1 Firewall: a wall in front for 4 s; your own shots pass. S2 Mirror: for 1 s, reflects shots and melee damage.
// S3 Zero-Trust: a bubble for 3 s that blocks 100, then explodes (handled in sim.tickMarkers).
import { aimOf, registerJob, TAG, wall, type JobImpl } from "../core";
import { S } from "../types";
import { KITS } from "../data/kits.gen";
import { other } from "../core";

export const CS = 9;
const HARD_MAX = 120;
registerJob(CS, {
  range: 1500, arc: 13,
  ai: [[3, 7], [0, 4], [0, 3]],
  aiWhen: (s, i, k) => k !== 0 || KITS[s.f[other(i)].job].ranged,
  tick(s, i) {
    const f = s.f[i];
    const cap = HARD_MAX + (f.st[S.BUBBLE] > 0 ? 100 : 0);
    if (f.quiet > 0 && f.quiet % 240 === 0) f.st[S.SHIELD] = Math.min(cap, f.st[S.SHIELD] + 30);
  },
  skills: [
    (s, i, inp) => { wall(s, i, "cs.fire", aimOf(s, i, inp), 1100, 2400, 300, 240, 220, TAG.OWN_PASS); },
    (s, i) => { s.f[i].st[S.REFLECT] = 60; },
    (s, i) => { const f = s.f[i]; f.st[S.BUBBLE] = 180; f.st[S.SHIELD] += 100; f.st[S.ABSORBED] = 0; },
  ],
  behaviors: { "cs.fire": {} },
} satisfies JobImpl);
