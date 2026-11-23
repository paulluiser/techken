// Deterministic fight simulation. Rules:
//  - integers only (no floats in state, no Math.sin/cos/pow, no Date, no Math.random)
//  - step() depends only on (state, inputs); randomness comes from state.rng
//  - the whole state is plain data so it can be cloned and checksummed every frame
import * as C from "./constants";
import "./jobs/all";
import { ARENAS } from "./arenas";
import {
  chargeFull, dealDamage, entBox, fighterBox, jobOf, max, min, motMax, overlap, pm, px, runBehavior,
  setOf, spendMot, stun,
} from "./core";
import { stepItems, throwInvite } from "./items";
import { hazardPlatformOff, stepHazards } from "./hazards";
import { IN_ATTACK, IN_DASH, IN_DOWN, IN_GUARD, IN_LEFT, IN_RIGHT, IN_SKILLS, IN_UP, type Input } from "./input";
import { BEH } from "./registry";
import { K, N_RES, N_ST, S, type Entity, type Fighter, type MatchConfig, type State } from "./types";

export type { State, Fighter, Entity, MatchConfig } from "./types";

export const PHASE_FIGHT = 0;
export const PHASE_ROUND_END = 1;
export const PHASE_MATCH_END = 2;

export const DEFAULT_CONFIG: MatchConfig = { jobs: [0, 0], sets: [0, 0], arena: 0, items: true, hazards: true, seed: 20261123 };

function newFighter(cfg: MatchConfig, i: 0 | 1): Fighter {
  const f: Fighter = {
    job: cfg.jobs[i], set: cfg.sets[i],
    x: C.START_X[i] * C.SUB, y: ARENAS[cfg.arena].floor * C.SUB, vx: 0, vy: 0,
    onGround: 1, jumpsLeft: 0, facing: i === 0 ? 1 : -1,
    hp: C.HP_MAX, mot: C.MOT_MAX, motIdle: 0, burnout: 0,
    charging: 0, charge: 0, guarding: 0,
    atk: 0, atkCharge: 0, atkHit: 0, recovery: 0,
    hitstun: 0, dash: 0, dashDir: 1, dashCd: 0, iframes: 0,
    dropThrough: 0, prevInput: 0, flash: 0, lastDmg: 0,
    cd: [0, 0, 0], cdPushed: [0, 0, 0], st: new Array(N_ST).fill(0), res: new Array(N_RES).fill(0),
  };
  f.jumpsLeft = jobOf(f).jumps - 1;
  return f;
}

function initFighters(s: State) {
  s.f = [newFighter(s.cfg, 0), newFighter(s.cfg, 1)];
  for (const i of [0, 1]) setOf(s.f[i]).init?.(s, i);
}

export function initState(cfg: MatchConfig = DEFAULT_CONFIG): State {
  const s: State = {
    frame: 0, phase: PHASE_FIGHT, phaseT: 0, timer: C.ROUND_FRAMES, round: 1,
    wins: [0, 0], roundWinner: -1, matchWinner: -1,
    cfg: { ...cfg, jobs: [cfg.jobs[0], cfg.jobs[1]], sets: [cfg.sets[0], cfg.sets[1]] },
    rng: (cfg.seed >>> 0) || 1, nextId: 1, itemT: C.ITEM_FIRST,
    f: [] as unknown as [Fighter, Fighter], ents: [], items: [],
    ot: 0, otHp: [0, 0], tiebreak: 0, hz: new Array(8).fill(0),
  };
  initFighters(s);
  return s;
}

const cloneF = (a: Fighter): Fighter => ({ ...a, cd: a.cd.slice(), cdPushed: a.cdPushed.slice(), st: a.st.slice(), res: a.res.slice() });

export function cloneState(s: State): State {
  return {
    ...s,
    wins: [s.wins[0], s.wins[1]],
    cfg: { ...s.cfg, jobs: [s.cfg.jobs[0], s.cfg.jobs[1]], sets: [s.cfg.sets[0], s.cfg.sets[1]] },
    f: [cloneF(s.f[0]), cloneF(s.f[1])],
    ents: s.ents.map((e) => ({ ...e })),
    items: s.items.map((it) => ({ ...it })),
    otHp: [s.otHp[0], s.otHp[1]],
    hz: s.hz.slice(),
  };
}

