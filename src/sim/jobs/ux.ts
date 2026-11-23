// UI/UX Designer — "Pixel-perfect rushdown". GDD §3.15.
import { sec, WALL_L, WALL_R } from "../constants";
import { buff, clamp, dealDamage, dxPx, near, opp, pm, px, spawn, addMot, kill, ownEnts } from "../core";
import { JOBS, registerBeh, registerJob, type SetDef } from "../registry";
import { K, S, type State } from "../types";

const cx = (x: number) => clamp(x, px(WALL_L + 10), px(WALL_R - 10));

// res: 0 wireframe active timer, 1 wireframe x, 2 wireframe y, 3 flurry frames, 4 flurry power, 5 flow hits
function flurry(s: State, i: number) {
  const f = s.f[i];
  if (f.res[3] <= 0) return;
  f.res[3]--;
  const t = opp(i), T = s.f[t];
  if (f.res[3] % 5 === 0 && near(f, T, 34, 40)) {
    const last = f.res[3] === 0;
    dealDamage(s, i, t, pm(15, f.res[4]), { kind: "skill", melee: true, hitstun: last ? 24 : 8, kbx: f.facing * (last ? px(5) : px(1)), kby: last ? -px(2) : 0 });
  }
}

const DESIGN: SetDef = {
  name: "Design System", passive: "Pixel Perfect",
  passiveDesc: "Hitting with the exact tip of the stylus (max reach) does +35 % and refunds 5 Motivation.",
  combo: "Wireframe → dive in → Drag & Drop into the wall → Make It Pop → teleport out.",
  modOut(s, i, t, h) {
    if (h.kind !== "basic") return 1000;
    if (dxPx(s.f[i], s.f[t]) >= 32) { addMot(s.f[i], 500); return 1350; }
    return 1000;
  },
  tick(s, i) { const f = s.f[i]; if (f.res[0] > 0 && --f.res[0] === 0) for (const w of ownEnts(s, i, "ux.wire")) kill(w); flurry(s, i); },
  canCast(s, i, k) {
    const f = s.f[i];
    if (k === 0 && f.res[0] > 0) { // recast Wireframe: teleport back to it
      f.x = f.res[1]; f.y = f.res[2]; f.vx = 0; f.vy = 0; f.res[0] = 0; f.iframes = 8;
      for (const w of ownEnts(s, i, "ux.wire")) kill(w);
      return false;
    }
    return true;
  },
  skills: [
    { name: "Wireframe", cost: 2500, cd: sec(10), desc: "Leave an outline. Use again within 4 s to teleport back to it.",
      cast(s, i) {
        const f = s.f[i];
        f.res[0] = sec(4); f.res[1] = f.x; f.res[2] = f.y;
        spawn(s, { k: K.ZONE, b: "ux.wire", o: i, x: f.x, y: f.y, w: 18, h: 32, life: sec(4) });
        return true;
      } },
    { name: "Drag & Drop", cost: 3000, cd: sec(14), desc: "Grab them and throw them where you face: 40 dmg.",
      cast(s, i, pow) {
        const f = s.f[i], t = opp(i);
        if (!near(f, s.f[t], 32, 36)) return false;
        dealDamage(s, i, t, pm(40, pow), { kind: "skill", melee: true, noGuard: true, hitstun: 30, kbx: f.facing * px(6), kby: -px(3) });
        return true;
      } },
    { name: "Make It Pop", cost: 3500, cd: sec(16), desc: "5-stab flurry, 15 each; the last pops them away.",
      cast(s, i, pow) { const f = s.f[i]; f.res[3] = 25; f.res[4] = pow; f.st[S.CAST] = 25; return true; } },
  ],
};

const FLOW: SetDef = {
  name: "User Flow", passive: "Flow State",
  passiveDesc: "Each hit in a row without getting hit: +5 % speed (max +25 %).",
  combo: "Grid Snap in → flurry builds Flow → A/B Test escapes the punish.",
  onDealt(s, i, _t, dmg) { if (dmg > 0) { const f = s.f[i]; f.res[5] = Math.min(5, f.res[5] + 1); } },
  onTaken(s, i, _a, dmg) { if (dmg > 0) s.f[i].res[5] = 0; },
  tick(s, i) { const f = s.f[i]; if (f.res[5] > 0) buff(f, "spd", f.res[5] * 50, 2); },
  skills: [
    { name: "Grid Snap", cost: 2000, cd: sec(8), desc: "Blink 48 px to the next grid point; your next hit crits.",
      cast(s, i) {
        const f = s.f[i];
        f.x = cx(Math.round((f.x + f.facing * px(48)) / px(16)) * px(16));
        f.st[S.CRIT_NEXT] = 1; f.iframes = 6;
        return true;
      } },
    { name: "A/B Test", cost: 3000, cd: sec(15), desc: "Split in two for 3 s. One is fake and pops on any hit.",
      cast(s, i) {
        const f = s.f[i];
        spawn(s, { k: K.SUMMON, b: "ai.decoy", o: i, x: cx(f.x - f.facing * px(30)), y: f.y, w: 20, h: 32, hp: 1, life: sec(3) });
        f.iframes = 10;
        return true;
      } },
    { name: "Color Picker", cost: 3000, cd: sec(18), desc: "Copy their last-used skill and cast it at 60 % power.",
      cast(s, i) {
        const T = s.f[opp(i)], k = T.st[S.LAST_SKILL] - 1;
        const sk = k >= 0 ? JOBS[T.job]?.sets[T.set].skills[k] : undefined;
        if (!sk || sk.name === "Color Picker") return false;
        return sk.cast(s, i, 600);
      } },
  ],
};

registerJob({
  idx: 14, id: "ux", name: "UI/UX Designer", color: 0x7ad3c4,
  walk: 640, jumps: 2, chargeFull: 30, tap: 15, full: 50, reach: 36, weight: 1,
  sets: [DESIGN, FLOW],
});

registerBeh("ux.wire", (_s, e) => --e.life > 0);
