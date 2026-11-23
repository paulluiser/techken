// Technical Writer — "The pen is mightier". Zoner/trapper. GDD §3.16.
import { sec, WALL_L, WALL_R } from "../constants";
import { abs, clamp, dealDamage, entBox, fighterBox, kill, near, opp, overlap, ownEnts, pm, projStep, px, silence, slow, buff, spawn } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S } from "../types";

const cx = (x: number) => clamp(x, px(WALL_L + 10), px(WALL_R - 10));

registerJob({
  idx: 15, id: "tw", name: "Technical Writer", color: 0x1a1a1a,
  walk: 512, jumps: 2, chargeFull: 48, tap: 20, full: 65, reach: 20, weight: 2,
  ranged: { speed: px(5), life: 44 },
  sets: [
    {
      // res: 0 documented skills bitmask
      name: "The Manual", passive: "Documented",
      passiveDesc: "The first time each of their skills hits you, it's logged: −15 % from logged skills.",
      combo: "Footnotes on their path → RTFM knockdown onto a mine → Redact.",
      modIn(s, i, a, h) {
        if (a < 0 || h.kind !== "skill") return 1000;
        const k = s.f[a].st[S.LAST_SKILL] - 1;
        return k >= 0 && (s.f[i].res[0] >> k) & 1 ? 850 : 1000;
      },
      onTaken(s, i, a, _dmg, h) { if (a >= 0 && h.kind === "skill") { const k = s.f[a].st[S.LAST_SKILL] - 1; if (k >= 0) s.f[i].res[0] |= 1 << k; } },
      skills: [
        { name: "RTFM", cost: 2500, cd: sec(10), desc: "Throw a heavy manual: 80 dmg and a knockdown.",
          cast(s, i, pow) {
            const f = s.f[i];
            spawn(s, { k: K.PROJ, b: "tw.manual", o: i, x: f.x + f.facing * px(12), y: f.y - px(22), vx: f.facing * px(4), vy: -px(1), w: 12, h: 10, life: 70, dmg: pm(80, pow) });
            return true;
          } },
        { name: "Redact", cost: 3000, cd: sec(16), desc: "A black bar silences their skills for 2 s (range 140).",
          cast(s, i) {
            const f = s.f[i], t = opp(i);
            spawn(s, { k: K.DELAYED, b: "fx.redact", o: i, x: s.f[t].x, y: s.f[t].y - px(24), w: 40, h: 8, life: 20 });
            if (near(f, s.f[t], 140, 70)) silence(s, t, sec(2));
            return true;
          } },
        { name: "Footnote*", cost: 2000, cd: sec(8), desc: "An asterisk mine (max 2): 50 dmg when touched.",
          cast(s, i, pow) {
            const f = s.f[i], mines = ownEnts(s, i, "tw.mine");
            if (mines.length >= 2) kill(mines[0]);
            spawn(s, { k: K.TRAP, b: "tw.mine", o: i, x: cx(f.x + f.facing * px(30)), y: f.y, w: 8, h: 8, life: sec(20), dmg: pm(50, pow) });
            return true;
          } },
      ],
    },
    {
      name: "Red Pen", passive: "Track Changes",
      passiveDesc: "Full-charge shots leave ink. On your ink: you +15 % speed, they −15 %.",
      combo: "Paragraph high ground → Strikethrough on their level → Typo wrecks their answer.",
      tick(s, i) {
        const f = s.f[i], t = opp(i), T = s.f[t];
        for (const e of ownEnts(s, i, "tw.ink")) {
          if (f.onGround && overlap(entBox(e), fighterBox(f))) buff(f, "spd", 150, 2);
          if (T.onGround && overlap(entBox(e), fighterBox(T))) slow(s, t, 15, 2);
        }
      },
      onDealt(s, i, t, _dmg, h) {
        if (h.kind === "basic" && h.full) spawn(s, { k: K.ZONE, b: "tw.ink", o: i, x: cx(s.f[t].x), y: s.f[t].onGround ? s.f[t].y : px(184), w: 40, h: 4, life: sec(8) });
      },
      skills: [
        { name: "Write a Paragraph", cost: 2000, cd: sec(10), desc: "Text becomes a wall/platform for 6 s.",
          cast(s, i) {
            const f = s.f[i];
            spawn(s, { k: K.WALL, b: "tw.para", o: i, x: cx(f.x + f.facing * px(36)), y: f.y, w: 40, h: 26, hp: 200, life: sec(6) });
            return true;
          } },
        { name: "Strikethrough", cost: 2500, cd: sec(9), desc: "A line across the whole screen at your height: 65 dmg, cancels shots.",
          cast(s, i, pow) {
            const f = s.f[i], t = opp(i), T = s.f[t];
            spawn(s, { k: K.DELAYED, b: "fx.strike", o: i, x: px(192), y: f.y - px(16), w: 368, h: 3, life: 12 });
            for (const p of s.ents) if (p.k === K.PROJ && p.o === t && abs(p.y - (f.y - px(18))) < px(14)) kill(p);
            if (abs(T.y - f.y) < px(24)) dealDamage(s, i, t, pm(65, pow), { kind: "skill", hitstun: 16, kbx: (T.x >= f.x ? 1 : -1) * px(2) });
            return true;
          } },
        { name: "Typo", cost: 3000, cd: sec(14), desc: "Curse: their next skill fires the wrong way.",
          cast(s, i) { s.f[opp(i)].st[S.TYPO] = 1; return true; } },
      ],
    },
  ],
});

registerBeh("tw.manual", (s, e) => { e.vy += 12; return projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 30, kby: -px(2), kbx: (e.vx > 0 ? 1 : -1) * px(3) }); });
registerBeh("tw.mine", (s, e) => {
  if (--e.life <= 0) return false;
  const t = opp(e.o);
  if (overlap(entBox(e), fighterBox(s.f[t]))) { dealDamage(s, e.o, t, e.dmg, { kind: "skill", hitstun: 18, kby: -px(3) }); return false; }
  return true;
});
registerBeh("tw.ink", (_s, e) => --e.life > 0);
registerBeh("tw.para", (_s, e) => --e.life > 0 && e.hp > 0);
registerBeh("fx.redact", (_s, e) => --e.life > 0);
registerBeh("fx.strike", (_s, e) => --e.life > 0);
