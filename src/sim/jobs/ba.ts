// Business Analyst — "Technical Debt". Attrition. GDD §3.13 (v0.2 numbers).
// Debt lives on the BA (res[0] = stacks on the opponent). Each stack: 1 dmg/s.
import { sec, WALL_L, WALL_R } from "../constants";
import { clamp, dealDamage, entBox, fighterBox, opp, overlap, pm, projStep, pushCd, px, slow, spawn } from "../core";
import { registerBeh, registerJob, type SetDef } from "../registry";
import { K, S, type State } from "../types";

// res: 0 debt stacks, 1 dot accumulator, 2 frames since new debt, 3 interest timer, 4 sign-off timer
function addDebt(s: State, i: number, n: number) {
  const f = s.f[i], cap = f.set === 0 ? 8 : 10;
  f.res[0] = Math.min(cap, f.res[0] + n); f.res[2] = 0;
}
function debtTick(s: State, i: number) {
  const f = s.f[i], t = opp(i), T = s.f[t];
  f.res[2]++;
  if (f.res[0] > 0) {
    f.res[1] += f.res[0];
    while (f.res[1] >= 60) { f.res[1] -= 60; dealDamage(s, i, t, 1, { kind: "dot" }); }
  }
  T.st[S.REGEN_CUT] = f.set === 1 ? Math.min(40, f.res[0] * 6) : 0;
}
const base = (x: Omit<SetDef, "tick" | "onTaken" | "onDealt"> & { extraTick?: (s: State, i: number) => void }): SetDef => ({
  ...x,
  tick(s, i) { debtTick(s, i); x.extraTick?.(s, i); },
  onTaken(s, i, a, dmg, h) { if (a >= 0 && dmg > 0 && h.kind !== "dot" && s.f[i].res[0] > 0) s.f[i].res[0]--; }, // their hits pay off a stack
  onDealt(s, i, _t, dmg, h) { if (dmg > 0 && h.kind === "basic") addDebt(s, i, 1); }, // every basic, even a tap, applies Debt
});

registerJob({
  idx: 12, id: "ba", name: "Business Analyst", color: 0x7dff3a,
  walk: 512, jumps: 2, chargeFull: 48, tap: 20, full: 60, reach: 24, weight: 3,
  sets: [
    base({
      name: "Compound Interest", passive: "Interest",
      passiveDesc: "+1 Debt every 6 s while they have any (max 8). Each stack: 1 dmg/s. Their hits pay off a stack.",
      combo: "Stack Debt → let interest grow → Due Date at 6–8 stacks for 120–160.",
      extraTick(s, i) { const f = s.f[i]; if (f.res[0] > 0 && ++f.res[3] >= sec(6)) { f.res[3] = 0; addDebt(s, i, 1); } },
      skills: [
        { name: "Quick Workaround", cost: 2000, cd: sec(6), desc: "Sticky note: +3 Debt.",
          cast(s, i) { const f = s.f[i]; spawn(s, { k: K.PROJ, b: "ba.note", o: i, x: f.x + f.facing * px(12), y: f.y - px(20), vx: f.facing * px(5), w: 8, h: 8, life: 50, dmg: 5 }); return true; } },
        { name: "Scope Creep", cost: 3000, cd: sec(14), desc: "A growing zone for 5 s: +1 Debt/s and −20 % speed inside.",
          cast(s, i) { const f = s.f[i]; spawn(s, { k: K.ZONE, b: "ba.scope", o: i, x: f.x + f.facing * px(40), y: f.y, w: 40, h: 40, life: sec(5) }); return true; } },
        { name: "Due Date", cost: 4000, cd: sec(22), desc: "Cash in all Debt: 20 per stack.",
          cast(s, i, pow) {
            const f = s.f[i], n = f.res[0];
            if (n === 0) return false;
            f.res[0] = 0;
            dealDamage(s, i, opp(i), pm(20 * n, pow), { kind: "skill", noGuard: true, hitstun: 16 });
            return true;
          } },
      ],
    }),
    base({
      name: "Morale Drain", passive: "Debt Fatigue",
      passiveDesc: "Each Debt stack cuts their Motivation regen by 6 % (max −40 %). Debt fades if not refreshed.",
      combo: "Debt → their regen collapses → they Burn Out trying to keep up.",
      extraTick(s, i) {
        const f = s.f[i];
        if (f.res[0] > 0 && f.res[2] > 0 && f.res[2] % sec(4) === 0) f.res[0]--; // fades
        if (f.res[4] > 0) { f.res[4]--; f.st[S.SLOW_T] = 0; if (f.res[4] % 15 === 0) f.hp = Math.min(1000, f.hp + f.res[0]); }
      },
      skills: [
        { name: "Legacy Code", cost: 2500, cd: sec(10), desc: "Spaghetti puddle for 6 s that builds Debt.",
          cast(s, i) {
            const f = s.f[i];
            spawn(s, { k: K.ZONE, b: "ba.legacy", o: i, x: clamp(f.x + f.facing * px(50), px(WALL_L + 30), px(WALL_R - 30)), y: f.y, w: 60, h: 8, life: sec(6) });
            return true;
          } },
        { name: "Deprioritize", cost: 3000, cd: sec(15), desc: "+2 s to all their current cooldowns.",
          cast(s, i) { const T = s.f[opp(i)]; for (let k = 0; k < 3; k++) pushCd(T, k, sec(2)); return true; } },
        { name: "Stakeholder Sign-off", cost: 3000, cd: sec(16), desc: "4 s: immune to slows, heal 4/s per Debt stack.",
          cast(s, i) { s.f[i].res[4] = sec(4); return true; } },
      ],
    }),
  ],
});

registerBeh("ba.note", (s, e) => projStep(s, e, (s, e, t) => {
  dealDamage(s, e.o, t, e.dmg, { kind: "skill", proj: true, hitstun: 6 });
  addDebt(s, e.o, 3);
  return false;
}));
registerBeh("ba.scope", (s, e) => {
  e.t++;
  if (e.t % 30 === 0) e.w = Math.min(120, e.w + 8);
  const t = opp(e.o);
  if (overlap(entBox(e), fighterBox(s.f[t]))) { slow(s, t, 20, 10); if (e.t % 60 === 0) addDebt(s, e.o, 1); }
  return --e.life > 0;
});
registerBeh("ba.legacy", (s, e) => {
  e.t++;
  const t = opp(e.o);
  if (e.t % 60 === 0 && overlap(entBox(e), fighterBox(s.f[t]))) addDebt(s, e.o, 1);
  return --e.life > 0;
});
