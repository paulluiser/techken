// Vibe Coder — "Burst, then rate-limited". Glass cannon with Tokens. GDD §3.17.
import { sec } from "../constants";
import { abs, buff, dealDamage, dxPx, kill, opp, pm, projStep, px, spawn } from "../core";
import { registerBeh, registerJob, type SetDef } from "../registry";
import { K, S, type State } from "../types";

// shared res: 0 tokens (0..10000), 1 frames since last skill, 2 last skill (k+1), 3 rate-limited flag,
// 4 flurry frames left, 5 flurry power, 6 touch-grass frames left
const TOK_MAX = 10000;

function tokenTick(s: State, i: number) {
  const f = s.f[i];
  f.res[1]++;
  if (f.res[3] && f.st[S.RATE_LIMIT] === 0) { f.res[3] = 0; f.res[0] = TOK_MAX; }
  if (!f.res[3] && f.res[1] > 120) f.res[0] = Math.min(TOK_MAX, f.res[0] + 17);
  if (f.res[6] > 0 && --f.res[6] === 0) f.res[0] = TOK_MAX;
  // Accept All Changes flurry
  if (f.res[4] > 0) {
    f.res[4]--;
    const t = opp(i), T = s.f[t];
    f.facing = T.x >= f.x ? 1 : -1;
    if (dxPx(f, T) > 18) f.x += f.facing * px(3);
    if (f.res[4] % 6 === 0 && dxPx(f, T) <= 30 && abs(T.y - f.y) < px(40)) {
      dealDamage(s, i, t, pm(18, f.res[5]), { kind: "skill", melee: true, hitstun: 8, kbx: f.facing * px(1) });
    }
  }
}
const tokenSet = (base: Omit<SetDef, "tick" | "canCast" | "afterCast" | "init">): SetDef => ({
  ...base,
  init(s, i) { s.f[i].res[0] = TOK_MAX; },
  tick: tokenTick,
  canCast(s, i, k) { const f = s.f[i]; return !f.res[3] && f.res[0] >= (base.skills[k].tok ?? 0) && f.res[6] === 0; },
  afterCast(s, i, k) {
    const f = s.f[i];
    f.res[0] -= base.skills[k].tok ?? 0;
    f.res[1] = 0;
    if (!(f.set === 0 && k === 2)) f.res[2] = k + 1;
    if (f.res[0] <= 0 && (base.skills[k].tok ?? 0) > 0) { f.res[0] = 0; f.res[3] = 1; f.st[S.RATE_LIMIT] = sec(5); }
  },
});
function contextWindow(s: State, i: number) { const f = s.f[i]; if (f.res[0] >= TOK_MAX) buff(f, "dmg", 300, sec(1)); }

const PROMPT_A = tokenSet({
  name: "Prompt & Pray", passive: "Context Window",
  passiveDesc: "The first skill on a full Token bar does +30 % damage.",
  combo: "Full bar → Generate → Accept All → Regenerate ≈ 280 burst, exactly 100 Tokens → Rate Limited.",
  skills: [
    { name: "Generate", cost: 1000, tok: 3500, cd: sec(4), desc: "Big code-blast projectile, 80 dmg.",
      cast(s, i, pow) {
        contextWindow(s, i);
        const f = s.f[i];
        spawn(s, { k: K.PROJ, b: "vc.gen", o: i, x: f.x + f.facing * px(14), y: f.y - px(20), vx: f.facing * px(6), w: 14, h: 12, life: 60, dmg: pm(80, pow) });
        return true;
      } },
    { name: "Accept All Changes", cost: 1000, tok: 4500, cd: sec(12), desc: "6 auto-hits × 18. You can't steer it.",
      cast(s, i, pow) { contextWindow(s, i); const f = s.f[i]; f.res[4] = 36; f.res[5] = pow; f.st[S.CAST] = 36; return true; } },
    { name: "Regenerate", cost: 500, tok: 2000, cd: sec(6), desc: "Re-cast your last skill at 60 % power.",
      cast(s, i) {
        const f = s.f[i], k = f.res[2] - 1;
        if (k < 0 || k === 2) return false;
        return PROMPT_A.skills[k].cast(s, i, 600);
      } },
  ],
});

const SHIP_B = tokenSet({
  name: "Ship It Friday", passive: "Vibes",
  passiveDesc: "Every hit you land refunds 5 Tokens. Every hit you take costs 5 Tokens.",
  combo: "Autocomplete keeps Tokens up → YOLO Deploy up close → Touch Grass when safe.",
  onDealt(s, i, _t, dmg) { if (dmg > 0) s.f[i].res[0] = Math.min(TOK_MAX, s.f[i].res[0] + 500); },
  onTaken(s, i, _a, dmg) { if (dmg > 0) s.f[i].res[0] = Math.max(0, s.f[i].res[0] - 500); },
  skills: [
    { name: "Autocomplete", cost: 500, tok: 2000, cd: sec(3), desc: "Homing tab-key shot, 35 dmg.",
      cast(s, i, pow) {
        const f = s.f[i];
        spawn(s, { k: K.PROJ, b: "vc.auto", o: i, x: f.x + f.facing * px(12), y: f.y - px(22), vx: f.facing * px(4), w: 8, h: 8, life: 90, dmg: pm(35, pow) });
        return true;
      } },
    { name: "YOLO Deploy", cost: 1500, tok: 5000, cd: sec(15), desc: "Explosion: 150 to them, 50 to you.",
      cast(s, i, pow) {
        const f = s.f[i], t = opp(i), T = s.f[t];
        spawn(s, { k: K.DELAYED, b: "fx.boom", o: i, x: f.x, y: f.y, w: 140, h: 60, life: 14 });
        if (dxPx(f, T) <= 70 && abs(T.y - f.y) < px(50)) {
          dealDamage(s, i, t, pm(150, pow), { kind: "skill", hitstun: 30, kbx: (T.x >= f.x ? 1 : -1) * px(5), kby: -px(3) });
        }
        for (const e of s.ents) if (e.o === t && e.k !== K.PROJ && abs(e.x - f.x) <= px(70)) kill(e);
        dealDamage(s, -1, i, 50, { kind: "dot" });
        return true;
      } },
    { name: "Touch Grass", cost: 0, tok: 0, cd: sec(16), desc: "Sit 1.5 s (rooted, open to hits), refill all Tokens.",
      cast(s, i) { const f = s.f[i]; f.res[6] = 90; f.st[S.CAST] = 90; f.st[S.ROOT] = 90; return true; } },
  ],
});

registerJob({
  idx: 16, id: "vc", name: "Vibe Coder", color: 0xff6ad5,
  walk: 614, jumps: 2, chargeFull: 36, tap: 20, full: 60, reach: 20, weight: 2,
  ranged: { speed: px(6), life: 45 },
  sets: [PROMPT_A, SHIP_B],
});

registerBeh("vc.gen", (s, e) => projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 16, kbx: (e.vx > 0 ? 1 : -1) * px(3) }));
registerBeh("vc.auto", (s, e) => {
  const T = s.f[opp(e.o)];
  const ty = T.y - px(18);
  e.vy += ty > e.y ? 24 : -24;
  e.vy = Math.max(-px(2), Math.min(px(2), e.vy));
  if ((T.x - e.x) * e.vx < 0 && e.t > 10) e.vx = -e.vx;
  return projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 10 });
});