const FIGHTER_KEYS: (keyof Fighter)[] = [
  "job", "set", "x", "y", "vx", "vy", "onGround", "jumpsLeft", "facing", "hp", "mot", "motIdle", "burnout",
  "charging", "charge", "guarding", "atk", "atkCharge", "atkHit", "recovery", "hitstun", "dash", "dashDir",
  "dashCd", "iframes", "dropThrough", "prevInput", "flash", "lastDmg",
];
const ENT_KEYS: (keyof Entity)[] = ["id", "k", "o", "x", "y", "vx", "vy", "w", "h", "hp", "life", "t", "dmg", "p1", "p2", "p3", "hits"];

/** FNV-1a over every field, in a fixed order. Both peers must get the same number. */
export function checksum(s: State): number {
  let h = 0x811c9dc5;
  const mix = (v: number) => {
    let x = v | 0;
    for (let k = 0; k < 4; k++) { h ^= x & 0xff; h = Math.imul(h, 0x01000193); x >>>= 8; }
  };
  mix(s.frame); mix(s.phase); mix(s.phaseT); mix(s.timer); mix(s.round); mix(s.wins[0]); mix(s.wins[1]);
  mix(s.roundWinner); mix(s.matchWinner); mix(s.rng); mix(s.nextId); mix(s.itemT);
  for (const f of s.f) {
    for (const k of FIGHTER_KEYS) mix(f[k] as number);
    for (const arr of [f.cd, f.cdPushed, f.st, f.res]) for (const v of arr) mix(v);
  }
  mix(s.ents.length);
  for (const e of s.ents) { for (const k of ENT_KEYS) mix(e[k] as number); for (let c = 0; c < e.b.length; c++) mix(e.b.charCodeAt(c)); }
  mix(s.items.length);
  for (const it of s.items) { mix(it.id); mix(it.kind); mix(it.x); mix(it.y); mix(it.life); }
  mix(s.ot); mix(s.otHp[0]); mix(s.otHp[1]); mix(s.tiebreak);
  for (const v of s.hz) mix(v);
  return h >>> 0;
}

// ---------------- fighter ----------------
const TIMERS = [
  S.CC_IMMUNE, S.SIL_IMMUNE, S.SLOW_T, S.INVERT, S.REFLECT, S.COUNTER, S.INVULN, S.CAST, S.DMG_BUF_T,
  S.SPD_BUF_T, S.CHG_BUF_T, S.REGEN_BUF_T, S.CC_IMMUNE_ITEM, S.CRASH_T, S.WEAK, S.WET, S.UNHANDLED, S.HOLD,
  S.JOIN, S.RATE_LIMIT, S.MERGE,
];

function tickStatuses(s: State, i: number) {
  const f = s.f[i];
  for (const k of TIMERS) if (f.st[k] > 0) f.st[k]--;
  if (f.st[S.STUN] > 0 && --f.st[S.STUN] === 0) f.st[S.CC_IMMUNE] = C.CC_IMMUNE;
  if (f.st[S.ROOT] > 0 && --f.st[S.ROOT] === 0) f.st[S.CC_IMMUNE] = C.CC_IMMUNE;
  if (f.st[S.SILENCE] > 0 && --f.st[S.SILENCE] === 0) f.st[S.SIL_IMMUNE] = C.CC_IMMUNE;
  if (f.st[S.SHIELD_T] > 0 && --f.st[S.SHIELD_T] === 0) f.st[S.SHIELD] = 0;
  for (let k = 0; k < 3; k++) { if (f.cd[k] > 0) f.cd[k]--; if (f.cd[k] === 0) f.cdPushed[k] = 0; }
  if (f.st[S.HEAL_LEFT] > 0 && (s.frame & 1) === 0) { f.st[S.HEAL_LEFT]--; f.hp = min(C.HP_MAX, f.hp + 1); }
  if (f.st[S.DRAIN_T] > 0) {
    f.st[S.DRAIN_T]--;
    if (f.burnout === 0) { f.mot -= 8; if (f.mot <= 0) { f.mot = 0; spendMot(f, 0); } }
  }
  if (f.st[S.BURN_T] > 0) {
    f.st[S.BURN_T]--;
    if (f.st[S.BURN_T] % 15 === 0) dealDamage(s, -1, i, max(1, f.st[S.BURN_DPS] >> 2), { kind: "dot" });
  }
  f.st[S.HURT_IDLE]++;
  if (f.iframes > 0) f.iframes--;
  if (f.dashCd > 0) f.dashCd--;
  if (f.dropThrough > 0) f.dropThrough--;
  if (f.flash > 0) f.flash--;
  if (f.res[7] > 0 && jobOf(f).id === "cs") f.res[7]--;
  if (f.burnout > 0) {
    if (--f.burnout === 0) { f.mot = C.BURNOUT_RECOVER; f.motIdle = 0; }
  } else {
    f.motIdle++;
    if (f.motIdle > C.MOT_REGEN_DELAY && f.st[S.HOLD] === 0) {
      let regen = f.st[S.REGEN_BUF_T] > 0 ? pm(C.MOT_REGEN, 1000 + f.st[S.REGEN_BUF]) : C.MOT_REGEN;
      if (f.st[S.REGEN_CUT] > 0) regen = pm(regen, 1000 - f.st[S.REGEN_CUT] * 10);
      f.mot = min(motMax(f), f.mot + regen);
    }
  }
}

