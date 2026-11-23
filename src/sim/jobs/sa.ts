// System Analyst — "Designs the battlefield". Area control. GDD §3.4.
import { sec, WALL_L, WALL_R } from "../constants";
import { targetX, clamp, dealDamage, dxPx, entBox, fighterBox, kill, opp, overlap, ownEnts, pm, px, segDistPx, slow, spawn, stun } from "../core";
import { JOBS, registerBeh, registerJob } from "../registry";
import { K, S, type State } from "../types";

function dropNode(s: State, i: number) {
  const f = s.f[i], nodes = ownEnts(s, i, "sa.node");
  if (nodes.length >= 3) kill(nodes[0]);
  spawn(s, { k: K.ZONE, b: "sa.node", o: i, x: f.x, y: f.y - px(14), w: 6, h: 6, life: sec(20) });
}

registerJob({
  idx: 3, id: "sa", name: "System Analyst", color: 0x2a5fa3,
  walk: 512, jumps: 1, chargeFull: 60, tap: 25, full: 80, reach: 40, weight: 3,
  sets: [
    {
      // res: 0 line-hit cooldown
      name: "Flowchart", passive: "Decision Node",
      passiveDesc: "Every skill drops a ◇ node (max 3). Nodes connect; crossing a line: 20 dmg + slow.",
      combo: "Triangle of nodes → Swimlane cuts the exit → zip node to node through them.",
      afterCast(s, i) { dropNode(s, i); },
      tick(s, i) {
        const f = s.f[i];
        if (f.res[0] > 0) { f.res[0]--; return; }
        const nodes = ownEnts(s, i, "sa.node");
        const t = opp(i), T = s.f[t];
        for (let k = 1; k < nodes.length; k++) {
          if (segDistPx(T, nodes[k - 1].x, nodes[k - 1].y, nodes[k].x, nodes[k].y) <= 8) {
            dealDamage(s, i, t, 20, { kind: "skill", hitstun: 6 }); slow(s, t, 25, 40); f.res[0] = 45; break;
          }
        }
      },
      skills: [
        { name: "Arrow Connector", cost: 2000, cd: sec(6), desc: "Zip to your newest node, 55 dmg along the path.",
          cast(s, i, pow) {
            const f = s.f[i], nodes = ownEnts(s, i, "sa.node");
            const target = nodes[nodes.length - 1];
            const tx = target ? target.x : clamp(f.x + f.facing * px(80), px(WALL_L + 12), px(WALL_R - 12));
            const ty = target ? target.y + px(14) : f.y;
            const t = opp(i), T = s.f[t];
            const lo = Math.min(f.x, tx), hi = Math.max(f.x, tx);
            if (T.x >= lo - px(10) && T.x <= hi + px(10) && segDistPx(T, f.x, f.y - px(16), tx, ty - px(16)) <= 20) {
              dealDamage(s, i, t, pm(55, pow), { kind: "skill", melee: true, hitstun: 14, kbx: (tx > f.x ? 1 : -1) * px(2) });
            }
            spawn(s, { k: K.DELAYED, b: "fx.line", o: i, x: (f.x + tx) >> 1, y: Math.min(f.y, ty), w: Math.trunc(Math.abs(tx - f.x) / 256) + 4, h: 4, life: 10 });
            f.x = tx; f.y = ty; f.vx = 0; f.vy = 0;
            return true;
          } },
        { name: "Swimlane", cost: 3000, cd: sec(14), desc: "A wall for 5 s that blocks movement and shots; 0.3 s stun on spawn.",
          cast(s, i) {
            const f = s.f[i], x = clamp(f.x + f.facing * px(36), px(WALL_L + 6), px(WALL_R - 6));
            const w = spawn(s, { k: K.WALL, b: "sa.lane", o: i, x, y: f.y, w: 8, h: 60, hp: 400, life: sec(5) });
            if (overlap(entBox(w), fighterBox(s.f[opp(i)]))) stun(s, opp(i), 18);
            return true;
          } },
      ],
    },
    {
      // res: 0 insight bitmask (skill indexes that hit you), 1 gap baseline px, 2 gap timer
      name: "Requirements Gathering", passive: "Stakeholder Interview",
      passiveDesc: "Each different skill that hits you gives Insight (max 3): +8 % damage each.",
      combo: "Swap them into the corner → UML Box → Gap Analysis punishes the escape.",
      onTaken(s, i, a, dmg, h) {
        if (a < 0 || dmg <= 0 || h.kind !== "skill") return;
        const k = s.f[a].st[S.LAST_SKILL] - 1;
        if (k >= 0) s.f[i].res[0] |= 1 << k;
      },
      modOut(s, i) { const m = s.f[i].res[0]; const n = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1); return 1000 + n * 80; },
      tick(s, i) {
        const f = s.f[i];
        if (f.res[2] > 0) {
          f.res[2]--;
          const t = opp(i);
          if (dxPx(f, s.f[t]) > f.res[1] + 30) { dealDamage(s, i, t, f.res[3] || 70, { kind: "skill", noGuard: true, hitstun: 10 }); f.res[2] = 0; }
        }
      },
      skills: [
        { name: "Change Request", cost: 2000, cd: sec(12), desc: "Swap positions with them.",
          cast(s, i) {
            const f = s.f[i], T = s.f[opp(i)];
            if (T.st[S.INVULN] > 0) return false;
            const x = f.x, y = f.y; f.x = T.x; f.y = T.y; T.x = x; T.y = y;
            f.vx = f.vy = T.vx = T.vy = 0;
            return true;
          } },
        { name: "UML Box", aim: true, cost: 3000, cd: sec(15), desc: "A class box around them. Still inside after 1 s: stunned 1 s.",
          cast(s, i) { const T = s.f[opp(i)]; spawn(s, { k: K.DELAYED, b: "sa.uml", o: i, x: targetX(s, i), y: T.y + px(4), w: 44, h: 48, life: 64 }); return true; } },
        { name: "Gap Analysis", cost: 2500, cd: sec(10), desc: "Measure the gap. If they back off within 4 s: 70 dmg.",
          cast(s, i, pow) { const f = s.f[i]; f.res[1] = dxPx(f, s.f[opp(i)]); f.res[2] = sec(4); f.res[3] = pm(70, pow); return true; } },
      ],
    },
  ],
});

registerBeh("sa.node", (_s, e) => --e.life > 0);
registerBeh("sa.lane", (_s, e) => --e.life > 0 && e.hp > 0);
registerBeh("fx.line", (_s, e) => --e.life > 0);
registerBeh("sa.uml", (s, e) => {
  e.t++;
  if (e.t === 60) { const t = opp(e.o); if (overlap(entBox(e), fighterBox(s.f[t]))) stun(s, t, sec(1)); }
  void JOBS;
  return --e.life > 0;
});
