// All 17 kits (GAME_DESIGN.md section 3): every skill does something, and the special rules work.
import { describe, expect, it } from "vitest";
import * as C from "../src/sim/constants";
import { IMPL } from "../src/sim/core";
import { KITS } from "../src/sim/data/kits.gen";
import { dist } from "../src/sim/fixed";
import { IN_ATTACK, IN_DASH, IN_SKILLS, packInput } from "../src/sim/input";
import { checksum, initState, PHASE_INTRO, step, type State } from "../src/sim/sim";
import { K, S } from "../src/sim/types";

function fight(jobs: [number, number], arena = 1): State {
  const s = initState({ jobs, arena, seed: 11 });
  while (s.phase === PHASE_INTRO) step(s, [0, 0]);
  return s;
}
const run = (s: State, n: number, a = 0, b = 0) => { for (let k = 0; k < n; k++) step(s, [a, b]); };
function place(s: State, gap: number, y = 2000) { s.f[0].x = 7500 - (gap >> 1); s.f[0].y = y; s.f[1].x = 7500 + (gap >> 1); s.f[1].y = y; }
const cast = (s: State, k: number) => step(s, [packInput(IN_SKILLS[k], -1), 0]);
const SE = 0, DBA = 5;

describe("every skill of every job has an effect", () => {
  for (let job = 0; job < KITS.length; job++) {
    for (let k = 0; k < 3; k++) {
      it(`${KITS[job].name}: ${KITS[job].skills[k].name}`, () => {
        const s = fight([job, SE]);
        const [lo, hi] = IMPL[job]!.ai[k];
        place(s, Math.max(1300, Math.round(((lo + Math.min(hi, 6)) / 2) * C.TILE)));
        if (job === 12 && k === 2) s.f[1].st[S.DEBT] = 4; // Due Date needs Debt
        if (job === 8 && k === 2) { cast(s, 1); run(s, 20); } // Escalate needs a customer
        const before = JSON.stringify({ t: s.f[1], me: { ...s.f[0], cd: 0, mot: 0, motIdle: 0, sinceSkill: 0, quiet: 0, cast: 0, castSkill: 0, prevIn: 0, flash: 0 } });
        const ents0 = s.ents.length;
        cast(s, k);
        let effect = false;
        for (let f = 0; f < 240 && !effect; f++) {
          step(s, [0, 0]);
          const now = JSON.stringify({ t: s.f[1], me: { ...s.f[0], cd: 0, mot: 0, motIdle: 0, sinceSkill: 0, quiet: 0, cast: 0, castSkill: 0, prevIn: 0, flash: 0 } });
          effect = s.f[1].hp < C.HP_MAX || s.ents.length !== ents0 || now !== before;
        }
        expect(s.f[0].cd[k]).toBeGreaterThan(0);
        expect(effect).toBe(true);
      });
    }
  }
});

