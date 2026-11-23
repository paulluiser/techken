// Cloud Engineer — "Literally clouds, strikes anywhere". Artillery. GDD §3.8.
import { sec, WALL_L, WALL_R } from "../constants";
import { abs, cancelActions, clamp, dealDamage, fighterBox, kill, opp, ownEnts, pm, projStep, px, slow, spawn, entBox, overlap } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S, type Entity, type State } from "../types";

const clampX = (x: number) => clamp(x, px(WALL_L + 16), px(WALL_R - 16));

registerJob({
  idx: 7, id: "ce", name: "Cloud Engineer", color: 0x5b8fd6,
  walk: 512, jumps: 3, chargeFull: 54, tap: 20, full: 60, reach: 22, weight: 1, glide: true,
  sets: [
    {
      name: "Weather Forecast", passive: "Auto-Scaling",
      passiveDesc: "Your clouds grow 20 % bigger every second they're alive.",
      combo: "Rain → Wet → Lightning. Cumulus gives you height to kite from.",
      skills: [
        { name: "Rain Cloud", cost: 2000, cd: sec(7), desc: "Target them: rains 20/s for 3 s and makes them Wet.",
          cast(s, i, pow) {
            const T = s.f[opp(i)];
            spawn(s, { k: K.ZONE, b: "ce.rain", o: i, x: clampX(T.x), y: T.y - px(52), w: 40, h: 12, life: sec(3), p1: pow });
            return true;
          } },
        { name: "Lightning Strike", cost: 3500, cd: sec(14), desc: "Target them: 0.8 s warning, then 100, or 200 if Wet.",
          cast(s, i, pow) {
            const T = s.f[opp(i)];
            spawn(s, { k: K.DELAYED, b: "ce.bolt", o: i, x: clampX(T.x), y: px(184), w: 20, h: 184, life: 54, p1: pow });
            return true;
          } },
        { name: "Cumulus", cost: 1500, cd: sec(8), desc: "Solid cloud platform for 5 s.",
          cast(s, i) {
            const f = s.f[i];
            spawn(s, { k: K.PLATFORM, b: "ce.cumulus", o: i, x: clampX(f.x + f.facing * px(40)), y: f.y - px(40), w: 48, h: 4, life: sec(5) });
            return true;
          } },
      ],
    },
    {
      // res: 0 failover used this round
      name: "Multi-Region", passive: "High Availability",
      passiveDesc: "Once per round, lethal damage fails you over to a living anchor with 100 HP.",
      combo: "Two anchors = crossfire and a spare life.",
      onLethal(s, i) {
        const f = s.f[i];
        if (f.res[0]) return false;
        const a = ownEnts(s, i, "ce.anchor")[0];
        if (!a) return false;
        f.res[0] = 1; kill(a);
        f.hp = 100; f.x = a.x; f.y = a.y; f.vx = 0; f.vy = 0; f.iframes = 60; f.hitstun = 0;
        cancelActions(f);
        return true;
      },
      skills: [
        { name: "Deploy Region", cost: 1500, cd: sec(10), desc: "Place a cloud anchor (max 2, 60 HP).",
          cast(s, i) {
            const f = s.f[i], mine = ownEnts(s, i, "ce.anchor");
            if (mine.length >= 2) kill(mine[0]);
            spawn(s, { k: K.ANCHOR, b: "ce.anchor", o: i, x: clampX(f.x + f.facing * px(70)), y: f.y - px(44), w: 16, h: 12, hp: 60, life: 1 << 30 });
            return true;
          } },
        { name: "Serverless Strike", cost: 3000, cd: sec(12), desc: "A fist from every anchor, 60 each.",
          cast(s, i, pow) {
            const anchors = ownEnts(s, i, "ce.anchor");
            if (!anchors.length) return false;
            const T = s.f[opp(i)];
            for (const a of anchors) aimShot(s, i, a.x, a.y - px(6), T.x, T.y - px(18), px(5), pm(60, pow));
            return true;
          } },
        { name: "Cold Start", cost: 2500, cd: sec(16), desc: "Hail on them: 30 dmg, slow 40 % for 3 s.",
          cast(s, i, pow) {
            const T = s.f[opp(i)];
            spawn(s, { k: K.DELAYED, b: "ce.hail", o: i, x: clampX(T.x), y: T.y, w: 40, h: 60, life: 18, p1: pow });
            return true;
          } },
      ],
    },
  ],
});

function aimShot(s: State, i: number, x: number, y: number, tx: number, ty: number, speed: number, dmg: number) {
  const dx = tx - x, dy = ty - y;
  const len = Math.max(1, Math.trunc(Math.sqrt(dx / 16 * (dx / 16) + dy / 16 * (dy / 16))) * 16);
  spawn(s, { k: K.PROJ, b: "ce.fist", o: i, x, y, vx: Math.trunc((dx * speed) / len), vy: Math.trunc((dy * speed) / len), w: 10, h: 10, life: 90, dmg });
}

registerBeh("ce.rain", (s, e: Entity) => {
  e.t++;
  if (e.t % 60 === 0) e.w = Math.min(80, Math.trunc((e.w * 12) / 10)); // Auto-Scaling
  const t = opp(e.o), T = s.f[t];
  if (e.t % 3 === 0 && abs(T.x - e.x) < px(e.w) / 2 && T.y > e.y) {
    dealDamage(s, e.o, t, Math.max(1, pm(1, e.p1)), { kind: "dot" });
    T.st[S.WET] = sec(2);
  }
  return --e.life > 0;
});
registerBeh("ce.bolt", (s, e) => {
  e.t++;
  if (e.t === 48) {
    const t = opp(e.o), T = s.f[t];
    if (abs(T.x - e.x) < px(14)) {
      dealDamage(s, e.o, t, pm(T.st[S.WET] > 0 ? 200 : 100, e.p1), { kind: "skill", hitstun: 24, kby: -px(2), noGuard: false });
    }
  }
  return --e.life > 0;
});
registerBeh("ce.cumulus", (s, e) => {
  e.t++;
  if (e.t % 60 === 0) e.w = Math.min(96, Math.trunc((e.w * 12) / 10));
  void s; return --e.life > 0;
});
registerBeh("ce.anchor", (_s, e) => e.hp > 0);
registerBeh("ce.fist", (s, e) => projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 14, kbx: (e.vx > 0 ? 1 : -1) * px(2) }));
registerBeh("ce.hail", (s, e) => {
  e.t++;
  if (e.t === 12) {
    const t = opp(e.o);
    if (overlap(entBox(e), fighterBox(s.f[t]))) { dealDamage(s, e.o, t, pm(30, e.p1), { kind: "skill", hitstun: 8 }); slow(s, t, 40, sec(3)); }
  }
  return --e.life > 0;
});
