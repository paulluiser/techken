// Top-down sim rules (GAME_DESIGN.md v0.3, sections 1 and 3).
import { describe, expect, it } from "vitest";
import * as C from "../src/sim/constants";
import { KITS } from "../src/sim/data/kits.gen";
import { angleOf, dist } from "../src/sim/fixed";
import { IN_ATTACK, IN_DASH, IN_S1, IN_S2, IN_S3, packInput } from "../src/sim/input";
import { checksum, cloneState, initState, PHASE_FIGHT, PHASE_INTRO, PHASE_ROUND_END, step, type State } from "../src/sim/sim";
import { S } from "../src/sim/types";
import { SE } from "../src/sim/jobs/se";
import { DBA, LEAP_FRAMES } from "../src/sim/jobs/dba";

/** A fresh SE vs DBA match on The Terminal, already past the intro. */
function fight(jobs: [number, number] = [SE, DBA], arena = 1): State {
  const s = initState({ jobs, arena, seed: 7 });
  while (s.phase === PHASE_INTRO) step(s, [0, 0]);
  return s;
}
const run = (s: State, n: number, a = 0, b = 0) => { for (let k = 0; k < n; k++) step(s, [a, b]); };
/** Puts the two fighters `gap` units apart, facing each other in the middle of the arena. */
function place(s: State, gap: number) {
  s.f[0].x = 7500 - (gap >> 1); s.f[0].y = 2000; s.f[1].x = 7500 + (gap >> 1); s.f[1].y = 2000;
}

describe("determinism", () => {
  it("gives identical checksums for identical inputs", () => {
    const a = initState({ jobs: [SE, DBA], arena: 0, seed: 99 }), b = initState({ jobs: [SE, DBA], arena: 0, seed: 99 });
    let r = 12345;
    for (let k = 0; k < 3000; k++) {
      r = (Math.imul(r, 1664525) + 1013904223) >>> 0;
      const i0 = r & ((1 << 21) - 1), i1 = (r >>> 9) & ((1 << 21) - 1);
      step(a, [i0, i1]); step(b, [i0, i1]);
    }
    expect(checksum(a)).toBe(checksum(b));
  });
  it("clones the state so later steps don't change the copy", () => {
    const s = fight(), c = cloneState(s), before = checksum(c);
    run(s, 60, packInput(0, 0), packInput(IN_ATTACK, 8));
    expect(checksum(c)).toBe(before);
  });
});

describe("movement and dash", () => {
  it("walks toward the input direction", () => {
    const s = fight(), x0 = s.f[0].x;
    run(s, 30, packInput(0, 0)); // direction 0 = right
    expect(s.f[0].x).toBe(x0 + 30 * C.SPEEDS[KITS[SE].speed]);
  });
  it("stops at the arena wall", () => {
    const s = fight();
    run(s, 300, packInput(0, 8)); // left
    expect(s.f[0].x).toBe(C.FIGHTER_R);
  });
  it("dashes for 10 frames, costs 10 Motivation and grants invulnerability", () => {
    const s = fight(), x0 = s.f[0].x;
    step(s, [packInput(IN_DASH, 0), 0]);
    expect(s.f[0].iframes).toBeGreaterThan(0);
    expect(s.f[0].mot).toBe(C.MOT_MAX - C.DASH_COST);
    run(s, 12);
    expect(s.f[0].x - x0).toBeGreaterThanOrEqual(C.DASH_SPEED * (C.DASH_FRAMES - 1));
  });
});

describe("basic attacks", () => {
  it("a full charge in range deals full damage and knocks back", () => {
    const s = fight(); place(s, 1300);
    run(s, KITS[SE].charge + 1, packInput(IN_ATTACK, -1));
    step(s, [0, 0]);
    expect(s.f[1].hp).toBe(C.HP_MAX - Math.trunc((KITS[SE].full * 90) / 100)); // DBA takes 10 % less
    expect(s.f[1].kT).toBeGreaterThan(0);
  });
  it("a tap deals tap damage", () => {
    const s = fight(); place(s, 1300);
    run(s, 3, packInput(IN_ATTACK, -1)); step(s, [0, 0]);
    expect(s.f[1].hp).toBe(C.HP_MAX - Math.trunc((KITS[SE].tap * 90) / 100));
  });
  it("misses when the target is out of reach", () => {
    const s = fight(); place(s, 4000);
    run(s, KITS[SE].charge + 1, packInput(IN_ATTACK, -1)); step(s, [0, 0]);
    expect(s.f[1].hp).toBe(C.HP_MAX);
  });
  it("misses a dashing target", () => {
    const s = fight(); place(s, 1300);
    run(s, KITS[SE].charge, packInput(IN_ATTACK, -1));
    step(s, [0, packInput(IN_DASH, 16)]); // DBA dashes down as SE releases
    step(s, [0, 0]);
    expect(s.f[1].hp).toBe(C.HP_MAX);
  });
  it("Database Admin's charge isn't interrupted by hits (Heavy)", () => {
    const s = fight(); place(s, 1300);
    run(s, 20, packInput(0, -1), packInput(IN_ATTACK, -1));
    run(s, 4, packInput(IN_ATTACK, -1), packInput(IN_ATTACK, -1)); step(s, [0, packInput(IN_ATTACK, -1)]); // SE taps DBA
    expect(s.f[1].charging).toBe(1);
  });
});

