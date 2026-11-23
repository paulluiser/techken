// QA Analyst — "Finds your weaknesses". Debuffer. GDD §3.3.
import { sec } from "../constants";
import { abs, atWall, dealDamage, dxPx, entBox, fighterBox, kill, opp, overlap, ownEnts, pm, projStep, pushCd, px, root, slow, spawn } from "../core";
import { JOBS, registerBeh, registerJob } from "../registry";
import { K, S } from "../types";

registerJob({
  idx: 2, id: "qa", name: "QA Analyst", color: 0xc9d72a,
  walk: 512, jumps: 2, chargeFull: 42, tap: 20, full: 65, reach: 30, weight: 3,
  sets: [
    {
      // res: 0 hit counter
      name: "Exploratory Testing", passive: "Found a Bug",
      passiveDesc: "Every 4th hit exposes a Weak Spot: they take +20 % for 5 s.",
      combo: "Magnify → Weak Spot → the bug and a charged net hit for +20 %.",
      onDealt(s, i, t, dmg, h) {
        if (dmg <= 0 || h.kind === "dot") return;
        const f = s.f[i];
        if (++f.res[0] >= 4) { f.res[0] = 0; s.f[t].st[S.WEAK] = sec(5); }
      },
      skills: [
        { name: "Magnify", cost: 2000, cd: sec(8), desc: "Scanning beam applies Weak Spot right away.",
          cast(s, i) {
            const f = s.f[i], T = s.f[opp(i)];
            spawn(s, { k: K.DELAYED, b: "fx.beam", o: i, x: f.x + f.facing * px(80), y: f.y - px(22), w: 160, h: 4, life: 10 });
            if ((T.x - f.x) * f.facing > 0 && dxPx(f, T) <= 160 && abs(T.y - f.y) < px(50)) T.st[S.WEAK] = sec(5);
            return true;
          } },
        { name: "Release the Bug", cost: 3000, cd: sec(15), desc: "Pixel bug (60 HP) chases, bites 15/s and slows.",
          cast(s, i, pow) {
            const f = s.f[i];
            for (const b of ownEnts(s, i, "qa.bug")) kill(b);
            spawn(s, { k: K.SUMMON, b: "qa.bug", o: i, x: f.x + f.facing * px(14), y: f.y, w: 10, h: 8, hp: 60, life: sec(8), p1: pow });
            return true;
          } },
        { name: "Reopen Ticket", cost: 3500, cd: sec(18), desc: "Their last-used skill goes back on full cooldown (max +5 s).",
          cast(s, i) {
            const T = s.f[opp(i)], k = T.st[S.LAST_SKILL] - 1;
            if (k >= 0) {
              const sk = JOBS[T.job]?.sets[T.set].skills[k];
              if (sk) pushCd(T, k, Math.max(0, sk.cd - T.cd[k]));
            }
            return true;
          } },
      ],
    },
    {
      name: "Bug Bounty", passive: "Edge Case",
      passiveDesc: "+25 % damage against opponents who are airborne, against a wall, or burned out.",
      combo: "Eggs drain Motivation toward Burnout → Net them → Edge Case damage.",
      modOut(s, _i, t) { const T = s.f[t]; return !T.onGround || atWall(T) || T.burnout > 0 ? 1250 : 1000; },
      skills: [
        { name: "Bug Net", cost: 2000, cd: sec(9), desc: "Throw a net: 30 dmg, a catch roots for 1 s.",
          cast(s, i, pow) {
            const f = s.f[i];
            spawn(s, { k: K.PROJ, b: "qa.net", o: i, x: f.x + f.facing * px(12), y: f.y - px(20), vx: f.facing * px(5), w: 14, h: 12, life: 40, dmg: pm(30, pow) });
            return true;
          } },
        { name: "Infestation", cost: 3500, cd: sec(18), desc: "3 egg traps. A hatched bug drains 5 Motivation/s for 3 s.",
          cast(s, i) {
            const f = s.f[i];
            for (const d of [40, 90, 140]) {
              const x = Math.max(px(16), Math.min(px(368), f.x + f.facing * px(d)));
              spawn(s, { k: K.TRAP, b: "qa.egg", o: i, x, y: f.y, w: 10, h: 6, life: sec(20) });
            }
            return true;
          } },
      ],
    },
  ],
});

registerBeh("qa.bug", (s, e) => {
  if (--e.life <= 0 || e.hp <= 0) return false;
  e.t++;
  const t = opp(e.o), T = s.f[t];
  const dir = T.x > e.x ? 1 : -1;
  if (abs(T.x - e.x) > px(4)) e.x += dir * 563;
  e.p3 = dir;
  if (overlap(entBox(e), fighterBox(T))) {
    if (e.t % 4 === 0) dealDamage(s, e.o, t, Math.max(1, pm(1, e.p1)), { kind: "dot" });
    slow(s, t, 20, 20);
  }
  return true;
});
registerBeh("qa.net", (s, e) => projStep(s, e, (s, e, t) => {
  dealDamage(s, e.o, t, e.dmg, { kind: "skill", proj: true, hitstun: 6 });
  root(s, t, sec(1));
  return false;
}));
registerBeh("qa.egg", (s, e) => {
  if (--e.life <= 0) return false;
  const t = opp(e.o), T = s.f[t];
  if (overlap(entBox(e), fighterBox(T))) { T.st[S.DRAIN_T] = sec(3); return false; }
  return true;
});