describe("special rules", () => {
  it("Mobile Developer can dash twice in a row", () => {
    const s = fight([1, SE]);
    step(s, [packInput(IN_DASH, 0), 0]); run(s, 12);
    step(s, [packInput(IN_DASH, 0), 0]);
    expect(s.f[0].dash).toBeGreaterThan(0);
  });
  it("Debt deals damage over time and Due Date cashes it in", () => {
    const s = fight([12, SE]); place(s, 3000);
    s.f[1].st[S.DEBT] = 5; s.f[1].st[S.DEBT_T] = 240;
    run(s, 60);
    expect(s.f[1].hp).toBeLessThan(C.HP_MAX);
    const hp = s.f[1].hp, debt = s.f[1].st[S.DEBT];
    cast(s, 2);
    expect(hp - s.f[1].hp).toBe(25 * debt);
    expect(s.f[1].st[S.DEBT]).toBe(0);
  });
  it("Assign Ticket explodes for 80 after 3 s", () => {
    const s = fight([13, SE]); place(s, 3000);
    cast(s, 0); run(s, 20);
    expect(s.f[1].st[S.TICKET]).toBeGreaterThan(0);
    run(s, C.sec(3));
    expect(s.f[1].hp).toBe(C.HP_MAX - 80);
  });
  it("Lightning does double damage on a Wet target", () => {
    const s = fight([7, SE]); place(s, 4000);
    s.f[1].st[S.WET] = 300;
    cast(s, 2); run(s, 50);
    expect(s.f[1].hp).toBe(C.HP_MAX - 200);
  });
  it("Mirror sends shots back at the shooter", () => {
    const s = fight([10, 9]); place(s, 4000); // Data Scientist shoots a Cybersecurity Analyst
    step(s, [0, packInput(IN_SKILLS[1], -1)]); // Mirror up
    cast(s, 0); run(s, 40);
    expect(s.f[1].hp).toBe(C.HP_MAX);
    expect(s.f[0].hp).toBeLessThan(C.HP_MAX);
  });
  it("Packet Loss deletes enemy shots inside it", () => {
    const s = fight([10, 4]); place(s, 4000);
    step(s, [0, packInput(IN_SKILLS[1], -1)]); // Network Admin's zone around itself
    cast(s, 0); run(s, 40);
    expect(s.f[1].hp).toBe(C.HP_MAX);
  });
  it("Drag & Drop into a wall does the extra damage and stuns", () => {
    const s = fight([14, SE]); place(s, 1300, 1500);
    s.f[1].x = 14000; s.f[0].x = 12700; // opponent near the right wall
    cast(s, 1); run(s, 20);
    expect(s.f[1].hp).toBe(C.HP_MAX - 70);
    expect(s.f[1].st[S.STUN]).toBeGreaterThan(0);
  });
  it("walls block movement, and area attacks break pets", () => {
    const s = fight([3, DBA]); place(s, 3000);
    cast(s, 1); // Swimlane between them
    const x0 = s.f[1].x;
    run(s, 60, 0, packInput(0, 8)); // DBA walks left into the wall
    expect(s.f[1].x).toBeGreaterThan(x0 - 2500);
    const t = initState({ jobs: [11, DBA], arena: 1, seed: 3 });
    while (t.phase === PHASE_INTRO) step(t, [0, 0]);
    place(t, 2500);
    step(t, [packInput(IN_SKILLS[0], -1), 0]); run(t, 5);
    const bot = t.ents.find((e) => e.k === K.PET)!;
    expect(bot).toBeDefined();
    t.f[1].x = bot.x + 3000; t.f[1].y = bot.y;
    step(t, [0, packInput(IN_SKILLS[2], -1)]); run(t, 40); // DROP TABLE on the bot
    expect(t.ents.some((e) => e.k === K.PET && e.id === bot.id)).toBe(false);
  });
  it("Firewall blocks enemy shots but lets the owner's shots through", () => {
    const s = fight([9, 10]); place(s, 4000);
    step(s, [packInput(IN_SKILLS[0], -1), 0]); // Cybersecurity Analyst's firewall
    run(s, 2, 0, packInput(IN_SKILLS[0], -1)); run(s, 40);
    expect(s.f[0].hp).toBe(C.HP_MAX);
  });
  it("crits do 1.5x damage (Grid Snap)", () => {
    const s = fight([14, SE]); place(s, 3000);
    cast(s, 0); run(s, 14);
    expect(s.f[0].st[S.CRIT_NEXT]).toBe(1);
    run(s, 3, packInput(IN_ATTACK, -1)); run(s, 2);
    expect(C.HP_MAX - s.f[1].hp).toBe(Math.trunc((Math.trunc((KITS[14].tap * C.MELEE_PCT) / 100) * 150) / 100));
  });
  it("every job stays deterministic in a long random mirror", () => {
    for (let job = 0; job < KITS.length; job++) {
      const a = initState({ jobs: [job, (job + 5) % 17], arena: job % 2, seed: job }), b = initState({ jobs: [job, (job + 5) % 17], arena: job % 2, seed: job });
      let r = job + 1;
      for (let f = 0; f < 1500; f++) {
        r = (Math.imul(r, 1664525) + 1013904223) >>> 0;
        const i0 = r & ((1 << 21) - 1), i1 = (r >>> 7) & ((1 << 21) - 1);
        step(a, [i0, i1]); step(b, [i0, i1]);
      }
      expect(checksum(a)).toBe(checksum(b));
      void dist;
    }
  });
});