describe("Software Engineer kit", () => {
  it("Brace Cage stuns after its delay and respects the Stun cap", () => {
    const s = fight(); place(s, 3000);
    step(s, [packInput(IN_S2, -1), 0]);
    run(s, 31);
    expect(s.f[1].st[S.STUN]).toBeGreaterThan(0);
    expect(s.f[1].st[S.STUN]).toBeLessThanOrEqual(C.HARD_CC_MAX);
  });
  it("Recursion can hit the same target up to 3 times", () => {
    const s = fight(); place(s, 2500);
    s.f[1].x = 12500; s.f[0].x = 11000; // close to the right wall so the shot bounces back through
    step(s, [packInput(IN_S3, -1), 0]);
    run(s, 180);
    expect(C.HP_MAX - s.f[1].hp).toBe(Math.trunc((35 * 90) / 100) * 3);
  });
  it("Semicolon Strike closes the gap and hits for 50", () => {
    const s = fight(); place(s, 2600);
    step(s, [packInput(IN_S1, -1), 0]); run(s, 12);
    expect(s.f[1].hp).toBe(C.HP_MAX - 45);
  });
  it("Compiler: after 3 hits the next skill does +25%", () => {
    const s = fight(); place(s, 1300);
    s.f[0].res[1] = 1; // compiled
    place(s, 2600);
    step(s, [packInput(IN_S1, -1), 0]); run(s, 12);
    expect(s.f[1].hp).toBe(C.HP_MAX - Math.trunc((Math.trunc((50 * 125) / 100) * 90) / 100));
  });
});

describe("Database Admin kit", () => {
  it("SELECT pulls the target next to the Database Admin", () => {
    const s = fight([DBA, SE]); place(s, 5000);
    step(s, [packInput(IN_S1, -1), 0]); run(s, 40);
    expect(dist(s.f[0].x, s.f[0].y, s.f[1].x, s.f[1].y)).toBeLessThan(1400);
    expect(s.f[1].hp).toBe(C.HP_MAX - 30);
  });
  it("DROP TABLE leaps to the target and lands for 130", () => {
    const s = fight([DBA, SE]); place(s, 4000);
    step(s, [packInput(IN_S3, -1), 0]);
    expect(s.f[0].air).toBeGreaterThan(0);
    run(s, LEAP_FRAMES + 1);
    expect(s.f[1].hp).toBe(C.HP_MAX - 130);
  });
  it("Table Lock stuns a target next to you", () => {
    const s = fight([DBA, SE]); place(s, 1400);
    step(s, [packInput(IN_S2, -1), 0]);
    expect(s.f[1].st[S.STUN]).toBe(C.sec(1.2));
  });
});

describe("Motivation and Burnout", () => {
  it("a Crunch Cast fires the skill and then burns you out", () => {
    const s = fight(); place(s, 3000);
    s.f[0].mot = 1000;
    step(s, [packInput(IN_S3, -1), 0]);
    expect(s.ents.length).toBe(1);
    expect(s.f[0].burnout).toBe(C.BURNOUT_FRAMES);
  });
  it("Burnout blocks skills and comes back with 35 Motivation", () => {
    const s = fight();
    s.f[0].mot = 1000; step(s, [packInput(IN_S1, -1), 0]);
    run(s, 2); step(s, [packInput(IN_S2, -1), 0]);
    expect(s.f[0].cd[1]).toBe(0);
    run(s, C.BURNOUT_FRAMES);
    expect(s.f[0].mot).toBeGreaterThanOrEqual(C.BURNOUT_RECOVER);
  });
});

describe("round flow", () => {
  it("a KO ends the round and scores a win", () => {
    const s = fight(); s.f[1].hp = 1; place(s, 1300);
    run(s, 3, packInput(IN_ATTACK, -1)); step(s, [0, 0]);
    expect(s.phase).toBe(PHASE_ROUND_END);
    expect(s.wins).toEqual([1, 0]);
  });
  it("time out goes to the fighter with more HP", () => {
    const s = fight(); s.f[1].hp = 900; s.timer = 1;
    step(s, [0, 0]);
    expect(s.wins).toEqual([1, 0]);
  });
  it("a tie at time out goes to Overtime, where the first hit wins", () => {
    const s = fight(); s.timer = 1; step(s, [0, 0]);
    expect(s.ot).toBe(1); expect(s.phase).toBe(PHASE_FIGHT);
    place(s, 1300); run(s, 3, 0, packInput(IN_ATTACK, -1)); step(s, [0, 0]);
    expect(s.wins).toEqual([0, 1]);
  });
  it("the winner of 2 rounds wins the match", () => {
    const s = fight();
    for (let r = 0; r < 2; r++) { s.f[1].hp = 1; place(s, 1300); run(s, 3, packInput(IN_ATTACK, -1)); run(s, C.ROUND_END_FRAMES + C.INTRO_FRAMES + 2); }
    expect(s.matchWinner).toBe(0);
  });
});

describe("fixed-point math", () => {
  it("angleOf points right, down, left and up", () => {
    expect([angleOf(10, 0), angleOf(0, 10), angleOf(-10, 0), angleOf(0, -10)]).toEqual([0, 16, 32, 48]);
  });
});
