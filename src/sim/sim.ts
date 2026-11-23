// Deterministic fight simulation. Rules:
//  - integers only (no floats, no Math.sin/cos/pow, no Date, no Math.random)
//  - step() depends only on (state, inputs)
//  - the whole state is plain data so it can be cloned and checksummed every frame
import * as C from "./constants";
import { IN_ATTACK, IN_DASH, IN_DOWN, IN_LEFT, IN_RIGHT, IN_UP, type Input } from "./input";

export interface Fighter {
  x: number; y: number; vx: number; vy: number;
  onGround: number; jumpsLeft: number; facing: number;
  hp: number; mot: number; motIdle: number; burnout: number;
  charging: number; charge: number;
  atk: number; atkCharge: number; atkHit: number; recovery: number;
  hitstun: number; dash: number; dashDir: number; dashCd: number; iframes: number;
  dropThrough: number; prevInput: number; flash: number; lastDmg: number;
}

export const PHASE_FIGHT = 0;
export const PHASE_ROUND_END = 1;
export const PHASE_MATCH_END = 2;

export interface State {
  frame: number;
  phase: number;
  phaseT: number;
  timer: number;
  round: number;
  wins: [number, number];
  roundWinner: number; // -1 none, 0/1 player, 2 double KO, 3 time-out draw
  matchWinner: number;
  f: [Fighter, Fighter];
}

function newFighter(i: 0 | 1): Fighter {
  return {
    x: C.START_X[i] * C.SUB, y: C.FLOOR_Y * C.SUB, vx: 0, vy: 0,
    onGround: 1, jumpsLeft: 1, facing: i === 0 ? 1 : -1,
    hp: C.HP_MAX, mot: C.MOT_MAX, motIdle: 0, burnout: 0,
    charging: 0, charge: 0,
    atk: 0, atkCharge: 0, atkHit: 0, recovery: 0,
    hitstun: 0, dash: 0, dashDir: 1, dashCd: 0, iframes: 0,
    dropThrough: 0, prevInput: 0, flash: 0, lastDmg: 0,
  };
}

export function initState(): State {
  return {
    frame: 0, phase: PHASE_FIGHT, phaseT: 0, timer: C.ROUND_FRAMES, round: 1,
    wins: [0, 0], roundWinner: -1, matchWinner: -1,
    f: [newFighter(0), newFighter(1)],
  };
}

function cloneFighter(a: Fighter): Fighter {
  return { ...a };
}

export function cloneState(s: State): State {
  return {
    frame: s.frame, phase: s.phase, phaseT: s.phaseT, timer: s.timer, round: s.round,
    wins: [s.wins[0], s.wins[1]], roundWinner: s.roundWinner, matchWinner: s.matchWinner,
    f: [cloneFighter(s.f[0]), cloneFighter(s.f[1])],
  };
}

const FIGHTER_KEYS: (keyof Fighter)[] = [
  "x", "y", "vx", "vy", "onGround", "jumpsLeft", "facing", "hp", "mot", "motIdle", "burnout",
  "charging", "charge", "atk", "atkCharge", "atkHit", "recovery", "hitstun", "dash", "dashDir",
  "dashCd", "iframes", "dropThrough", "prevInput", "flash", "lastDmg",
];

/** FNV-1a over every field, in a fixed order. Both peers must get the same number. */
export function checksum(s: State): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    let x = v | 0;
    for (let k = 0; k < 4; k++) { h ^= x & 0xff; h = Math.imul(h, 0x01000193); x >>>= 8; }
  };
  mix(s.frame); mix(s.phase); mix(s.phaseT); mix(s.timer); mix(s.round);
  mix(s.wins[0]); mix(s.wins[1]); mix(s.roundWinner); mix(s.matchWinner);
  for (const f of s.f) for (const k of FIGHTER_KEYS) mix(f[k]);
  return h >>> 0;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const min = (a: number, b: number) => (a < b ? a : b);
const ratio48 = (c: number, scale: number) => Math.trunc((scale * min(c, C.CHARGE_FULL)) / C.CHARGE_FULL);

export function attackDamage(charge: number): number {
  if (charge < C.TAP_MAX) return C.DMG_TAP;
  return C.DMG_TAP + ratio48(charge, C.DMG_FULL - C.DMG_TAP);
}
export function isFullCharge(charge: number): boolean {
  return charge >= C.CHARGE_FULL;
}

function spend(f: Fighter, cost: number): boolean {
  if (f.burnout > 0) return false;
  f.mot -= cost;
  f.motIdle = 0;
  if (f.mot <= 0) { // Crunch: the action still happens, then you burn out
    f.mot = 0;
    f.burnout = C.BURNOUT_FRAMES;
    f.charging = 0; f.charge = 0;
  }
  return true;
}

