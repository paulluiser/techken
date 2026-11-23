// Network Admin — "Signals". Zoner. GDD §3.5. Basic shots lose damage with distance.
import { sec } from "../constants";
import { abs, buff, dealDamage, dxPx, entBox, kill, opp, overlap, ownEnts, pm, projStep, px, silence, slow, spawn, near } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S, type State } from "../types";

const routerOf = (s: State, i: number) => ownEnts(s, i, "na.router")[0];
function falloff(s: State, i: number, t: number) { // 100 % close, 70 % at max range
  const d = Math.min(240, dxPx(s.f[i], s.f[t]));
  return 1000 - Math.trunc((300 * d) / 240);
}

registerJob({
  idx: 4, id: "na", name: "Network Admin", color: 0x39ff7a,
  walk: 384, jumps: 2, chargeFull: 60, tap: 20, full: 70, reach: 20, weight: 2,
  ranged: { speed: px(6), life: 42 },
  sets: [
    {
      name: "Full Bars", passive: "Access Point",
      passiveDesc: "A router spawns at round start. Near it (80 px): +20 % damage and +50 % Motivation regen.",
      combo: "Hold ground near the AP → Pings add lag → Packet Loss shuts down their zoning.",
      init(s, i) { const f = s.f[i]; spawn(s, { k: K.ANCHOR, b: "na.router", o: i, x: f.x, y: f.y, w: 12, h: 10, hp: 9999, life: 1 << 30 }); },
      tick(s, i) { const r = routerOf(s, i), f = s.f[i]; if (r && abs(f.x - r.x) <= px(80)) buff(f, "regen", 500, 2); },
      modOut(s, i, t, h) {
        const r = routerOf(s, i), f = s.f[i];
        let m = h.kind === "basic" ? falloff(s, i, t) : 1000;
        if (r && abs(f.x - r.x) <= px(80)) m = pm(m, 1200);
        return m;
      },
      modIn(s, i, a) { // enemies standing in your Packet Loss field deal 30 % less
        if (a < 0) return 1000;
        for (const e of ownEnts(s, i, "na.loss")) if (overlap(entBox(e), { x1: s.f[a].x - 1, x2: s.f[a].x + 1, y1: s.f[a].y - px(10), y2: s.f[a].y })) return 700;
        return 1000;
      },
      skills: [
        { name: "Ping", cost: 1500, cd: sec(4), desc: "Fast pulse: 20 dmg + 0.2 s of lag.",
          cast(s, i, pow) {
            const f = s.f[i];
            spawn(s, { k: K.PROJ, b: "na.ping", o: i, x: f.x + f.facing * px(12), y: f.y - px(20), vx: f.facing * px(8), w: 6, h: 6, life: 40, dmg: pm(20, pow) });
            return true;
          } },
        { name: "Packet Loss", cost: 3000, cd: sec(14), desc: "Field for 5 s: destroys their shots; their attacks inside −30 %.",
          cast(s, i) { const f = s.f[i]; spawn(s, { k: K.ZONE, b: "na.loss", o: i, x: f.x + f.facing * px(40), y: f.y, w: 80, h: 60, life: sec(5) }); return true; } },
        { name: "Relocate AP", cost: 2000, cd: sec(10), desc: "Teleport the router to you.",
          cast(s, i) {
            const f = s.f[i], r = routerOf(s, i);
            if (r) { r.x = f.x; r.y = f.y; } else spawn(s, { k: K.ANCHOR, b: "na.router", o: i, x: f.x, y: f.y, w: 12, h: 10, hp: 9999, life: 1 << 30 });
            return true;
          } },
      ],
    },
    {
      // res: 0 bandwidth hits, 1 throttle timer, 2 throttle snap dmg
      name: "Traffic Control", passive: "Bandwidth",
      passiveDesc: "Hits fill a meter (5). Full: your next skill does +30 %.",
      combo: "Throttle → Jam so they can't skill out → Broadcast Storm.",
      onDealt(s, i, _t, dmg) { if (dmg > 0) { const f = s.f[i]; if (++f.res[0] >= 5) { f.res[0] = 0; f.st[S.CRIT_NEXT] = 0; buff(f, "dmg", 300, sec(3)); } } },
      modOut(s, i, t, h) { return h.kind === "basic" ? falloff(s, i, t) : 1000; },
      tick(s, i) {
        const f = s.f[i];
        if (f.res[1] > 0) {
          f.res[1]--;
          const t = opp(i);
          slow(s, t, 35, 2); buff(f, "spd", 150, 2);
          if (dxPx(f, s.f[t]) > 160) { dealDamage(s, i, t, f.res[2], { kind: "skill", noGuard: true, hitstun: 12 }); f.res[1] = 0; }
        }
      },
      skills: [
        { name: "Throttle", cost: 3000, cd: sec(15), desc: "Tether 4 s: they −35 % speed, you +15 %. Breaking range snaps it for 60.",
          cast(s, i, pow) { const f = s.f[i]; if (dxPx(f, s.f[opp(i)]) > 160) return false; f.res[1] = sec(4); f.res[2] = pm(60, pow); return true; } },
        { name: "Signal Jam", cost: 2000, cd: sec(12), desc: "Silences their skills for 2 s (range 160).",
          cast(s, i) {
            const f = s.f[i];
            spawn(s, { k: K.DELAYED, b: "fx.ring", o: i, x: f.x, y: f.y, w: 320, h: 80, life: 10 });
            if (near(f, s.f[opp(i)], 160, 80)) silence(s, opp(i), sec(2));
            return true;
          } },
        { name: "Broadcast Storm", cost: 4000, cd: sec(20), desc: "3 ground waves, 45 each. Jump them.",
          cast(s, i, pow) {
            const f = s.f[i];
            for (let k = 0; k < 3; k++) {
              spawn(s, { k: K.PROJ, b: "na.wave", o: i, x: f.x - f.facing * px(40 * k), y: f.y - px(6), vx: f.facing * px(4), w: 14, h: 12, life: 140, dmg: pm(45, pow) });
            }
            return true;
          } },
      ],
    },
  ],
});

registerBeh("na.router", (_s, e) => e.hp > 0);
registerBeh("na.loss", (s, e) => {
  for (const p of s.ents) if (p.k === K.PROJ && p.o !== e.o && overlap(entBox(p), entBox(e))) kill(p);
  return --e.life > 0;
});
registerBeh("na.ping", (s, e) => projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 12 }));
registerBeh("na.wave", (s, e) => projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 14, kby: -px(2) }));