function tryCast(s: State, i: number, k: number) {
  const f = s.f[i], set = setOf(f), sk = set.skills[k];
  if (!sk || f.cd[k] > 0 || f.st[S.SILENCE] > 0 || f.burnout > 0 || f.st[S.INVULN] > 0 || f.st[S.RATE_LIMIT] > 0) return;
  if (set.canCast && !set.canCast(s, i, k)) return;
  const cost = pm(sk.cost, 1000 - f.st[S.PERM_COST] * 100) + (f.st[S.HOLD] > 0 ? 1000 : 0);
  const typo = f.st[S.TYPO] > 0; // Technical Writer's Typo: this skill misfires the wrong way
  if (typo) { f.st[S.TYPO] = 0; f.facing = -f.facing; }
  const ok = sk.cast(s, i, 1000);
  if (typo) f.facing = -f.facing;
  if (!ok) return;
  if (cost > 0) spendMot(f, cost); // Crunch Cast: allowed even if you can't afford it
  if (f.st[S.FREE_SKILLS] > 0) { f.st[S.FREE_SKILLS]--; f.cd[k] = 0; } else f.cd[k] = pm(pm(sk.cd, 1000 - f.st[S.PERM_CDR] * 100), set.cdMul?.(s, i) ?? 1000);
  f.st[S.LAST_SKILL] = k + 1;
  f.st[S.CAST] = max(f.st[S.CAST], C.CAST_LOCK);
  set.afterCast?.(s, i, k);
  setOf(s.f[1 - i]).onEnemyCast?.(s, 1 - i, k);
}

function moveSpeed(f: Fighter): number {
  let v = jobOf(f).walk;
  if (f.charging) v = pm(v, 600);
  if (f.burnout > 0 && f.st[S.NO_BURN_SLOW] === 0) v = v >> 1;
  if (f.st[S.SPD_BUF_T] > 0) v = pm(v, 1000 + f.st[S.SPD_BUF]);
  if (f.st[S.CRASH_T] > 0 && f.st[S.CRASH_T] <= 120) v = pm(v, 800);
  if (f.st[S.SLOW_T] > 0) v = pm(v, 1000 - f.st[S.SLOW_PCT] * 10);
  if (f.st[S.ROOT] > 0) v = 0;
  return v;
}

