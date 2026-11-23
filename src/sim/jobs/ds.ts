// Data Scientist — "Probability". Ranged spread shots, seeded randomness. GDD §3.11.
// All randomness comes from the state's RNG, so both players see the same rolls.
import { sec } from "../constants";
import { targetX, aimShot, dealDamage, entBox, fighterBox, kill, near, opp, overlap, ownEnts, pm, projStep, px, rndInt, spawn } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S, type State } from "../types";

const variance = (s: State) => 800 + rndInt(s, 401); // ±20 %

registerJob({
  idx: 10, id: "ds", name: "Data Scientist", color: 0x1d6f73,
  walk: 512, jumps: 2, chargeFull: 48, tap: 15, full: 60, reach: 20, weight: 2,
  ranged: { speed: px(5), life: 34 },
  sets: [
    {
      // res: 0 data points (max 10)
      name: "Predictive Model", passive: "Training Data",
      passiveDesc: "Hits add data (max 10). At 10: Trained Model, +15 % crit chance (crits ×1.5).",
      combo: "Spread shots collect data → Regression snipes → Confidence Interval crits.",
      onDealt(s, i, _t, dmg) { if (dmg > 0) s.f[i].res[0] = Math.min(10, s.f[i].res[0] + 1); },
      modOut(s, i, t, h) {
        if (h.kind === "dot") return 1000;
        let m = variance(s);
        const inCI = ownEnts(s, i, "ds.ci").some((e) => overlap(entBox(e), fighterBox(s.f[t])));
        if (inCI || (s.f[i].res[0] >= 10 && rndInt(s, 100) < 15)) m = pm(m, 1500);
        return m;
      },
      skills: [
        { name: "Linear Regression", cost: 2500, cd: sec(8), desc: "60 dmg, aimed where they'll be in 0.5 s.",
          cast(s, i, pow) {
            const f = s.f[i], T = s.f[opp(i)];
            aimShot(s, i, "ds.line", f.x, f.y - px(20), T.x + T.vx * 30, T.y + Math.min(0, T.vy) * 10 - px(18), px(7), pm(60, pow), 80, 8);
            return true;
          } },
        { name: "Confidence Interval", aim: true, cost: 3000, cd: sec(14), desc: "3 s band around them: every hit inside crits.",
          cast(s, i) { const T = s.f[opp(i)]; spawn(s, { k: K.ZONE, b: "ds.ci", o: i, x: targetX(s, i), y: T.y + px(4), w: 70, h: 60, life: sec(3) }); return true; } },
      ],
    },
    {
      // res: 0 low-roll streak, 1 p-hack attacks left
      name: "Monte Carlo", passive: "Regression to the Mean",
      passiveDesc: "Damage rolls 50–150 %. Three low rolls in a row make the next hit 200 %.",
      combo: "p-hack buff → Random Sample. Remove Outliers answers summoners.",
      modOut(s, i, _t, h) {
        if (h.kind === "dot") return 1000;
        const f = s.f[i];
        if (f.res[0] >= 3) { f.res[0] = 0; return 2000; }
        let roll = 500 + rndInt(s, 1001);
        if (f.res[1] > 0) { f.res[1]--; roll = Math.max(roll, 500 + rndInt(s, 1001)); }
        f.res[0] = roll < 1000 ? f.res[0] + 1 : 0;
        return roll;
      },
      skills: [
        { name: "Random Sample", cost: 2000, cd: sec(7), desc: "5 dots appear around them and converge, 18 each.",
          cast(s, i, pow) {
            const T = s.f[opp(i)];
            for (let k = 0; k < 5; k++) {
              const x = T.x + (rndInt(s, 121) - 60) * px(1), y = T.y - px(18) + (rndInt(s, 81) - 60) * px(1);
              aimShot(s, i, "ds.dot", x, y, T.x, T.y - px(18), px(2), pm(18, pow), 50, 6);
            }
            return true;
          } },
        { name: "p < 0.05", cost: 3000, cd: sec(15), desc: "Your next 3 attacks roll twice and keep the better result.",
          cast(s, i) { s.f[i].res[1] = 3; return true; } },
        { name: "Remove Outliers", cost: 3500, cd: sec(18), desc: "Delete their summons and traps nearby; 80 dmg if they're close.",
          cast(s, i, pow) {
            const f = s.f[i], t = opp(i);
            spawn(s, { k: K.DELAYED, b: "fx.ring", o: i, x: f.x, y: f.y, w: 240, h: 80, life: 12 });
            for (const e of s.ents) if (e.o === t && e.k !== K.PROJ && Math.abs(e.x - f.x) <= px(120)) kill(e);
            if (near(f, s.f[t], 80)) dealDamage(s, i, t, pm(80, pow), { kind: "skill", hitstun: 18, kbx: (s.f[t].x >= f.x ? 1 : -1) * px(3) });
            return true;
          } },
      ],
    },
  ],
});

registerBeh("ds.line", (s, e) => projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 14 }));
registerBeh("ds.dot", (s, e) => projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 4 }));
registerBeh("ds.ci", (_s, e) => --e.life > 0);
void S;
