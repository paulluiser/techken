"""Techken v0.3 kits (top-down arena fighter): one kit per job, 1 passive + 3 skills.

This file is the single source of truth for kit numbers until the TypeScript data exists.
  python3 design/kits_v3.py          balance report (power per second, spread around median)
  python3 design/kits_v3.py --md     markdown kit cards for GAME_DESIGN.md section 3
  python3 design/kits_v3.py --roster markdown roster table for GAME_DESIGN.md section 2
  python3 design/kits_v3.py --ts     writes src/sim/data/kits.gen.ts for the game

Paper model, not a simulator. Once the new sim runs, CPU-vs-CPU win rates replace it
(target: every job 45-55 %).

power/s = basic + skills (capped by Motivation income) + passive + soft utility
skill value = dmg * hit + hard CC seconds * CC_VALUE * hit + sustain + util
"""
import sys

CC_VALUE = 40          # 1 s of stun/root ~ one free full-charge hit
BASIC_SHARE = 0.30     # share of a full-charge rhythm that lands in a real fight
INCOME = 7.0           # Motivation/s: regen 6 + about 1 from hits
DASH_SPEND = 2.5       # Motivation/s a player spends on dashing on average
# expected hit rate by delivery type
HIT = {"dash": 0.8, "melee": 0.75, "shot": 0.65, "homing": 0.85, "aoe": 0.6, "delayed": 0.5,
       "zone": 0.55, "summon": 1.0, "self": 1.0, "wall": 1.0, "consume": 1.0}