function stepFighter(f: Fighter, other: Fighter, inp: Input) {
  const pressed = inp & ~f.prevInput;
  if (f.iframes > 0) f.iframes--;
  if (f.dashCd > 0) f.dashCd--;
  if (f.dropThrough > 0) f.dropThrough--;
  if (f.flash > 0) f.flash--;

  if (f.burnout > 0) {
    f.burnout--;
    if (f.burnout === 0) { f.mot = C.BURNOUT_RECOVER; f.motIdle = 0; }
  } else {
    f.motIdle++;
    if (f.motIdle > C.MOT_REGEN_DELAY) f.mot = min(C.MOT_MAX, f.mot + C.MOT_REGEN);
  }

  if (f.atk === 0 && f.dash === 0 && f.hitstun === 0) f.facing = other.x >= f.x ? 1 : -1;

  if (f.hitstun > 0) {
    f.hitstun--;
    if (f.onGround) f.vx = Math.trunc((f.vx * 7) / 8);
  } else if (f.dash > 0) {
    f.dash--;
    f.vx = f.dashDir * C.DASH_SPEED;
    f.vy = 0;
  } else if (f.atk > 0) {
    f.atk++;
    if (f.onGround) f.vx = 0;
    if (f.atk > C.ATK_STARTUP + C.ATK_ACTIVE) {
      f.atk = 0;
      f.recovery = C.REC_TAP - ratio48(f.atkCharge, C.REC_TAP - C.REC_FULL);
    }
  } else if (f.recovery > 0) {
    f.recovery--;
    if (f.onGround) f.vx = 0;
  } else {
    if (f.burnout === 0) {
      if ((pressed & IN_ATTACK) && !f.charging) { f.charging = 1; f.charge = 0; }
      if (f.charging) {
        f.charge++;
        if (!(inp & IN_ATTACK) || f.charge >= C.CHARGE_MAX) {
          f.atk = 1; f.atkCharge = f.charge; f.atkHit = 0; f.charging = 0; f.charge = 0;
        }
      }
      if ((pressed & IN_DASH) && f.dashCd === 0 && !f.charging && f.atk === 0) {
        if (spend(f, C.DASH_COST)) {
          f.dash = C.DASH_FRAMES;
          f.dashDir = inp & IN_LEFT ? -1 : inp & IN_RIGHT ? 1 : f.facing;
          f.iframes = C.DASH_IFRAMES;
          f.dashCd = C.DASH_CD;
        }
      }
    } else {
      f.charging = 0; f.charge = 0;
    }
    if (f.dash === 0 && f.atk === 0) {
      const dir = (inp & IN_RIGHT ? 1 : 0) - (inp & IN_LEFT ? 1 : 0);
      let speed = f.charging ? C.CHARGE_WALK : C.WALK;
      if (f.burnout > 0) speed = Math.trunc(speed / 2);
      f.vx = dir * speed;
      if (pressed & IN_UP) { // jumping is still allowed during Burnout
        if (f.onGround) { f.vy = C.JUMP_V; f.onGround = 0; f.jumpsLeft = 1; }
        else if (f.jumpsLeft > 0) { f.vy = C.DJUMP_V; f.jumpsLeft = 0; }
      }
      if ((pressed & IN_DOWN) && f.onGround && f.y < C.FLOOR_Y * C.SUB) {
        f.dropThrough = C.DROP_FRAMES; f.onGround = 0;
      }
    }
  }

  // physics
  if (f.dash === 0) f.vy = min(C.MAX_FALL, f.vy + C.GRAVITY);
  const prevY = f.y;
  f.x += f.vx;
  f.y += f.vy;
  const half = (C.BODY_W / 2) * C.SUB;
  f.x = clamp(f.x, C.WALL_L * C.SUB + half, C.WALL_R * C.SUB - half);
  f.onGround = 0;
  if (f.vy >= 0) {
    if (f.y >= C.FLOOR_Y * C.SUB) {
      f.y = C.FLOOR_Y * C.SUB; f.vy = 0; f.onGround = 1; f.jumpsLeft = 1;
    } else if (f.dropThrough === 0) {
      for (const p of C.PLATFORMS) {
        const py = p.y * C.SUB;
        if (f.x >= p.x1 * C.SUB && f.x <= p.x2 * C.SUB && prevY <= py && f.y >= py) {
          f.y = py; f.vy = 0; f.onGround = 1; f.jumpsLeft = 1;
          break;
        }
      }
    }
  }
  f.prevInput = inp;
}

interface Hit { attacker: 0 | 1; dmg: number; full: boolean }

function findHit(a: Fighter, d: Fighter): boolean {
  if (a.atk <= C.ATK_STARTUP || a.atk > C.ATK_STARTUP + C.ATK_ACTIVE || a.atkHit) return false;
  if (d.iframes > 0) return false;
  const S = C.SUB;
  const hx1 = a.facing > 0 ? a.x + 6 * S : a.x - (6 + C.HITBOX_REACH) * S;
  const hx2 = hx1 + C.HITBOX_REACH * S;
  const hy1 = a.y - 30 * S, hy2 = a.y - 10 * S;
  const dx1 = d.x - (C.BODY_W / 2) * S, dx2 = d.x + (C.BODY_W / 2) * S;
  const dy1 = d.y - C.BODY_H * S, dy2 = d.y;
  return hx1 < dx2 && hx2 > dx1 && hy1 < dy2 && hy2 > dy1;
}

