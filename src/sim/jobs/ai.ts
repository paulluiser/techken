// AI/ML Engineer — "The bot does the work". Summoner. GDD §3.12.
import { ATK_STARTUP, sec, WALL_L, WALL_R } from "../constants";
import { abs, aimShot, clamp, dealDamage, entBox, fighterBox, invert, kill, opp, overlap, ownEnts, pm, projStep, px, spawn } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, type Entity, type State } from "../types";

// bot: p1 power, p2 level-up XP (hits), p3 facing; level = 1 + (xp >= 10) + (xp >= 25), plus fine-tune
function botLevel(s: State, e: Entity) { const f = s.f[e.o]; return Math.min(3, 1 + (e.p2 >= 10 ? 1 : 0) + (e.p2 >= 25 ? 1 : 0) + (f.res[0] > 0 ? 1 : 0)); }

registerJob({
  idx: 11, id: "ai", name: "AI/ML Engineer", color: 0x6a2bd9,
  walk: 512, jumps: 2, chargeFull: 60, tap: 15, full: 60, reach: 20, weight: 2,
  ranged: { speed: px(4), life: 40 },
  sets: [
    {
      // res: 0 fine-tune timer
      name: "Reinforcement Learning", passive: "Learning Rate",
      passiveDesc: "Your bot gains XP on hits: Lv2 at 10, Lv3 at 25 (laser). Resets each round.",
      combo: "Bot pressure → decoys confuse → Fine-Tune for a Lv3 laser.",
      tick(s, i) { if (s.f[i].res[0] > 0) s.f[i].res[0]--; },
      skills: [
        { name: "Deploy Model", cost: 3000, cd: sec(15), desc: "Summon your Bot (150 HP, bites 12/s). Only one.",
          cast(s, i, pow) {
            const f = s.f[i];
            for (const b of ownEnts(s, i, "ai.bot")) kill(b);
            spawn(s, { k: K.SUMMON, b: "ai.bot", o: i, x: f.x + f.facing * px(18), y: f.y, w: 14, h: 14, hp: 150, life: 1 << 30, p1: pow });
            return true;
          } },
        { name: "Fine-Tune", cost: 2000, cd: sec(10), desc: "+1 bot level for 6 s (heals it 50 % if already Lv3).",
          cast(s, i) {
            const b = ownEnts(s, i, "ai.bot")[0];
            if (!b) return false;
            if (botLevel(s, b) >= 3) b.hp = Math.min(150 + 60, b.hp + 75);
            s.f[i].res[0] = sec(6);
            return true;
          } },
        { name: "Hallucinate", cost: 2500, cd: sec(12), desc: "2 decoys of you for 3 s that soak hits.",
          cast(s, i) {
            const f = s.f[i];
            for (const d of [-1, 1]) spawn(s, { k: K.SUMMON, b: "ai.decoy", o: i, x: clamp(f.x + d * px(34), px(WALL_L + 12), px(WALL_R - 12)), y: f.y, w: 20, h: 34, hp: 1, life: sec(3) });
            return true;
          } },
      ],
    },
    {
      name: "Multi-Agent", passive: "Orbit",
      passiveDesc: "Up to 3 drones orbit you and fire an 8-dmg shot whenever you release a basic.",
      combo: "3 drones → every charged basic is a 4-hit volley → Agentic Loop pincer.",
      tick(s, i) {
        const f = s.f[i];
        if (f.atk === ATK_STARTUP + 1) {
          const T = s.f[opp(i)];
          for (const d of ownEnts(s, i, "ai.drone")) if (d.p2 === 0) aimShot(s, i, "ai.zap", d.x, d.y - px(4), T.x, T.y - px(18), px(5), 8, 60, 4);
        }
      },
      skills: [
        { name: "Spawn Agent", cost: 2000, cd: sec(6), desc: "+1 drone (30 HP), max 3.",
          cast(s, i) {
            const f = s.f[i], ds = ownEnts(s, i, "ai.drone");
            if (ds.length >= 3) kill(ds[0]);
            spawn(s, { k: K.SUMMON, b: "ai.drone", o: i, x: f.x, y: f.y - px(40), w: 8, h: 6, hp: 30, life: 1 << 30, p1: ds.length * 120 });
            return true;
          } },
        { name: "Agentic Loop", cost: 3500, cd: sec(16), desc: "Drones hunt on their own for 5 s, each firing every 0.5 s.",
          cast(s, i) { const ds = ownEnts(s, i, "ai.drone"); if (!ds.length) return false; for (const d of ds) d.p2 = sec(5); return true; } },
        { name: "Prompt Injection", cost: 3000, cd: sec(18), desc: "Hijack an enemy summon for 5 s, or flip their controls 1.5 s.",
          cast(s, i) {
            const t = opp(i);
            const victim = s.ents.find((e) => e.o === t && e.k === K.SUMMON && e.hp > 0);
            if (victim) { victim.o = i; victim.life = Math.min(victim.life, sec(5)); }
            else invert(s, t, 90);
            return true;
          } },
      ],
    },
  ],
});

registerBeh("ai.bot", (s, e) => {
  if (e.hp <= 0) return false;
  e.t++;
  const t = opp(e.o), T = s.f[t], lv = botLevel(s, e);
  const dir = T.x > e.x ? 1 : -1;
  e.p3 = dir;
  if (abs(T.x - e.x) > px(10)) e.x += dir * (300 + lv * 60);
  e.x = clamp(e.x, px(WALL_L + 8), px(WALL_R - 8));
  e.y = Math.max(e.y, T.onGround ? T.y : e.y);
  if (overlap(entBox(e), fighterBox(T)) && e.t % 5 === 0) {
    const d = dealDamage(s, e.o, t, Math.max(1, pm(1 + (lv >> 1), e.p1)), { kind: "dot" });
    if (d > 0 && e.t % 30 === 0) e.p2++;
  }
  if (lv >= 3 && e.t % 120 === 0) aimShot(s, e.o, "ai.laser", e.x, e.y - px(8), T.x, T.y - px(18), px(8), 40, 50, 6);
  return true;
});
registerBeh("ai.decoy", (_s, e) => --e.life > 0 && e.hp > 0);
registerBeh("ai.drone", (s, e) => {
  if (e.hp <= 0) return false;
  e.t++;
  const f = s.f[e.o], T = s.f[opp(e.o)];
  if (e.p2 > 0) { // hunting
    e.p2--;
    e.x += clamp(T.x - e.x, -px(2), px(2));
    e.y += clamp(T.y - px(44) - e.y, -px(2), px(2));
    if (e.t % 30 === 0) aimShot(s, e.o, "ai.zap", e.x, e.y, T.x, T.y - px(18), px(5), 8, 60, 4);
  } else { // orbit (stepped positions, no trig)
    const slot = Math.trunc((e.t + e.p1) / 20) % 4;
    const ox = [px(16), 0, -px(16), 0][slot], oy = [0, -px(10), 0, px(10)][slot];
    e.x += clamp(f.x + ox - e.x, -px(3), px(3));
    e.y += clamp(f.y - px(46) + oy - e.y, -px(3), px(3));
  }
  return true;
});
registerBeh("ai.zap", (s, e) => projStep(s, e, undefined, { kind: "summon", proj: true, hitstun: 4 }));
registerBeh("ai.laser", (s, e) => projStep(s, e, undefined, { kind: "summon", proj: true, hitstun: 12 }));