function landOn(s: State, f: Fighter, prevY: number) {
  f.onGround = 0;
  if (f.vy < 0) return;
  const floor = px(ARENAS[s.cfg.arena].floor);
  const land = (y: number) => { f.y = y; f.vy = 0; f.onGround = 1; f.jumpsLeft = jobOf(f).jumps - 1; };
  if (f.y >= floor) { land(floor); return; }
  if (f.dropThrough > 0) return;
  for (let n = 0; n < ARENAS[s.cfg.arena].platforms.length; n++) {
    if (hazardPlatformOff(s, n)) continue;
    const p = ARENAS[s.cfg.arena].platforms[n];
    const py = px(p.y);
    if (f.x >= px(p.x1) && f.x <= px(p.x2) && prevY <= py && f.y >= py) { land(py); return; }
  }
  for (const e of s.ents) {
    if ((e.k !== K.PLATFORM && e.k !== K.WALL) || e.hp <= 0) continue;
    const py = e.y - px(e.h), hw = px(e.w) >> 1;
    if (f.x >= e.x - hw && f.x <= e.x + hw && prevY <= py && f.y >= py) { land(py); return; }
  }
}

function stepFighter(s: State, i: number, raw: Input) {
  const f = s.f[i], other = s.f[1 - i], job = jobOf(f);
  let inp = raw;
  if (f.st[S.INVERT] > 0) { const l = inp & IN_LEFT, r = inp & IN_RIGHT; inp = (inp & ~(IN_LEFT | IN_RIGHT)) | (l ? IN_RIGHT : 0) | (r ? IN_LEFT : 0); }
  const pressed = inp & ~f.prevInput;
  tickStatuses(s, i);
  setOf(f).tick?.(s, i);

  if (f.atk === 0 && f.dash === 0 && f.hitstun === 0 && f.st[S.STUN] === 0) f.facing = other.x >= f.x ? 1 : -1;

  if (f.st[S.STUN] > 0) {
    if (f.onGround) f.vx = 0;
    f.guarding = 0;
  } else if (f.hitstun > 0) {
    f.hitstun--;
    f.guarding = 0;
    if (f.onGround) f.vx = Math.trunc((f.vx * 7) / 8);
  } else if (f.dash > 0) {
    f.dash--;
    f.vx = f.dashDir * C.DASH_SPEED;
    f.vy = 0;
  } else if (f.st[S.CAST] > 0 && f.atk === 0) {
    if (f.onGround) f.vx = 0;
  } else if (f.atk > 0) {
    f.atk++;
    if (f.onGround) f.vx = 0;
    if (f.atk === C.ATK_STARTUP + 1 && job.ranged) { basicShot(s, i); f.atkHit = 1; }
    if (f.atk > C.ATK_STARTUP + C.ATK_ACTIVE) {
      f.atk = 0;
      const cf = chargeFull(s, i);
      f.recovery = C.REC_TAP - Math.trunc(((C.REC_TAP - C.REC_FULL) * min(f.atkCharge, cf)) / cf);
    }
  } else if (f.recovery > 0) {
    f.recovery--;
    if (f.onGround) f.vx = 0;
  } else {
    f.guarding = (inp & IN_GUARD) && f.onGround && !f.charging ? 1 : 0;
    if (!f.guarding && f.burnout === 0 && f.st[S.INVULN] === 0) {
      if ((pressed & IN_ATTACK) && !f.charging) {
        if (f.st[S.HELD_ITEM] > 0) { throwInvite(s, i); f.recovery = 20; }
        else { f.charging = 1; f.charge = 0; }
      }
      if (f.charging) {
        f.charge++;
        if (!(inp & IN_ATTACK) || f.charge >= C.CHARGE_MAX) {
          f.atk = 1; f.atkCharge = f.charge; f.atkHit = 0; f.charging = 0; f.charge = 0;
          if (f.st[S.AUTO_FULL] > 0) { f.st[S.AUTO_FULL]--; f.atkCharge = Math.max(f.atkCharge, chargeFull(s, i)); }
        }
      }
      if (!f.charging && f.atk === 0) {
        if (f.st[S.AIM_K] > 0) { // hold-to-aim: left/right moves the reticle, release casts
          const k = f.st[S.AIM_K] - 1;
          f.st[S.AIM_T]++;
          const dir = (inp & IN_RIGHT ? 1 : 0) - (inp & IN_LEFT ? 1 : 0);
          f.st[S.AIM_X] = Math.max(px(C.WALL_L + 12), Math.min(px(C.WALL_R - 12), f.st[S.AIM_X] + dir * px(3)));
          if (!(inp & IN_SKILLS[k])) {
            if (f.st[S.AIM_T] < 8) f.st[S.AIM_X] = other.x; // a tap is a smart cast on them
            tryCast(s, i, k);
            f.st[S.AIM_K] = 0; f.st[S.AIM_X] = 0; f.st[S.AIM_T] = 0;
          }
        } else {
          for (let k = 0; k < 3; k++) if (pressed & IN_SKILLS[k]) {
            if (setOf(f).skills[k]?.aim && f.cd[k] === 0) { f.st[S.AIM_K] = k + 1; f.st[S.AIM_X] = other.x; f.st[S.AIM_T] = 0; }
            else tryCast(s, i, k);
          }
        }
      }
      if ((pressed & IN_DASH) && f.dashCd === 0 && !f.charging && f.atk === 0 && f.st[S.ROOT] === 0) {
        if (spendMot(f, C.DASH_COST)) {
          f.dash = C.DASH_FRAMES;
          f.dashDir = inp & IN_LEFT ? -1 : inp & IN_RIGHT ? 1 : f.facing;
          f.iframes = C.DASH_IFRAMES;
          f.dashCd = job.dashCd ?? C.DASH_CD;
        }
      }
    } else if (f.burnout > 0) {
      f.charging = 0; f.charge = 0;
    }
    if (f.dash === 0 && f.atk === 0 && f.st[S.CAST] === 0) {
      if (f.guarding || f.st[S.AIM_K] > 0) f.vx = 0;
      else {
        const dir = (inp & IN_RIGHT ? 1 : 0) - (inp & IN_LEFT ? 1 : 0);
        f.vx = dir * moveSpeed(f);
        if ((pressed & IN_UP) && f.st[S.ROOT] === 0) {
          if (f.onGround) { f.vy = C.JUMP_V; f.onGround = 0; f.jumpsLeft = job.jumps - 1; }
          else if (f.jumpsLeft > 0) { f.vy = C.DJUMP_V; f.jumpsLeft--; }
        }
        if ((pressed & IN_DOWN) && f.onGround && f.y < px(ARENAS[s.cfg.arena].floor)) { f.dropThrough = C.DROP_FRAMES; f.onGround = 0; }
      }
    }
  }

  // physics
  if (f.dash === 0) {
    f.vy = min(C.MAX_FALL, f.vy + C.GRAVITY);
    if (job.glide && (inp & IN_UP) && f.vy > C.GLIDE_FALL) f.vy = C.GLIDE_FALL;
  }
  const prevY = f.y, prevX = f.x;
  f.x += f.vx;
  f.y += f.vy;
  const half = px(10);
  f.x = Math.max(px(C.WALL_L) + half, Math.min(px(C.WALL_R) - half, f.x));
  for (const e of s.ents) {
    if (e.k !== K.WALL || e.o === i || e.hp <= 0) continue;
    const wb = entBox(e), fb = fighterBox(f);
    if (overlap(fb, wb) && prevY > wb.y1 + px(4)) { f.x = prevX; f.vx = 0; }
  }
  landOn(s, f, prevY);
  f.prevInput = raw;
}