# skill: (name, delivery, cost, cooldown, dmg, cc_s, sustain, util, "short text")
#   dmg    = full damage if it all lands (summons: dps * lifetime * 0.5)
#   util   = hand-estimated damage-equivalent for slows, walls, zones, mobility
# job: role, basic=(range, charge_s, tap, full), speed 1-5, passive=(name, value/s, text)
JOBS = {
 "Software Engineer": dict(role="All-rounder", basic=("melee", .8, 22, 70), speed=3,
   passive=("Compiler", 1.8, "Every 3rd hit: next skill +25% damage."),
   skills=[("Semicolon Strike", "dash", 20, 6, 50, .3, 0, 0, "Dash forward. 50 dmg. Interrupts."),
           ("Brace Cage", "delayed", 30, 12, 30, 1.2, 0, 0, "Braces snap shut on a spot. Stun 1.2 s."),
           ("Recursion", "shot", 40, 16, 120, 0, 0, 0, "Shot that bounces off walls. Hits 3 times, 40 each.")]),
 "Mobile Developer": dict(role="Hit-and-run", basic=("melee", .6, 16, 50), speed=4,
   passive=("Two Bars", 2.2, "2 dash charges."),
   skills=[("Swipe", "dash", 20, 6, 50, 0, 0, 0, "Dash through them. 50 dmg."),
           ("Camera Flash", "aoe", 30, 12, 45, 0, 0, 14, "Flash cone. 45 dmg, slow 30% for 2 s."),
           ("Deploy to Device", "summon", 40, 18, 90, 0, 0, 10, "Phone turret, 6 s. Shoots 15 dmg every 0.8 s.")]),
 "QA Analyst": dict(role="Debuffer", basic=("melee", .7, 19, 58), speed=3,
   passive=("Found a Bug", 2.6, "Every 4th hit: Weak for 4 s."),
   skills=[("Magnify", "shot", 20, 7, 45, 0, 0, 10, "Beam. 45 dmg and Weak for 4 s."),
           ("Bug Net", "shot", 30, 12, 30, 1.0, 0, 0, "Thrown net. 30 dmg, Root 1 s."),
           ("Release the Bug", "summon", 40, 18, 100, 0, 0, 14, "Bug pet, 8 s. Chases, bites, slows.")]),
 "System Analyst": dict(role="Area control", basic=("melee", .9, 26, 80), speed=3,
   passive=("Critical Path", 2.4, "+25% damage to stunned or rooted targets."),
   skills=[("Arrow Connector", "dash", 20, 6, 50, 0, 0, 6, "Blink to a spot. 50 dmg on the way."),
           ("Swimlane", "wall", 30, 12, 0, 0, 0, 55, "Wall for 5 s. Blocks moves and shots."),
           ("UML Box", "delayed", 40, 18, 40, 1.5, 0, 0, "Box drops on a spot. 40 dmg, stun 1.5 s.")]),
 "Network Admin": dict(role="Zoner", basic=("ranged", 1.0, 22, 70), speed=2,
   passive=("Access Point", 3.0, "Router at start. +15% damage near it."),
   skills=[("Ping", "shot", 20, 5, 30, 0, 0, 8, "Fast shot. 30 dmg, slow 20% for 1.5 s."),
           ("Packet Loss", "zone", 30, 14, 0, 0, 0, 70, "Zone, 5 s. Deletes enemy shots. Enemies deal -30%."),
           ("Broadcast Storm", "aoe", 40, 18, 120, 0, 0, 0, "3 rings burst out from you. 40 each.")]),
 "Database Admin": dict(role="Tank", basic=("melee", 1.3, 28, 88), speed=1,
   passive=("Heavy", 3.2, "Can't be interrupted while charging. Take 5% less damage."),
   skills=[("SELECT", "shot", 20, 7, 30, .4, 0, 14, "Hook. Pulls them to you. 30 dmg."),
           ("Table Lock", "melee", 30, 13, 20, 1.0, 0, 0, "Slam next to you. Stun 1 s."),
           ("DROP TABLE", "aoe", 40, 22, 100, 0, 0, 10, "Leap to a spot. 100 dmg. Breaks summons.")]),
 "DevOps Engineer": dict(role="Builder", basic=("melee", .8, 24, 72), speed=3,
   passive=("Pipeline", 2.4, "Every 3 skills: 5 s of +20% speed and +15% damage."),
   skills=[("Container", "delayed", 20, 9, 40, 0, 0, 30, "Crate lands on a spot. 40 dmg, then it's a wall."),
           ("Conveyor", "zone", 30, 13, 20, 0, 0, 55, "Belt, 6 s. Pulls enemies your way and slows them."),
           ("Push to Prod", "delayed", 40, 16, 130, .4, 0, 0, "Crate falls on a spot after 0.6 s. 130 dmg.")]),
 "Cloud Engineer": dict(role="Artillery", basic=("ranged", .9, 23, 72), speed=3,
   passive=("Elastic", 2.0, "Dash goes 50% farther."),
   skills=[("Rain Cloud", "zone", 20, 6, 90, 0, 0, 12, "Rain on a spot, 3 s. 25 dmg/s. Slows, makes them Wet."),
           ("Cold Start", "delayed", 30, 10, 50, 0, 0, 24, "Hail on a spot. 50 dmg, slow 40% for 2 s."),
           ("Lightning", "delayed", 40, 14, 140, 0, 0, 0, "Strike a spot. 100 dmg, 200 if Wet.")]),
 "Technical Support": dict(role="Summoner", basic=("ranged", .8, 16, 50), speed=3,
   passive=("Hold Music", 2.2, "Enemies near your customers: slow 15%."),
   skills=[("Ticket Fan", "shot", 20, 6, 36, 0, 0, 0, "3 tickets in a fan. 12 each."),
           ("Angry Customer", "summon", 30, 12, 60, 0, 0, 14, "Customer pet, 6 s. Chases and shoves. Max 2."),
           ("Escalate", "summon", 40, 20, 90, .6, 0, 14, "Turns a customer into a Manager. Slam stuns 0.5 s.")]),
 "Cybersecurity Analyst": dict(role="Defender", basic=("melee", .9, 26, 80), speed=3,
   passive=("Hardened", 3.6, "Every 4 s untouched: +30 shield (max 120)."),
   skills=[("Firewall", "wall", 20, 10, 0, 0, 0, 40, "Wall in front, 4 s. Your shots pass."),
           ("Mirror", "self", 30, 10, 40, 0, 20, 0, "1 s. Reflects shots and melee damage."),
           ("Zero-Trust", "self", 40, 18, 50, 0, 70, 0, "Bubble, 3 s. Blocks 100, then explodes for 60+.")]),
 "Data Scientist": dict(role="Ranged", basic=("ranged", .8, 3 * 6, 3 * 18), speed=3,
   passive=("Outlier", 2.4, "15% of hits crit for x1.5."),
   skills=[("Regression", "homing", 20, 7, 55, 0, 0, 0, "Shot aimed where they will be. 55 dmg."),
           ("Confidence Band", "zone", 30, 14, 40, 0, 0, 40, "Zone, 3 s. Every hit inside crits."),
           ("Remove Outliers", "aoe", 40, 18, 90, 0, 0, 12, "Big blast. 90 dmg. Deletes summons and traps.")]),
 "AI/ML Engineer": dict(role="Summoner", basic=("ranged", 1.0, 17, 52), speed=3,
   passive=("Learning", 2.6, "Your bot levels up as it hits (max 3)."),
   skills=[("Deploy Bot", "summon", 25, 10, 90, 0, 0, 14, "Bot pet, 12 s (150 HP). Bites 16 dmg/s."),
           ("Drones", "summon", 30, 13, 60, 0, 0, 8, "2 drones orbit you, 6 s. They shoot with you."),
           ("Agentic Loop", "summon", 40, 18, 90, 0, 0, 10, "All your pets rush them. +50% damage, 4 s.")]),
 "Business Analyst": dict(role="Damage over time", basic=("melee", .8, 19, 60), speed=3,
   passive=("Interest", 3.6, "Each hit adds Debt (max 8). Debt deals 2 dmg/s each."),
   skills=[("Sticky Note", "shot", 20, 6, 20, 0, 0, 22, "Shot. 20 dmg, +3 Debt."),
           ("Scope Creep", "zone", 30, 13, 20, 0, 0, 40, "Growing zone, 5 s. +1 Debt/s, slow 20%."),
           ("Due Date", "consume", 40, 20, 110, 0, 0, 0, "Cash in all Debt. 25 dmg each.")]),
 "Project Manager": dict(role="Controller", basic=("melee", 1.0, 24, 75), speed=3,
   passive=("Velocity", 2.4, "Each skill hit: -5% cooldowns (max 4)."),
   skills=[("Assign Ticket", "shot", 20, 7, 80, 0, 0, 0, "Sticks to them. Explodes after 3 s. 80 dmg."),
           ("Deadline", "zone", 30, 14, 0, 0, 0, 60, "Bubble, 4 s. Enemies and shots inside: -40% speed."),
           ("Code Freeze", "shot", 40, 18, 30, 1.4, 0, 0, "Shot. 30 dmg, Stun 1.4 s.")]),
 "UI/UX Designer": dict(role="Rushdown", basic=("melee", .5, 15, 46), speed=5,
   passive=("Flow State", 2.4, "Each hit in a row: +5% speed (max 25%)."),
   skills=[("Grid Snap", "dash", 20, 6, 30, 0, 0, 10, "Blink. Your next hit crits."),
           ("Drag & Drop", "melee", 30, 12, 70, .5, 0, 0, "Grab and throw. 50 dmg, +20 and stun into a wall."),
           ("Make It Pop", "melee", 40, 16, 100, 0, 0, 0, "5 fast stabs, 20 each.")]),
 "Technical Writer": dict(role="Trapper", basic=("ranged", .8, 15, 48), speed=3,
   passive=("Track Changes", 2.6, "Full-charge hits leave ink: you +15% speed, them -15%."),
   skills=[("RTFM", "shot", 20, 7, 60, .2, 0, 0, "Heavy manual. 60 dmg, knockback."),
           ("Paragraph", "wall", 30, 12, 0, 0, 0, 50, "Text wall, 6 s. Blocks moves and shots."),
           ("Redact", "delayed", 40, 18, 40, 0, 0, 70, "Black bar on a spot. 40 dmg, Silence 2 s.")]),
 "Vibe Coder": dict(role="Burst", basic=("ranged", .7, 13, 40), speed=3,
   passive=("Context Window", 2.0, "First skill after 6 s of no skills: +30% damage."),
   skills=[("Autocomplete", "homing", 20, 5, 25, 0, 0, 0, "Homing shot. 25 dmg."),
           ("Generate", "shot", 30, 10, 60, 0, 0, 0, "Big blast. 60 dmg."),
           ("YOLO Deploy", "aoe", 40, 18, 100, 0, -50, 0, "Explode around you. 100 dmg. You take 50.")]),
}


