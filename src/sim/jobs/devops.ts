// DevOps Engineer — "Automates the fight". Builder. GDD §3.7.
import { ATK_STARTUP, sec, WALL_L, WALL_R } from "../constants";
import { abs, addMot, basicDmg, buff, cancelActions, clamp, dealDamage, entBox, fighterBox, kill, oldestHistory, opp, overlap, ownEnts, pm, px, recordHistory, spawn } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S } from "../types";

const cx = (x: number) => clamp(x, px(WALL_L + 12), px(WALL_R - 12));

registerJob({
  idx: 6, id: "do", name: "DevOps Engineer", color: 0xff7a1a,
  walk: 512, jumps: 2, chargeFull: 54, tap: 25, full: 75, reach: 28, weight: 4,
  sets: [
    {
      // res: 0 pipeline stages filled
      name: "CI/CD Pipeline", passive: "Pipeline",
      passiveDesc: "Each skill fills a stage (Build → Test → Deploy). All 3: Deployed for 5 s (+20 % charge speed, ×2 regen).",
      combo: "Conveyor pushes them into the Container → Push to Prod → Deployed.",
      afterCast(s, i) {
        const f = s.f[i];
        if (++f.res[0] >= 3) { f.res[0] = 0; buff(f, "chg", 200, sec(5)); buff(f, "regen", 1000, sec(5)); }
      },
      skills: [
        { name: "Container", cost: 2500, cd: sec(12), desc: "Shipping container (150 HP): a wall you can stand on.",
          cast(s, i) {
            const f = s.f[i];
            for (const c of ownEnts(s, i, "do.container")) kill(c);
            spawn(s, { k: K.WALL, b: "do.container", o: i, x: cx(f.x + f.facing * px(34)), y: f.y, w: 28, h: 22, hp: 150, life: sec(15) });
            return true;
          } },
        { name: "Conveyor", cost: 3000, cd: sec(15), desc: "Belt on the floor for 6 s, pushing them toward your facing.",
          cast(s, i) {
            const f = s.f[i];
            spawn(s, { k: K.ZONE, b: "do.conveyor", o: i, x: cx(f.x + f.facing * px(60)), y: f.y, w: 120, h: 6, life: sec(6), p1: f.facing });
            return true;
          } },
        { name: "Push to Prod", cost: 3000, cd: sec(14), desc: "A container drops on them after 1 s: 100 dmg.",
          cast(s, i, pow) {
            const T = s.f[opp(i)];
            spawn(s, { k: K.DELAYED, b: "do.drop", o: i, x: cx(T.x), y: T.y, w: 28, h: 30, life: 66, p1: pow });
            return true;
          } },
      ],
    },
    {
      name: "On-Call", passive: "Monitoring",
      passiveDesc: "Every time they cast a skill, you get an alert and +8 Motivation.",
      combo: "Their skills fuel your Motivation → Pods → Rollback if the push fails.",
      onEnemyCast(s, i) { addMot(s.f[i], 800); },
      tick(s, i) {
        const f = s.f[i];
        recordHistory(s, f, f);
        // pods copy your basic attack at 30 %
        if (f.atk === ATK_STARTUP + 1) {
          const t = opp(i), T = s.f[t], dmg = pm(basicDmg(s, i, f.atkCharge), 300);
          for (const p of ownEnts(s, i, "do.pod")) {
            if (abs(T.x - p.x) <= px(30) && abs(T.y - p.y) < px(36)) dealDamage(s, i, t, Math.max(1, dmg), { kind: "summon", melee: true, hitstun: 6 });
          }
        }
      },
      skills: [
        { name: "Pod Replicas", cost: 3500, cd: sec(18), desc: "2 clones copy your basics at 30 % for 6 s.",
          cast(s, i) {
            const f = s.f[i];
            for (const p of ownEnts(s, i, "do.pod")) kill(p);
            for (const d of [-1, 1]) spawn(s, { k: K.SUMMON, b: "do.pod", o: i, x: f.x + d * px(22), y: f.y, w: 12, h: 22, hp: 40, life: sec(6), p1: d });
            return true;
          } },
        { name: "Rollback Deploy", cost: 2500, cd: sec(14), desc: "Cleanse, and return to your position from ~2 s ago.",
          cast(s, i) {
            const f = s.f[i];
            for (const k of [S.STUN, S.ROOT, S.SILENCE, S.SLOW_T, S.INVERT, S.WEAK, S.WET, S.HOLD, S.DRAIN_T, S.UNHANDLED]) f.st[k] = 0;
            const h = oldestHistory(f);
            if (h) { f.x = h.x; f.y = h.y; f.vx = 0; f.vy = 0; }
            cancelActions(f);
            return true;
          } },
        { name: "Works on My Machine", cost: 2000, cd: sec(10), desc: "Ignore status effects for 3 s.",
          cast(s, i) { s.f[i].st[S.CC_IMMUNE_ITEM] = sec(3); return true; } },
      ],
    },
  ],
});

registerBeh("do.container", (_s, e) => --e.life > 0 && e.hp > 0);
registerBeh("do.conveyor", (s, e) => {
  const T = s.f[opp(e.o)];
  if (T.onGround && overlap(entBox(e), fighterBox(T))) T.x = clamp(T.x + e.p1 * px(1), px(WALL_L + 10), px(WALL_R - 10));
  return --e.life > 0;
});
registerBeh("do.drop", (s, e) => {
  e.t++;
  if (e.t === 60) {
    const t = opp(e.o);
    if (overlap(entBox(e), fighterBox(s.f[t]))) dealDamage(s, e.o, t, pm(100, e.p1), { kind: "skill", hitstun: 24, kby: -px(1) });
  }
  return --e.life > 0;
});
registerBeh("do.pod", (s, e) => {
  if (--e.life <= 0 || e.hp <= 0) return false;
  const f = s.f[e.o];
  const tx = f.x + e.p1 * px(22);
  e.x += clamp(tx - e.x, -px(3), px(3));
  e.y = f.y;
  return true;
});
