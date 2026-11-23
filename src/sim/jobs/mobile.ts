// Mobile Developer — "Everything's on the phone". Hit-and-run. GDD §3.2.
import { sec } from "../constants";
import { buff, dealDamage, fighterBox, heal, inFront, oldestHistory, opp, overlap, entBox, pm, projStep, px, recordHistory, shoot, spawn, stun } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S } from "../types";

registerJob({
  idx: 1, id: "md", name: "Mobile Developer", color: 0xff4f6d,
  walk: 563, jumps: 2, chargeFull: 36, tap: 20, full: 60, reach: 28, weight: 2, dashCd: 36,
  sets: [
    {
      // res: 0 badges on the opponent
      name: "Push Notifications", passive: "Notification Badge",
      passiveDesc: "Every hit adds a red badge to them (max 5).",
      combo: "Stack 5 badges → Flash stops their retaliation → Push for 100+.",
      onDealt(s, i, _t, dmg, h) { if (dmg > 0 && h.kind !== "dot") s.f[i].res[0] = Math.min(5, s.f[i].res[0] + 1); },
      skills: [
        { name: "Swipe", cost: 2000, cd: sec(7), desc: "Swipe dash through them: 35 dmg and +1 badge.",
          cast(s, i, pow) {
            const f = s.f[i];
            f.dash = 10; f.dashDir = f.facing; f.iframes = 10;
            shoot(s, i, "md.swipe", { speed: px(6), dmg: pm(35, pow), life: 11, w: 16, h: 24 });
            return true;
          } },
        { name: "Camera Flash", cost: 2500, cd: sec(12), desc: "Cone: their charge speed −50 % for 3 s.",
          cast(s, i) {
            const f = s.f[i], T = s.f[opp(i)];
            spawn(s, { k: K.DELAYED, b: "fx.flash", o: i, x: f.x + f.facing * px(50), y: f.y - px(4), w: 100, h: 40, life: 8 });
            if (inFront(f, T, 100)) { T.st[S.CHG_BUF] = -1000; T.st[S.CHG_BUF_T] = sec(3); }
            return true;
          } },
        { name: "Push Notification", cost: 2500, cd: sec(8), desc: "Buzz all their badges: 20 dmg each, 0.1 s stun each.",
          cast(s, i, pow) {
            const f = s.f[i], t = opp(i), n = f.res[0];
            if (n === 0) return false;
            f.res[0] = 0;
            dealDamage(s, i, t, pm(20 * n, pow), { kind: "skill", noGuard: true, hitstun: 4 });
            stun(s, t, 6 * n);
            return true;
          } },
      ],
    },
    {
      // res: 0 stance (0 iOS, 1 Android)
      name: "Cross-Platform", passive: "Cross-Platform",
      passiveDesc: "Each skill swaps stance. iOS: +15 % damage. Android: +15 % speed.",
      combo: "Drop the turret → fight near it → Hot Reload undoes a bad trade.",
      tick(s, i) { const f = s.f[i]; recordHistory(s, f, f); if (f.res[0] === 1) buff(f, "spd", 150, 2); },
      modOut(s, i) { return s.f[i].res[0] === 0 ? 1150 : 1000; },
      afterCast(s, i) { s.f[i].res[0] ^= 1; },
      skills: [
        { name: "Deploy to Device", cost: 3000, cd: sec(12), desc: "Phone turret (80 HP, 6 s), 12 dmg every second.",
          cast(s, i, pow) {
            const f = s.f[i];
            for (const e of s.ents) if (e.o === i && e.b === "md.turret") e.hp = 0;
            spawn(s, { k: K.SUMMON, b: "md.turret", o: i, x: f.x + f.facing * px(20), y: f.y, w: 10, h: 14, hp: 80, life: sec(6), p1: pow });
            return true;
          } },
        { name: "Hot Reload", cost: 2500, cd: sec(16), desc: "Teleport to where you were 3 s ago, recover half the HP lost.",
          cast(s, i) {
            const f = s.f[i], h = oldestHistory(f);
            if (!h) return false;
            f.x = h.x; f.y = h.y; f.vx = 0; f.vy = 0;
            if (h.hp > f.hp) heal(f, (h.hp - f.hp) >> 1);
            f.iframes = 12;
            return true;
          } },
      ],
    },
  ],
});

registerBeh("md.swipe", (s, e) => projStep(s, e, (s, e, t) => {
  dealDamage(s, e.o, t, e.dmg, { kind: "skill", melee: true, hitstun: 12 });
  s.f[e.o].res[0] = Math.min(5, s.f[e.o].res[0] + 1);
  return false;
}));
registerBeh("fx.flash", (_s, e) => --e.life > 0);
registerBeh("md.turret", (s, e) => {
  if (--e.life <= 0 || e.hp <= 0) return false;
  e.t++;
  const T = s.f[opp(e.o)];
  e.p3 = T.x > e.x ? 1 : -1;
  if (e.t % 60 === 0) spawn(s, { k: K.PROJ, b: "md.tap", o: e.o, x: e.x, y: e.y - px(10), vx: e.p3 * px(5), w: 4, h: 4, life: 60, dmg: Math.max(1, Math.trunc((12 * e.p1) / 1000)) });
  void overlap; void entBox; void fighterBox;
  return true;
});
registerBeh("md.tap", (s, e) => projStep(s, e, undefined, { kind: "summon", proj: true, hitstun: 4 }));