function basicDamage(s: State, i: number, c: number): { dmg: number; full: boolean } {
  const j = jobOf(s.f[i]), cf = chargeFull(s, i);
  if (c < Math.trunc(cf / C.TAP_FRAC)) return { dmg: j.tap, full: false };
  return { dmg: j.tap + Math.trunc(((j.full - j.tap) * min(c, cf)) / cf), full: c >= cf };
}
function basicHit(s: State, i: number, full: boolean, c: number) {
  const f = s.f[i], cf = chargeFull(s, i), r = min(c, cf);
  return {
    kind: "basic" as const, melee: !jobOf(f).ranged, proj: !!jobOf(f).ranged, full,
    hitstun: C.HITSTUN_TAP + Math.trunc(((C.HITSTUN_FULL - C.HITSTUN_TAP) * r) / cf),
    kbx: f.facing * (px(3) / 2 + Math.trunc((px(7) / 2) * r / cf)),
    kby: full ? -px(3) : 0,
  };
}
function basicShot(s: State, i: number) {
  const f = s.f[i], j = jobOf(f), { dmg, full } = basicDamage(s, i, f.atkCharge);
  s.ents.push({
    id: s.nextId++, k: K.PROJ, b: "basic.shot", o: i, x: f.x + f.facing * px(12), y: f.y - px(20),
    vx: f.facing * j.ranged!.speed, vy: 0, w: full ? 10 : 6, h: full ? 8 : 5, hp: 1, life: j.ranged!.life,
    t: 0, dmg, p1: full ? 1 : 0, p2: f.atkCharge, p3: 0, hits: 0,
  });
}

