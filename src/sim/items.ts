// The 14 items (GDD section 4). "Permanent" = rest of the round, max 2 stacks.
import * as C from "./constants";
import { addMot, addShield, buff, cancelActions, heal, px, rndInt, stun } from "./core";
import { ARENAS } from "./arenas";
import { K, S, type State } from "./types";

export interface ItemDef { id: string; name: string; rarity: 0 | 1 | 2; color: number; desc: string; apply(s: State, i: number): void }

const perm = (s: State, i: number, k: number) => { const f = s.f[i]; f.st[k] = Math.min(C.PERM_STACK_MAX, f.st[k] + 1); };

export const ITEMS: ItemDef[] = [
  { id: "coffee", name: "Coffee", rarity: 0, color: 0x8a5a34, desc: "+50 Motivation, +50 % regen 8 s",
    apply: (s, i) => { addMot(s.f[i], 5000); buff(s.f[i], "regen", 500, C.sec(8)); } },
  { id: "pizza", name: "Pizza Friday", rarity: 0, color: 0xffb03a, desc: "Heal 120",
    apply: (s, i) => heal(s.f[i], 120) },
  { id: "energy", name: "Energy Drink", rarity: 0, color: 0x39ff7a, desc: "+30 % speed and charge 6 s, then a crash",
    apply: (s, i) => { buff(s.f[i], "spd", 300, C.sec(6)); buff(s.f[i], "chg", 300, C.sec(6)); s.f[i].st[S.CRASH_T] = C.sec(8); } },
  { id: "invite", name: "Calendar Invite", rarity: 0, color: 0x59d3e8, desc: "Throwable: next attack throws it. Hit = stuck in a meeting 1.5 s",
    apply: (s, i) => { s.f[i].st[S.HELD_ITEM] = 1; } },
  { id: "duck", name: "Rubber Duck", rarity: 1, color: 0xffe066, desc: "Shield 120 for 10 s",
    apply: (s, i) => addShield(s.f[i], 120, C.sec(10)) },
  { id: "headphones", name: "Noise-Cancelling Headphones", rarity: 1, color: 0x3b4a7a, desc: "Immune to CC and slows 8 s",
    apply: (s, i) => { const f = s.f[i]; f.st[S.CC_IMMUNE_ITEM] = C.sec(8); f.st[S.STUN] = 0; f.st[S.ROOT] = 0; f.st[S.SLOW_T] = 0; f.st[S.SILENCE] = 0; } },
  { id: "stackoverflow", name: "Stack Overflow Answer", rarity: 1, color: 0xf48024, desc: "Next 2 skills have no cooldown",
    apply: (s, i) => { s.f[i].st[S.FREE_SKILLS] = 2; } },
  { id: "keyboard", name: "Mechanical Keyboard", rarity: 1, color: 0xc8d0e0, desc: "−15 % charge time (round)",
    apply: (s, i) => perm(s, i, S.PERM_CHARGE) },
  { id: "raise", name: "Salary Raise", rarity: 1, color: 0x5cb043, desc: "+8 % damage (round)",
    apply: (s, i) => perm(s, i, S.PERM_DMG) },
  { id: "chair", name: "Ergonomic Chair", rarity: 1, color: 0x6b7a8f, desc: "−10 % damage taken (round)",
    apply: (s, i) => perm(s, i, S.PERM_ARMOR) },
  { id: "cert", name: "Certification", rarity: 1, color: 0xc09af0, desc: "−10 % skill cost (round)",
    apply: (s, i) => perm(s, i, S.PERM_COST) },
  { id: "pr", name: "Pull Request", rarity: 1, color: 0x8a5ad6, desc: "75 %: a random good item. 25 %: Merge Conflict (stunned 1 s)",
    apply: (s, i) => {
      if (rndInt(s, 4) === 0) { s.f[i].st[S.MERGE] = 30; stun(s, i, 60); return; }
      const good = [0, 1, 2, 4, 5, 6, 7, 8, 9, 10];
      ITEMS[good[rndInt(s, good.length)]].apply(s, i);
    } },
  { id: "pto", name: "PTO", rarity: 2, color: 0x26d0ce, desc: "Cleanse, 3 s invulnerable (can't attack), heal 100",
    apply: (s, i) => {
      const f = s.f[i];
      for (const k of [S.STUN, S.ROOT, S.SILENCE, S.SLOW_T, S.INVERT, S.WEAK, S.WET, S.HOLD, S.DRAIN_T, S.BURN_T, S.UNHANDLED]) f.st[k] = 0;
      f.st[S.INVULN] = C.sec(3); cancelActions(f); heal(f, 100);
    } },
  { id: "promotion", name: "Promotion", rarity: 2, color: 0xffd23f, desc: "+20 max Motivation, −10 % cooldowns (round)",
    apply: (s, i) => { perm(s, i, S.PERM_MOT); perm(s, i, S.PERM_CDR); addMot(s.f[i], 2000); } },
];

const BY_RARITY = [0, 1, 2].map((r) => ITEMS.map((d, k) => (d.rarity === r ? k : -1)).filter((k) => k >= 0));

/** Spawn + pickup + despawn. Called once per fighting frame. */
export function stepItems(s: State) {
  if (!s.cfg.items) return;
  for (const it of s.items) it.life--;
  s.items = s.items.filter((it) => it.life > 0);
  if (--s.itemT <= 0) {
    s.itemT = C.ITEM_EVERY_MIN + rndInt(s, C.ITEM_EVERY_MAX - C.ITEM_EVERY_MIN + 1);
    if (s.items.length < C.ITEM_MAX) {
      const a = ARENAS[s.cfg.arena];
      const free = a.spawns.filter(([x]) => !s.items.some((it) => it.x === px(x)));
      if (free.length) {
        const [x, y] = free[rndInt(s, free.length)];
        const roll = rndInt(s, 100);
        const pool = BY_RARITY[roll < 60 ? 0 : roll < 90 ? 1 : 2];
        let kind = pool[rndInt(s, pool.length)];
        if (a.id === "coffee" && rndInt(s, 2) === 0) kind = 0; // coffee shop: coffee twice as often
        s.items.push({ id: s.nextId++, kind, x: px(x), y: px(y), life: C.ITEM_LIFE });
      }
    }
  }
  // pickup: walk over it
  for (const it of s.items) {
    for (const i of [0, 1]) {
      const f = s.f[i];
      if (f.hp <= 0) continue;
      if (Math.abs(f.x - it.x) < px(14) && f.y - it.y > -px(6) && f.y - it.y < px(40)) {
        ITEMS[it.kind].apply(s, i);
        it.life = 0;
        break;
      }
    }
  }
  s.items = s.items.filter((it) => it.life > 0);
}

/** Calendar Invite thrown instead of a basic attack. */
export function throwInvite(s: State, i: number) {
  const f = s.f[i];
  f.st[S.HELD_ITEM] = 0;
  s.ents.push({
    id: s.nextId++, k: K.PROJ, b: "item.invite", o: i, x: f.x + f.facing * px(12), y: f.y - px(22),
    vx: f.facing * px(5), vy: -px(1), w: 8, h: 8, hp: 1, life: 90, t: 0, dmg: 10, p1: 0, p2: 0, p3: 0, hits: 0,
  });
}
