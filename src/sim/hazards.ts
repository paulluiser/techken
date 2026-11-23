// Arena hazards (GDD section 5). Deterministic: timers live in state.hz, randomness in state.rng.
// Hazard entities are owned by ENV (2) and hit both fighters.
import * as C from "./constants";
import { ARENAS } from "./arenas";
import { abs, buff, dealDamage, entBox, fighterBox, overlap, px, rndInt, slow, spawn, spendMot } from "./core";
import { ITEMS } from "./items";
import { BEH } from "./registry";
import { ENV, K, type Entity, type State } from "./types";

const arenaId = (s: State) => ARENAS[s.cfg.arena].id;

/** Team-Building Retreat: the trust-fall platform (index 1) drops for 3 s. */
export function hazardPlatformOff(s: State, n: number): boolean {
  return s.cfg.hazards && n === 1 && arenaId(s) === "retreat" && s.hz[3] > 0;
}
/** Coffee Shop: Wi-Fi drops (Network Admin's Access Point turns off). */
export function wifiDown(s: State): boolean {
  return s.cfg.hazards && arenaId(s) === "coffee" && s.hz[1] > 0;
}

function dropItem(s: State) {
  if (!s.cfg.items || s.ot || s.tiebreak) return;
  const sp = ARENAS[s.cfg.arena].spawns;
  const [x, y] = sp[rndInt(s, sp.length)];
  s.items.push({ id: s.nextId++, kind: rndInt(s, ITEMS.length), x: px(x), y: px(y), life: C.ITEM_LIFE });
}

function hitBoth(s: State, e: Entity, dmg: number, kbx: number) {
  for (const t of [0, 1]) {
    if ((e.hits >> t) & 1) continue;
    if (overlap(entBox(e), fighterBox(s.f[t]))) {
      dealDamage(s, -1, t, dmg, { kind: "env", hitstun: 10, kbx });
      e.hits |= 1 << t;
    }
  }
}

export function stepHazards(s: State) {
  const h = s.hz;
  h[0]++;
  const t = h[0];
  const floor = px(ARENAS[s.cfg.arena].floor);
  switch (arenaId(s)) {
    case "office": // printer jam every 30 s sprays paper across the room
      if (t % C.sec(30) === 0) for (let k = 0; k < 5; k++) {
        spawn(s, { k: K.PROJ, b: "hz.paper", o: ENV, x: px(14), y: floor - px(10 + k * 18) - px(rndInt(s, 6)), vx: px(4) - k * 40, w: 8, h: 6, life: 120, dmg: 15 });
      }
      break;
    case "servers": // power outage (visual) every 40 s for 4 s; hot-aisle vent launches you up
      if (t % C.sec(40) === 0) h[1] = C.sec(4);
      if (h[1] > 0) h[1]--;
      h[2] = t % C.sec(6) < C.sec(1) ? 1 : 0;
      if (h[2]) for (const f of s.f) if (f.onGround && f.y === floor && abs(f.x - px(192)) < px(16)) { f.vy = -px(8); f.onGround = 0; }
      break;
    case "garage": // Funding Round: 3 items at once every 45 s
      if (t % C.sec(45) === 0) for (let k = 0; k < 3; k++) dropItem(s);
      break;
    case "cloud": // wind gust every 20 s for 3 s, alternating direction
      if (t % C.sec(20) === 0) { h[1] = C.sec(3); h[2] = h[2] === 1 ? -1 : 1; }
      if (h[1] > 0) { h[1]--; for (const f of s.f) f.x = Math.max(px(C.WALL_L + 10), Math.min(px(C.WALL_R - 10), f.x + h[2] * 192)); }
      break;
    case "basement": // spaghetti cables slow movement
      for (let i = 0; i < 2; i++) {
        const f = s.f[i];
        if (f.onGround && f.y === floor && ((f.x > px(64) && f.x < px(128)) || (f.x > px(256) && f.x < px(320)))) slow(s, i, 30, 2);
      }
      break;
    case "expo": { // a wandering spotlight: +15 % damage inside
      const p = t % 600, x = 40 + Math.trunc((p < 300 ? p : 600 - p) * 304 / 300);
      h[1] = x;
      for (const f of s.f) if (abs(f.x - px(x)) < px(25)) buff(f, "dmg", 150, 2);
      break;
    }
    case "coffee": // Wi-Fi drops every 30 s for 5 s
      if (t % C.sec(30) === 0) h[1] = C.sec(5);
      if (h[1] > 0) h[1]--;
      break;
    case "warroom": // "Prod is down": both lose 15 Motivation every 30 s
      if (t % C.sec(30) === 0) { h[1] = 90; for (const f of s.f) if (f.burnout === 0) { f.mot -= 1500; if (f.mot <= 0) { f.mot = 0; spendMot(f, 0); } } }
      if (h[1] > 0) h[1]--;
      break;
    case "home": // the cat walks across (blocks one attack); the doorbell drops an item
      if (t % C.sec(25) === 0) spawn(s, { k: K.SUMMON, b: "hz.cat", o: ENV, x: px(12), y: floor, vx: px(1), w: 16, h: 10, hp: 1, life: C.sec(7) });
      if (t % C.sec(35) === 0) dropItem(s);
      break;
    case "retreat": { // campfire 10 dmg/s; trust-fall platform drops after 1 s
      for (let i = 0; i < 2; i++) {
        const f = s.f[i];
        if (f.y >= floor - px(4) && abs(f.x - px(318)) < px(14) && t % 6 === 0) dealDamage(s, -1, i, 1, { kind: "dot" });
      }
      const p = ARENAS[s.cfg.arena].platforms[1];
      const on = s.f.some((f) => f.onGround && f.y === px(p.y) && f.x >= px(p.x1) && f.x <= px(p.x2));
      if (h[3] > 0) h[3]--;
      else if (on) { if (++h[2] >= 60) { h[2] = 0; h[3] = C.sec(3); } }
      else h[2] = 0;
      break;
    }
    case "rooftop": // window-cleaning gondola every 15 s
      if (t % C.sec(15) === 0) spawn(s, { k: K.ZONE, b: "hz.gondola", o: ENV, x: px(0), y: px(120), vx: px(2), w: 40, h: 12, life: 200 });
      break;
  }
}

BEH["hz.paper"] = (s, e) => {
  e.x += e.vx;
  if (--e.life <= 0 || e.x > px(C.WALL_R)) return false;
  hitBoth(s, e, e.dmg, px(2));
  return e.hits !== 3;
};
BEH["hz.cat"] = (s, e) => {
  e.x += e.vx;
  if (--e.life <= 0 || e.hp <= 0 || e.x > px(C.WALL_R)) return false;
  // shots from either side end on the cat
  for (const p of s.ents) if (p.k === K.PROJ && p.o !== ENV && p.life > 0 && overlap(entBox(p), entBox(e))) { p.life = 0; e.hp = 0; }
  return e.hp > 0;
};
BEH["hz.gondola"] = (s, e) => {
  e.x += e.vx;
  if (--e.life <= 0 || e.x > px(C.W + 30)) return false;
  hitBoth(s, e, 20, px(3));
  return true;
};
