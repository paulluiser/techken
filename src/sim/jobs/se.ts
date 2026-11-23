// Software Engineer — "Syntax". All-rounder. GDD §3.1 (v0.2 numbers).
import { sec } from "../constants";
import { abs, buff, dealDamage, entBox, fighterBox, opp, overlap, pm, projStep, px, shoot, spawn, stun } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S, type State } from "../types";

// Set A res: 0 streak count, 1 streak timer, 2 compiled
function compile(s: State, i: number) {
  const f = s.f[i];
  if (f.set === 0 && f.res[2]) { buff(f, "dmg", 250, sec(1.5)); f.res[2] = 0; }
}

registerJob({
  idx: 0, id: "se", name: "Software Engineer", color: 0x8bac0f,
  walk: 512, jumps: 2, chargeFull: 48, tap: 25, full: 70, reach: 26, weight: 3,
  sets: [
    {
      name: "Strongly Typed", passive: "Compiler",
      passiveDesc: "Land 3 hits within 2 s: next skill +25 % damage. Getting hit resets it.",
      combo: "Syntax chain fills Compiler → Brace Cage → compiled Recursion hits the caged target 3 times.",
      tick(s, i) { const f = s.f[i]; if (f.res[1] > 0) f.res[1]--; else f.res[0] = 0; },
      onDealt(s, i, _t, dmg) {
        if (dmg <= 0) return;
        const f = s.f[i];
        f.res[0] = f.res[1] > 0 ? f.res[0] + 1 : 1; f.res[1] = sec(2);
        if (f.res[0] >= 3) f.res[2] = 1;
      },
      onTaken(s, i, _a, dmg) { if (dmg > 0) { s.f[i].res[0] = 0; s.f[i].res[2] = 0; } },
      skills: [
        { name: "Semicolon Strike", cost: 2000, cd: sec(6), desc: "Dash that interrupts their action. 45 dmg.",
          cast(s, i, pow) {
            compile(s, i);
            const f = s.f[i];
            f.dash = 6; f.dashDir = f.facing;
            shoot(s, i, "se.semicolon", { speed: px(6), dmg: pm(45, pow), life: 9, w: 14, h: 18 });
            return true;
          } },
        { name: "Brace Cage", cost: 3000, cd: sec(12), desc: "Braces slam shut around a zone in front. Traps 1.0 s.",
          cast(s, i) {
            compile(s, i);
            const f = s.f[i];
            spawn(s, { k: K.DELAYED, b: "se.cage", o: i, x: f.x + f.facing * px(44), y: f.y, w: 44, h: 44, life: 14 });
            return true;
          } },
        { name: "Recursion", cost: 3500, cd: sec(14), desc: "A bouncing call that re-hits, up to 3 × 30.",
          cast(s, i, pow) {
            compile(s, i);
            shoot(s, i, "se.recursion", { speed: px(4), dmg: pm(30, pow), life: sec(4), w: 10, h: 10 });
            return true;
          } },
      ],
    },
    {
      name: "Exception Handling", passive: "Try/Catch",
      passiveDesc: "After 4 s without being hit, the next hit is caught: −35 % damage and +10 Motivation.",
      combo: "Throw a mark → they rush in → finally counters → the mark pops.",
      modIn(s, i, _a, h) {
        const f = s.f[i];
        if (h.kind !== "dot" && f.st[S.HURT_IDLE] >= sec(4)) { f.res[0] = 1; return 650; }
        return 1000;
      },
      onTaken(s, i) { const f = s.f[i]; if (f.res[0]) { f.res[0] = 0; if (f.burnout === 0) f.mot = Math.min(10000 + f.st[S.PERM_MOT] * 2000, f.mot + 1000); } },
      skills: [
        { name: "throw Error", cost: 2000, cd: sec(6), desc: "Projectile, 20 dmg. Marks Unhandled 4 s: next hit +30.",
          cast(s, i, pow) { shoot(s, i, "se.error", { speed: px(6), dmg: pm(20, pow), life: 60, w: 10, h: 8 }); return true; } },
        { name: "finally { }", cost: 3000, cd: sec(16), desc: "0.8 s counter stance. If hit, auto-counter for 80.",
          cast(s, i, pow) { const f = s.f[i]; f.st[S.COUNTER] = 48; f.st[S.COUNTER_DMG] = pm(80, pow); f.st[S.CAST] = 48; return true; } },
        { name: "Hotfix", cost: 2500, cd: sec(18), desc: "Heal 60 HP over 2 s.",
          cast(s, i, pow) { s.f[i].st[S.HEAL_LEFT] += pm(60, pow); return true; } },
      ],
    },
  ],
});

registerBeh("se.semicolon", (s, e) => projStep(s, e, (s, e, t) => {
  dealDamage(s, e.o, t, e.dmg, { kind: "skill", melee: true, hitstun: 18, kbx: (e.vx > 0 ? 1 : -1) * px(2) });
  return false;
}));
registerBeh("se.cage", (s, e) => {
  e.t++;
  if (e.t === 10) {
    const t = opp(e.o);
    if (overlap(entBox(e), fighterBox(s.f[t]))) stun(s, t, sec(1));
  }
  return --e.life > 0;
});
registerBeh("se.recursion", (s, e) => {
  e.x += e.vx; e.t++;
  if (e.x < px(12) || e.x > px(372)) e.vx = -e.vx;
  if (e.p2 > 0) e.p2--;
  if (--e.life <= 0) return false;
  const t = opp(e.o);
  if (e.p2 === 0 && overlap(entBox(e), fighterBox(s.f[t]))) {
    dealDamage(s, e.o, t, e.dmg, { kind: "skill", proj: true, hitstun: 10, kbx: (e.vx > 0 ? 1 : -1) * px(1) });
    e.hits++; e.p2 = 20; e.vx = -e.vx;
    if (e.hits >= 3) return false;
  }
  void abs;
  return true;
});
registerBeh("se.error", (s, e) => projStep(s, e, (s, e, t) => {
  dealDamage(s, e.o, t, e.dmg, { kind: "skill", proj: true, hitstun: 8 });
  s.f[t].st[S.UNHANDLED] = sec(4);
  return false;
}));
