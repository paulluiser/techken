// Cybersecurity Analyst — "Defense and reflection". Counter. GDD §3.10.
// Guard blocks 85 % and the first block every 3 s is free (see core.guardCost).
import { sec, WALL_L, WALL_R } from "../constants";
import { clamp, dealDamage, entBox, fighterBox, kill, near, opp, overlap, ownEnts, pm, px, spawn, stun } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S } from "../types";

registerJob({
  idx: 9, id: "cs", name: "Cybersecurity Analyst", color: 0xff2b3a,
  walk: 410, jumps: 2, chargeFull: 54, tap: 25, full: 70, reach: 24, weight: 4, guard: 850, dashCd: 90,
  sets: [
    {
      name: "Defense in Depth", passive: "Hardened",
      passiveDesc: "Every 5 s without being hit, gain a shield layer of 30 (max 3).",
      combo: "Patch to full layers → bait aggression → Mirror Protocol.",
      tick(s, i) {
        const f = s.f[i];
        if (f.st[S.HURT_IDLE] > 0 && f.st[S.HURT_IDLE] % sec(5) === 0) { f.st[S.SHIELD] = Math.min(90, f.st[S.SHIELD] + 30); f.st[S.SHIELD_T] = 1 << 20; }
      },
      skills: [
        { name: "Firewall", cost: 2500, cd: sec(12), desc: "A wall in front for 4 s; blocks projectiles and summons.",
          cast(s, i) {
            const f = s.f[i];
            spawn(s, { k: K.WALL, b: "cs.firewall", o: i, x: clamp(f.x + f.facing * px(22), px(WALL_L + 6), px(WALL_R - 6)), y: f.y, w: 6, h: 44, hp: 300, life: sec(4) });
            return true;
          } },
        { name: "Mirror Protocol", cost: 3000, cd: sec(15), desc: "1 s: reflect all projectiles and 50 % of melee damage.",
          cast(s, i) { s.f[i].st[S.REFLECT] = sec(1); return true; } },
        { name: "Patch", cost: 2000, cd: sec(14), desc: "Refill all shield layers.",
          cast(s, i) { const f = s.f[i]; f.st[S.SHIELD] = 90; f.st[S.SHIELD_T] = 1 << 20; return true; } },
      ],
    },
    {
      // res: 0 blocks counted, 1 bubble timer, 2 encrypt timer
      name: "Red Team", passive: "Threat Intel",
      passiveDesc: "After blocking or reflecting 3 attacks, your next basic is instantly fully charged.",
      combo: "Honeypot near a real item → stun → instant full charge.",
      onTaken(s, i, a, _dmg, h) {
        const f = s.f[i];
        if (a >= 0 && (f.guarding || f.st[S.REFLECT] > 0) && h.kind !== "dot") { if (++f.res[0] >= 3) { f.res[0] = 0; f.st[S.AUTO_FULL] = 1; } }
      },
      modIn(s, i, _a, h) { return s.f[i].res[2] > 0 && h.proj ? 1 : 1000; },
      tick(s, i) {
        const f = s.f[i];
        if (f.res[2] > 0) f.res[2]--;
        if (f.res[1] > 0 && --f.res[1] === 0) {
          const absorbed = 999 - Math.min(999, f.st[S.SHIELD]);
          f.st[S.SHIELD] = 0; f.st[S.SHIELD_T] = 0;
          spawn(s, { k: K.DELAYED, b: "fx.boom", o: i, x: f.x, y: f.y, w: 120, h: 50, life: 12 });
          const t = opp(i);
          if (absorbed > 0 && near(f, s.f[t], 70)) dealDamage(s, i, t, absorbed >> 1, { kind: "skill", noGuard: true, hitstun: 20, kbx: (s.f[t].x >= f.x ? 1 : -1) * px(4) });
        }
      },
      skills: [
        { name: "Honeypot", cost: 2500, cd: sec(14), desc: "A fake item. Picking it up stuns them 1 s.",
          cast(s, i) {
            const f = s.f[i];
            for (const h of ownEnts(s, i, "cs.honeypot")) kill(h);
            spawn(s, { k: K.TRAP, b: "cs.honeypot", o: i, x: clamp(f.x + f.facing * px(60), px(WALL_L + 10), px(WALL_R - 10)), y: f.y, w: 12, h: 12, life: sec(20) });
            return true;
          } },
        { name: "Zero-Trust Bubble", cost: 3000, cd: sec(16), desc: "Absorb everything for 3 s, then explode for half of it.",
          cast(s, i) { const f = s.f[i]; f.st[S.SHIELD] = 999; f.st[S.SHIELD_T] = sec(3) + 2; f.res[1] = sec(3); return true; } },
        { name: "Encrypt", cost: 2000, cd: sec(12), desc: "2 s: projectiles can't lock on (they pass through you).",
          cast(s, i) { s.f[i].res[2] = sec(2); return true; } },
      ],
    },
  ],
});

registerBeh("cs.firewall", (s, e) => {
  for (const p of s.ents) if (p.o !== e.o && p.k === K.SUMMON && overlap(entBox(p), entBox(e))) p.x += (p.x < e.x ? -1 : 1) * px(2);
  return --e.life > 0 && e.hp > 0;
});
registerBeh("cs.honeypot", (s, e) => {
  if (--e.life <= 0) return false;
  const t = opp(e.o);
  if (overlap(entBox(e), fighterBox(s.f[t]))) { stun(s, t, sec(1)); return false; }
  void pm;
  return true;
});
