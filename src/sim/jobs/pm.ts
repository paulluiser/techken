// Project Manager — "Tickets and timelines". Controller. GDD §3.14.
import { sec } from "../constants";
import { buff, dealDamage, entBox, fighterBox, near, oldestHistory, opp, overlap, pm, projStep, pushCd, px, recordHistory, slow, spawn, stun, cancelActions } from "../core";
import { JOBS, registerBeh, registerJob } from "../registry";
import { K, S } from "../types";

registerJob({
  idx: 13, id: "pm", name: "Project Manager", color: 0x243a6b,
  walk: 512, jumps: 2, chargeFull: 60, tap: 25, full: 75, reach: 38, weight: 3,
  sets: [
    {
      // res: 0 Velocity stacks, 1 ticket frames to Done, 2 ticket power
      name: "Sprint Board", passive: "Velocity",
      passiveDesc: "Each skill that lands: −5 % cooldowns (max 4 stacks). Burnout resets it.",
      combo: "Assign → Code Freeze → two hits push it to Done → Velocity shortens cooldowns.",
      cdMul(s, i) { return 1000 - s.f[i].res[0] * 50; },
      onDealt(s, i, _t, dmg, h) {
        const f = s.f[i];
        if (dmg <= 0) return;
        if (h.kind === "skill") f.res[0] = Math.min(4, f.res[0] + 1);
        if (h.kind === "basic" && f.res[1] > 0) f.res[1] = Math.max(1, f.res[1] - 60); // move the ticket a column
      },
      onTaken(s, i, a, dmg) { if (a >= 0 && dmg > 0) s.f[i].res[1] = 0; }, // Blocked
      tick(s, i) {
        const f = s.f[i];
        recordHistory(s, f, s.f[opp(i)]);
        if (f.burnout > 0) f.res[0] = 0;
        if (f.res[1] > 0 && --f.res[1] === 0) dealDamage(s, i, opp(i), pm(70, f.res[2] || 1000), { kind: "skill", noGuard: true, hitstun: 14 });
      },
      skills: [
        { name: "Assign Ticket", cost: 2000, cd: sec(6), desc: "A ticket sticks to them: To Do → Done in 3 s = 70 dmg. Blocked if they hit you.",
          cast(s, i, pow) {
            const f = s.f[i];
            spawn(s, { k: K.PROJ, b: "pm.ticket", o: i, x: f.x + f.facing * px(12), y: f.y - px(20), vx: f.facing * px(6), w: 10, h: 8, life: 50, dmg: 0, p1: pow });
            return true;
          } },
        { name: "Code Freeze", cost: 3500, cd: sec(22), desc: "Freeze them for 1.2 s (range 140).",
          cast(s, i) { const f = s.f[i]; if (!near(f, s.f[opp(i)], 140, 70)) return false; stun(s, opp(i), 72); return true; } },
        { name: "Rewind Sprint", cost: 3000, cd: sec(18), desc: "Snap them back to where they were ~3 s ago.",
          cast(s, i) {
            const f = s.f[i], T = s.f[opp(i)], h = oldestHistory(f);
            if (!h || T.st[S.INVULN] > 0) return false;
            T.x = h.x; T.y = h.y; T.vx = 0; T.vy = 0; cancelActions(T);
            return true;
          } },
      ],
    },
    {
      name: "Timeline Control", passive: "Crunch Time",
      passiveDesc: "In the last 30 s of a round: ×1.5 Motivation regen, and Burnout doesn't slow you.",
      combo: "Slow them, haste yourself, backlog their escape tool.",
      tick(s, i) {
        const f = s.f[i];
        const crunch = s.timer <= sec(30);
        f.st[S.NO_BURN_SLOW] = crunch ? 1 : 0;
        if (crunch) buff(f, "regen", 500, 2);
      },
      skills: [
        { name: "Move the Deadline", cost: 2500, cd: sec(14), desc: "Slow-time bubble for 4 s: −40 % for them inside.",
          cast(s, i) { const T = s.f[opp(i)]; spawn(s, { k: K.ZONE, b: "pm.bubble", o: i, x: T.x, y: T.y + px(10), w: 90, h: 80, life: sec(4) }); return true; } },
        { name: "Fast-Track", cost: 2500, cd: sec(14), desc: "Haste yourself 4 s: +35 % speed and charge.",
          cast(s, i) { const f = s.f[i]; buff(f, "spd", 350, sec(4)); buff(f, "chg", 350, sec(4)); return true; } },
        { name: "Push to Backlog", cost: 3500, cd: sec(18), desc: "Disable their last-used skill for 5 s.",
          cast(s, i) {
            const T = s.f[opp(i)], k = T.st[S.LAST_SKILL] - 1;
            if (k < 0) return false;
            pushCd(T, k, sec(5));
            void JOBS;
            return true;
          } },
      ],
    },
  ],
});

registerBeh("pm.ticket", (s, e) => projStep(s, e, (s, e) => {
  const f = s.f[e.o];
  f.res[1] = sec(3); f.res[2] = e.p1;
  return false;
}));
registerBeh("pm.bubble", (s, e) => {
  const t = opp(e.o);
  if (overlap(entBox(e), fighterBox(s.f[t]))) slow(s, t, 40, 6);
  for (const p of s.ents) if (p.k === K.PROJ && p.o === t && overlap(entBox(p), entBox(e)) && (s.frame & 1)) { p.x -= p.vx; p.y -= p.vy; }
  return --e.life > 0;
});