function meleeHitbox(f: Fighter) {
  const reach = jobOf(f).reach;
  const x1 = f.facing > 0 ? f.x + px(6) : f.x - px(6 + reach);
  return { x1, x2: x1 + px(reach), y1: f.y - px(30), y2: f.y - px(8) };
}

function resolveMelee(s: State) {
  const hits: { a: number; dmg: number; full: boolean; c: number }[] = [];
  for (const a of [0, 1]) {
    const A = s.f[a], D = s.f[1 - a];
    if (jobOf(A).ranged || A.atk <= C.ATK_STARTUP || A.atk > C.ATK_STARTUP + C.ATK_ACTIVE || A.atkHit) continue;
    const hb = meleeHitbox(A);
    const { dmg, full } = basicDamage(s, a, A.atkCharge);
    // basics also hit the opponent's summons, walls and anchors
    for (const e of s.ents) {
      if (e.o === a || e.hp <= 0 || e.k === K.PROJ || e.k === K.ZONE || e.k === K.DELAYED || e.k === K.TRAP) continue;
      if (overlap(hb, entBox(e))) { e.hp -= dmg; A.atkHit = 1; }
    }
    if (D.iframes === 0 && overlap(hb, fighterBox(D))) hits.push({ a, dmg, full, c: A.atkCharge });
  }
  for (const h of hits) { s.f[h.a].atkHit = 1; dealDamage(s, h.a, 1 - h.a, h.dmg, basicHit(s, h.a, h.full, h.c)); }
}

function pushApart(s: State) {
  const [a, b] = s.f;
  const w = px(20);
  const overlapY = a.y - px(34) < b.y && b.y - px(34) < a.y;
  const dx = b.x - a.x, adx = dx < 0 ? -dx : dx;
  if (!overlapY || adx >= w || a.dash > 0 || b.dash > 0) return;
  const push = Math.trunc((w - adx) / 2) + 1;
  const dir = dx > 0 ? 1 : dx < 0 ? -1 : a.facing > 0 ? 1 : -1;
  const lo = px(C.WALL_L + 10), hi = px(C.WALL_R - 10);
  a.x = Math.max(lo, Math.min(hi, a.x - dir * push));
  b.x = Math.max(lo, Math.min(hi, b.x + dir * push));
}

function stepEntities(s: State) {
  const list = s.ents.slice();
  for (const e of list) {
    if (e.hp <= 0 && e.k !== K.PROJ) { e.life = 0; continue; }
    if (!runBehavior(s, e)) e.life = 0;
  }
  s.ents = s.ents.filter((e) => e.life > 0 && (e.hp > 0 || e.k === K.PROJ));
}

function resetRound(s: State) {
  s.ents = []; s.items = []; s.itemT = C.ITEM_FIRST; s.ot = 0; s.hz = new Array(8).fill(0);
  initFighters(s);
  s.timer = s.tiebreak ? C.sec(45) : C.ROUND_FRAMES; s.phase = PHASE_FIGHT; s.phaseT = 0; s.roundWinner = -1;
  if (s.tiebreak) { s.f[0].hp = C.HP_MAX >> 1; s.f[1].hp = C.HP_MAX >> 1; }
}
export const OT_FRAMES = C.sec(15);