function applyHit(s: State, h: Hit) {
  const a = s.f[h.attacker], d = s.f[1 - h.attacker];
  a.atkHit = 1;
  a.mot = min(C.MOT_MAX, a.mot + C.MOT_ON_HIT);
  d.hp = Math.max(0, d.hp - h.dmg);
  d.lastDmg = h.dmg;
  d.mot = min(C.MOT_MAX, d.mot + C.MOT_ON_HURT);
  d.hitstun = C.HITSTUN_TAP + ratio48(a.atkCharge, C.HITSTUN_FULL - C.HITSTUN_TAP);
  const kb = Math.trunc((C.SUB * 3) / 2) + ratio48(a.atkCharge, Math.trunc((C.SUB * 7) / 2));
  d.vx = a.facing * kb;
  if (h.full) { d.vy = -3 * C.SUB; d.onGround = 0; }
  d.charging = 0; d.charge = 0; d.atk = 0; d.recovery = 0; d.dash = 0;
  d.flash = 6;
}

function pushApart(s: State) {
  const [a, b] = s.f;
  const S = C.SUB, w = C.BODY_W * S;
  const overlapY = a.y - C.BODY_H * S < b.y && b.y - C.BODY_H * S < a.y;
  const dx = b.x - a.x;
  const adx = dx < 0 ? -dx : dx;
  if (!overlapY || adx >= w || a.dash > 0 || b.dash > 0) return;
  const push = Math.trunc((w - adx) / 2) + 1;
  const dir = dx > 0 ? 1 : dx < 0 ? -1 : a.facing > 0 ? 1 : -1;
  const half = (C.BODY_W / 2) * S, lo = C.WALL_L * S + half, hi = C.WALL_R * S - half;
  a.x = clamp(a.x - dir * push, lo, hi);
  b.x = clamp(b.x + dir * push, lo, hi);
}

function resetRound(s: State) {
  const wins = s.wins;
  s.f = [newFighter(0), newFighter(1)];
  s.timer = C.ROUND_FRAMES;
  s.phase = PHASE_FIGHT;
  s.phaseT = 0;
  s.roundWinner = -1;
  s.wins = wins;
}

/** Advance one frame. `inputs[0]` is player 1, `inputs[1]` is player 2. */
export function step(s: State, inputs: readonly [Input, Input]) {
  s.frame++;
  if (s.phase !== PHASE_FIGHT) {
    for (let i = 0; i < 2; i++) { const f = s.f[i]; f.prevInput = inputs[i]; if (f.flash > 0) f.flash--; }
    s.phaseT--;
    if (s.phaseT <= 0) {
      if (s.phase === PHASE_ROUND_END) {
        if (s.wins[0] >= C.ROUNDS_TO_WIN || s.wins[1] >= C.ROUNDS_TO_WIN) {
          s.phase = PHASE_MATCH_END; s.phaseT = C.MATCH_PAUSE;
          s.matchWinner = s.wins[0] === s.wins[1] ? 2 : s.wins[0] > s.wins[1] ? 0 : 1;
        } else {
          s.round++;
          resetRound(s);
        }
      } else {
        s.wins = [0, 0]; s.round = 1; s.matchWinner = -1;
        resetRound(s);
      }
    }
    return;
  }

  stepFighter(s.f[0], s.f[1], inputs[0]);
  stepFighter(s.f[1], s.f[0], inputs[1]);

  // resolve both hits before applying either, so trades are fair to both sides
  const hits: Hit[] = [];
  for (const i of [0, 1] as const) {
    const a = s.f[i], d = s.f[1 - i];
    if (findHit(a, d)) hits.push({ attacker: i, dmg: attackDamage(a.atkCharge), full: isFullCharge(a.atkCharge) });
  }
  for (const h of hits) applyHit(s, h);
  pushApart(s);

  s.timer--;
  const ko0 = s.f[0].hp <= 0, ko1 = s.f[1].hp <= 0;
  if (ko0 || ko1 || s.timer <= 0) {
    let w = -1;
    if (ko0 && ko1) w = 2;
    else if (ko1) w = 0;
    else if (ko0) w = 1;
    else w = s.f[0].hp === s.f[1].hp ? 3 : s.f[0].hp > s.f[1].hp ? 0 : 1;
    if (w === 0 || w === 2) s.wins[0]++;
    if (w === 1 || w === 2) s.wins[1]++;
    s.roundWinner = w;
    s.phase = PHASE_ROUND_END;
    s.phaseT = C.ROUND_PAUSE;
  }
}
