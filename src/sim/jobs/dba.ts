// Database Admin — "The Heavy". Grappler/tank. GDD §3.6.
import { JUMP_V, sec, WALL_L, WALL_R } from "../constants";
import { abs, clamp, dealDamage, dxPx, kill, opp, pm, px, spawn, stun } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S } from "../types";

registerJob({
  idx: 5, id: "db", name: "Database Admin", color: 0xc9a46a,
  walk: 384, jumps: 1, chargeFull: 66, tap: 35, full: 110, reach: 30, weight: 5, superArmor: true,
  sets: [
    {
      // res: 0 HP snapshot, 1 snapshot timer, 2 "just pulled" timer
      name: "ACID", passive: "Backup",
      passiveDesc: "Snapshots your HP every 20 s.",
      combo: "SELECT pulls them in → Table Lock → full-charge table slam.",
      init(s, i) { const f = s.f[i]; f.res[0] = f.hp; f.res[1] = sec(20); },
      tick(s, i) {
        const f = s.f[i];
        if (--f.res[1] <= 0) { f.res[0] = f.hp; f.res[1] = sec(20); }
        if (f.res[2] > 0) f.res[2]--;
      },
      skills: [
        { name: "SELECT * FROM", cost: 2500, cd: sec(10), desc: "Query beam pulls them to you.",
          cast(s, i) {
            const f = s.f[i], t = opp(i), T = s.f[t];
            spawn(s, { k: K.DELAYED, b: "fx.beam", o: i, x: f.x + f.facing * px(70), y: f.y - px(14), w: 140, h: 6, life: 10 });
            const ahead = (T.x - f.x) * f.facing;
            if (ahead > 0 && ahead <= px(140) && abs(T.y - f.y) < px(40) && T.iframes === 0 && T.st[S.INVULN] === 0) {
              T.x = clamp(f.x + f.facing * px(24), px(WALL_L + 10), px(WALL_R - 10));
              stun(s, t, 18);
              f.res[2] = 60;
            }
            return true;
          } },
        { name: "Table Lock", cost: 3000, cd: sec(15), desc: "Lock them 1 s, or 1.5 s right after a pull.",
          cast(s, i) {
            const f = s.f[i], t = opp(i);
            spawn(s, { k: K.DELAYED, b: "fx.ring", o: i, x: s.f[t].x, y: s.f[t].y, w: 30, h: 40, life: 12 });
            if (dxPx(f, s.f[t]) <= 60 && abs(s.f[t].y - f.y) < px(40)) stun(s, t, f.res[2] > 0 ? 90 : 60);
            return true;
          } },
        { name: "ROLLBACK", cost: 3500, cd: sec(22), desc: "Restore HP to the snapshot, up to +150.",
          cast(s, i, pow) {
            const f = s.f[i];
            if (f.res[0] > f.hp) f.hp = Math.min(f.res[0], f.hp + pm(150, pow));
            return true;
          } },
      ],
    },
    {
      // res: 0 Indexed stacks, 1 time since hit, 2 weaponless timer, 3 slam pending, 4 airborne seen
      name: "Destructive Queries", passive: "Indexed",
      passiveDesc: "Each hit: −10 % charge time (max −40 %). Resets after 4 s without a hit.",
      combo: "JOIN → quick hits stack Indexed → DROP TABLE finisher.",
      tick(s, i) {
        const f = s.f[i];
        if (f.res[1] > 0) f.res[1]--; else f.res[0] = 0;
        if (f.res[2] > 0) f.res[2]--;
        if (f.res[3]) {
          if (!f.onGround) f.res[4] = 1;
          else if (f.res[4]) {
            f.res[3] = 0; f.res[4] = 0; f.res[2] = sec(4);
            const t = opp(i), T = s.f[t];
            spawn(s, { k: K.DELAYED, b: "fx.boom", o: i, x: f.x, y: f.y, w: 140, h: 40, life: 14 });
            if (dxPx(f, T) <= 70 && abs(T.y - f.y) < px(50)) {
              dealDamage(s, i, t, pm(150, f.res[5] || 1000), { kind: "skill", melee: true, hitstun: 30, kbx: (T.x >= f.x ? 1 : -1) * px(5), kby: -px(3) });
            }
            for (const e of s.ents) if (e.o === t && e.k !== K.PROJ && abs(e.x - f.x) <= px(90)) kill(e);
          }
        }
      },
      onDealt(s, i, _t, dmg, h) { if (h.kind === "basic" && dmg > 0) { const f = s.f[i]; f.res[0] = Math.min(4, f.res[0] + 1); f.res[1] = sec(4); } },
      chargeMul(s, i) { return 1000 - s.f[i].res[0] * 100; },
      modOut(s, i, _t, h) { return h.kind === "basic" && s.f[i].res[2] > 0 ? 400 : 1000; },
      skills: [
        { name: "JOIN", cost: 2500, cd: sec(12), desc: "Link 4 s: 40 % of damage either takes is mirrored.",
          cast(s, i) { s.f[i].st[S.JOIN] = sec(4); return true; } },
        { name: "DROP TABLE", cost: 4500, cd: sec(24), desc: "Leap and slam: 150 AoE, wrecks summons. Table gone 4 s.",
          cast(s, i, pow) {
            const f = s.f[i];
            f.vy = JUMP_V; f.onGround = 0; f.res[3] = 1; f.res[4] = 0; f.res[5] = pow;
            f.st[S.CAST] = 0;
            return true;
          } },
      ],
    },
  ],
});

registerBeh("fx.beam", (_s, e) => --e.life > 0);
registerBeh("fx.ring", (_s, e) => --e.life > 0);
registerBeh("fx.boom", (_s, e) => --e.life > 0);