/** Advance one frame. `inputs[0]` is player 1, `inputs[1]` is player 2. */
export function step(s: State, inputs: readonly [Input, Input]) {
  s.frame++;
  if (s.phase !== PHASE_FIGHT) {
    for (let i = 0; i < 2; i++) { const f = s.f[i]; f.prevInput = inputs[i]; if (f.flash > 0) f.flash--; }
    if (--s.phaseT <= 0) {
      if (s.phase === PHASE_ROUND_END) {
        if (s.wins[0] >= C.ROUNDS_TO_WIN || s.wins[1] >= C.ROUNDS_TO_WIN) {
          if (s.wins[0] === s.wins[1] && !s.tiebreak) { s.tiebreak = 1; s.round++; resetRound(s); return; } // Production Incident
          s.phase = PHASE_MATCH_END; s.phaseT = C.MATCH_PAUSE;
          s.matchWinner = s.wins[0] === s.wins[1] ? 2 : s.wins[0] > s.wins[1] ? 0 : 1;
        } else { s.round++; resetRound(s); }
      } else { s.wins = [0, 0]; s.round = 1; s.matchWinner = -1; s.tiebreak = 0; resetRound(s); }
    }
    return;
  }

  stepFighter(s, 0, inputs[0]);
  stepFighter(s, 1, inputs[1]);
  resolveMelee(s);
  stepEntities(s);
  if (s.cfg.hazards) stepHazards(s);
  if (!s.ot && !s.tiebreak) stepItems(s);
  pushApart(s);
  if (s.ot) { // Scope Creep: the walls close in
    const shrink = px(Math.min(150, Math.trunc((OT_FRAMES - s.timer) / 6)));
    for (const f of s.f) f.x = Math.max(px(C.WALL_L + 10) + shrink, Math.min(px(C.WALL_R - 10) - shrink, f.x));
  }

  s.timer--;
  const ko0 = s.f[0].hp <= 0, ko1 = s.f[1].hp <= 0;
  // Overtime: the first clean hit wins
  const otHit0 = s.ot && s.f[0].hp < s.otHp[0], otHit1 = s.ot && s.f[1].hp < s.otHp[1];
  if (!s.ot && !ko0 && !ko1 && s.timer <= 0 && s.f[0].hp === s.f[1].hp) {
    s.ot = 1; s.timer = OT_FRAMES; s.otHp = [s.f[0].hp, s.f[1].hp]; s.items = [];
    return;
  }
  if (ko0 || ko1 || s.timer <= 0 || otHit0 || otHit1) {
    let w: number;
    if ((ko0 && ko1) || (otHit0 && otHit1)) w = 2;
    else if (ko1 || otHit1) w = 0;
    else if (ko0 || otHit0) w = 1;
    else w = s.f[0].hp === s.f[1].hp ? 3 : s.f[0].hp > s.f[1].hp ? 0 : 1;
    if (w === 0 || w === 2) s.wins[0]++;
    if (w === 1 || w === 2) s.wins[1]++;
    s.roundWinner = w; s.phase = PHASE_ROUND_END; s.phaseT = C.ROUND_PAUSE;
  }
}

// generic behaviors shared by all jobs
BEH["basic.shot"] = (s, e) => {
  e.x += e.vx; e.t++;
  if (--e.life <= 0 || e.x < px(C.WALL_L) || e.x > px(C.WALL_R)) return false;
  const b = entBox(e);
  for (const w of s.ents) if (w.k === K.WALL && w.o !== e.o && w.hp > 0 && overlap(b, entBox(w))) { w.hp -= e.dmg; return false; }
  for (const t of s.ents) if (t.o !== e.o && t.hp > 0 && (t.k === K.SUMMON || t.k === K.ANCHOR) && overlap(b, entBox(t))) { t.hp -= e.dmg; return false; }
  const T = s.f[1 - e.o];
  if (T.iframes === 0 && overlap(b, fighterBox(T))) {
    dealDamage(s, e.o, 1 - e.o, e.dmg, basicHit(s, e.o, e.p1 === 1, e.p2));
    return false;
  }
  return true;
};
BEH["item.invite"] = (s, e) => {
  e.x += e.vx; e.y += e.vy; e.vy += 20; e.t++;
  if (--e.life <= 0 || e.y > px(C.H)) return false;
  const T = s.f[1 - e.o];
  if (overlap(entBox(e), fighterBox(T))) {
    dealDamage(s, e.o, 1 - e.o, e.dmg, { kind: "skill", proj: true });
    stun(s, 1 - e.o, C.sec(1.5)); // "stuck in a meeting" (hard CC, capped)
    return false;
  }
  return true;
};
