// Technical Support — "Customers and tickets". Summoner/pressure. GDD §3.9.
import { sec, WALL_L, WALL_R } from "../constants";
import { addMot, dealDamage, entBox, fighterBox, kill, opp, overlap, ownEnts, pm, projStep, px, spawn, stun, walkerStep } from "../core";
import { registerBeh, registerJob } from "../registry";
import { K, S, type Entity, type State } from "../types";

function summonCustomer(s: State, i: number, pow: number): Entity {
  const f = s.f[i];
  const mine = ownEnts(s, i, "ts.customer");
  if (mine.length >= 2) kill(mine[0]);
  return spawn(s, { k: K.SUMMON, b: "ts.customer", o: i, x: f.x + f.facing * px(16), y: f.y, w: 14, h: 26, hp: 100, life: sec(8), p1: pow });
}
function escalate(e: Entity) { e.b = "ts.manager"; e.hp = 250; e.w = 18; e.h = 34; e.life = sec(10); e.p2 = 30; }

registerJob({
  idx: 8, id: "ts", name: "Technical Support", color: 0xf2d21b,
  walk: 512, jumps: 2, chargeFull: 48, tap: 20, full: 65, reach: 20, weight: 3,
  ranged: { speed: px(5), life: 36 },
  sets: [
    {
      // res: 0 CSAT stars, 1 free escalation ready, 2 refund cost of this cast
      name: "Escalation", passive: "CSAT Score",
      passiveDesc: "Customer hits add a ★. At 5★ your next summon is free and already escalated.",
      combo: "Customers pressure → 5★ → a free Manager. Barrage covers your approach.",
      afterCast(s, i, k) { const f = s.f[i]; if (f.res[2]) { addMot(f, f.res[2]); f.res[2] = 0; } void k; },
      skills: [
        { name: "Angry Customer", cost: 3000, cd: sec(12), desc: "Chaser (100 HP, 8 s), 20 per shove. Max 2.",
          cast(s, i, pow) {
            const f = s.f[i];
            const e = summonCustomer(s, i, pow);
            if (f.res[1]) { f.res[1] = 0; f.res[0] = 0; escalate(e); f.res[2] = 3000; }
            return true;
          } },
        { name: "Escalate to Manager", cost: 3500, cd: sec(20), desc: "Turn a customer into a Manager (250 HP, 60-dmg slam, stun).",
          cast(s, i, pow) {
            const f = s.f[i];
            const c = ownEnts(s, i, "ts.customer")[0];
            if (c) escalate(c); else { const e = summonCustomer(s, i, pow); if (f.res[1]) { f.res[1] = 0; f.res[0] = 0; escalate(e); f.res[2] = 3500; } }
            return true;
          } },
        { name: "Ticket Barrage", cost: 1500, cd: sec(5), desc: "3 tickets in a fan, 20 each.",
          cast(s, i, pow) {
            const f = s.f[i];
            for (const vy of [-px(1) / 2, 0, px(1) / 2]) {
              spawn(s, { k: K.PROJ, b: "ts.ticket", o: i, x: f.x + f.facing * px(12), y: f.y - px(20), vx: f.facing * px(5), vy, w: 8, h: 6, life: 50, dmg: pm(20, pow) });
            }
            return true;
          } },
      ],
    },
    {
      // res: 0 "off and on again" cooldown
      name: "Help Desk", passive: "Turn It Off and On Again",
      passiveDesc: "Once every 25 s, a CC on you is cleansed after 0.3 s.",
      combo: "Put them on Hold → they can't afford skills → Mob forces guard and dash → Burnout.",
      tick(s, i) { if (s.f[i].res[0] > 0) s.f[i].res[0]--; },
      onCC(s, i, frames) { const f = s.f[i]; if (f.res[0] === 0 && frames > 18) { f.res[0] = sec(25); return 18; } return frames; },
      skills: [
        { name: "Put on Hold", cost: 2500, cd: sec(10), desc: "3 s: no Motivation regen for them, their skills cost +10.",
          cast(s, i) { s.f[opp(i)].st[S.HOLD] = sec(3); return true; } },
        { name: "Mass Ticket", cost: 3500, cd: sec(16), desc: "6 tickets rain on them over 2 s, 20 each.",
          cast(s, i, pow) {
            const T = s.f[opp(i)];
            for (let k = 0; k < 6; k++) {
              const x = Math.max(px(WALL_L + 8), Math.min(px(WALL_R - 8), T.x + (k - 2) * px(14) - px(7)));
              spawn(s, { k: K.PROJ, b: "ts.drop", o: i, x, y: -px(10 + k * 24), vx: 0, vy: px(5), w: 8, h: 8, life: 120, dmg: pm(20, pow) });
            }
            return true;
          } },
        { name: "Customer Mob", cost: 4000, cd: sec(20), desc: "3 customers stampede across, 30 each. Jump them.",
          cast(s, i, pow) {
            const f = s.f[i];
            for (let k = 0; k < 3; k++) {
              spawn(s, { k: K.SUMMON, b: "ts.mob", o: i, x: f.x - f.facing * px(10 + k * 18), y: f.y, vx: f.facing * px(3), w: 12, h: 22, hp: 40, life: sec(3), dmg: pm(30, pow) });
            }
            return true;
          } },
      ],
    },
  ],
});

registerBeh("ts.customer", (s, e) => walkerStep(s, e, 307, (s, e, t) => {
  const d = dealDamage(s, e.o, t, pm(20, e.p1), { kind: "summon", melee: true, hitstun: 12, kbx: e.p3 * px(2) });
  const f = s.f[e.o];
  if (d > 0 && f.set === 0) { f.res[0] = Math.min(5, f.res[0] + 1); if (f.res[0] >= 5) f.res[1] = 1; }
}));
registerBeh("ts.manager", (s, e) => walkerStep(s, e, 256, (s, e, t) => {
  const d = dealDamage(s, e.o, t, pm(60, e.p1 || 1000), { kind: "summon", melee: true, hitstun: 20, kbx: e.p3 * px(3), kby: -px(2) });
  if (d > 0) stun(s, t, 48);
}, 22, 90));
registerBeh("ts.ticket", (s, e) => projStep(s, e));
registerBeh("ts.drop", (s, e) => {
  if (e.y > px(184)) return false;
  return projStep(s, e, undefined, { kind: "skill", proj: true, hitstun: 8 });
});
registerBeh("ts.mob", (s, e) => {
  e.x += e.vx; e.t++;
  if (--e.life <= 0 || e.x < px(WALL_L) || e.x > px(WALL_R) || e.hp <= 0) return false;
  const t = opp(e.o);
  if (e.p2 === 0 && overlap(entBox(e), fighterBox(s.f[t]))) {
    dealDamage(s, e.o, t, e.dmg, { kind: "summon", melee: true, hitstun: 14, kbx: (e.vx > 0 ? 1 : -1) * px(3) });
    e.p2 = 1;
  }
  return true;
});