def power(j):
    rng, charge, tap, full = j["basic"]
    basic = full / charge * BASIC_SHARE * (1.0 if rng == "melee" else 1.1)  # range is safer
    spend = sum(c / cd for _, _, c, cd, *_ in j["skills"]) + DASH_SPEND
    cap = min(1.0, INCOME / spend)
    sk = 0.0
    for name, kind, cost, cd, dmg, cc, sus, util, _ in j["skills"]:
        h = HIT[kind]
        sk += (dmg * h + cc * CC_VALUE * h + sus + util) / cd
    sk *= cap
    speed = (j["speed"] - 3) * 0.6  # mobility is worth a little
    return basic, sk, j["passive"][1], speed, cap


def report():
    rows = []
    for n, j in JOBS.items():
        b, s, p, m, cap = power(j)
        rows.append((n, b + s + p + m, b, s, p, m, cap))
    med = sorted(r[1] for r in rows)[len(rows) // 2]
    print(f"{'Job':24} {'power':>6} {'vs med':>7}  {'basic':>5} {'skills':>6} {'pass':>4} {'move':>5} {'M cap':>5}")
    for n, t, b, s, p, m, cap in sorted(rows, key=lambda r: -r[1]):
        print(f"{n:24} {t:6.1f} {100 * (t / med - 1):+6.1f}%  {b:5.1f} {s:6.1f} {p:4.1f} {m:+5.1f} {cap:5.2f}")
    lo, hi = min(r[1] for r in rows), max(r[1] for r in rows)
    print(f"\nmedian {med:.1f}   spread {lo:.1f}-{hi:.1f}  ({100 * (lo / med - 1):+.1f}% to {100 * (hi / med - 1):+.1f}%)")


def roster():
    print("| # | Job | Role | Basic attack | Speed |\n|---|---|---|---|---|")
    for i, (n, j) in enumerate(JOBS.items(), 1):
        rng, charge, tap, full = j["basic"]
        print(f"| {i} | {n} | {j['role']} | {rng.capitalize()}, {tap} / {full} dmg, {charge} s charge | {'\u25cf' * j['speed']} |")


def md():
    for i, (n, j) in enumerate(JOBS.items(), 1):
        rng, charge, tap, full = j["basic"]
        print(f"### {i}. {n} · {j['role']}")
        print(f"Basic: {rng}, charge {charge} s, {tap} / {full} dmg · Speed {'●' * j['speed']}\n")
        print("| | Skill | Cost / CD | What it does |\n|---|---|---|---|")
        print(f"| Passive | **{j['passive'][0]}** | | {j['passive'][2]} |")
        for k, (name, kind, cost, cd, dmg, cc, sus, util, text) in enumerate(j["skills"], 1):
            print(f"| S{k} | **{name}** | {cost} / {cd} s | {text} |")
        print()


def ts():
    """Writes src/sim/data/kits.gen.ts: the kit numbers the game reads."""
    out = ["// GENERATED by `python3 design/kits_v3.py --ts`. Do not edit by hand.",
           "// Motivation costs are in hundredths, cooldowns and charge times in frames (60/s).",
           "export interface SkillData { name: string; cost: number; cd: number; text: string }",
           "export interface KitData { name: string; role: string; ranged: boolean; charge: number; tap: number; full: number; speed: number;",
           "  passive: { name: string; text: string }; skills: [SkillData, SkillData, SkillData] }",
           "export const KITS: KitData[] = ["]
    q = lambda t: '"' + t.replace('\\', '\\\\').replace('"', '\\"') + '"'
    for n, j in JOBS.items():
        rng, charge, tap, full = j["basic"]
        sk = ", ".join(f"{{ name: {q(a)}, cost: {c * 100}, cd: {round(cd * 60)}, text: {q(t)} }}" for a, _, c, cd, *_, t in j["skills"])
        out.append(f"  {{ name: {q(n)}, role: {q(j['role'])}, ranged: {str(rng == 'ranged').lower()}, charge: {round(charge * 60)}, tap: {tap}, full: {full}, speed: {j['speed']},")
        out.append(f"    passive: {{ name: {q(j['passive'][0])}, text: {q(j['passive'][2])} }}, skills: [{sk}] }},")
    out.append("];")
    open("src/sim/data/kits.gen.ts", "w").write("\n".join(out) + "\n")


if __name__ == "__main__":
    if "--ts" in sys.argv:
        ts(); sys.exit()
    roster() if "--roster" in sys.argv else md() if "--md" in sys.argv else report()
