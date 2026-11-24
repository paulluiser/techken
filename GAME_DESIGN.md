# TECHKEN — Game Design Doc (v0.3, top-down)

> A 1v1 **top-down arena fighter** where every fighter is a tech job.
> Look: mobile stylized 3D (see `design/art/reference-archero2.md`).
> **v0.3 changes:** top-down arenas, one kit per job (1 passive + 3 skills), no jumping or guard, short plain descriptions.
> The v0.2 side-view kits are archived in `design/archive/kits-v0.2-sideview.md`.
> Still written for side-view, to update during the rebuild: parts of 6 (Career and Training details), 12 (screens) and 14 (art).
> All numbers are first-pass values. Kit numbers live in `design/kits_v3.py`.

---

## 1. Core Rules

### 1.0 Clarity first
- A player should understand any skill from its **icon, name and one short line**.
- Skill lines stay under 12 words and only use the effect words in section 3.0.
- In a match, effects show as **icons over the head**, not text.
- The only numbers on screen: damage, cooldown seconds and Motivation cost.
- New players learn by playing. The tutorial is 3 steps (move, charge an attack, use a skill) with no reading screens.

### 1.1 Match structure
| Rule | Value |
|---|---|
| Format | 1v1, best of 3 rounds |
| View | Top-down, closed arena, the whole arena on one screen |
| Platform | Browser game (desktop and mobile), TypeScript, deployed on Vercel |
| Modes | Vs CPU (5 levels), Online PvP with lobby codes, Roguelite ladder (solo, later) |
| Round timer | 90 s |
| HP | 1000 for every job. Nothing raises max HP |
| Time out | Higher HP % wins the round |
| Exact tie | **Overtime** 15 s: the arena shrinks, first clean hit wins |
| Double KO | Both score. At 2-2, play one final round at 50% HP |
| Between rounds | HP, Motivation, cooldowns and buffs reset |
| Comeback | The loser of a round starts the next with a free Coffee |

### 1.2 Basic attack: hold to charge
| | How | Effect |
|---|---|---|
| Tap | Release early | About a third of full damage. Recovery 0.4 s plus a third of the charge time, so heavy weapons tap slowly |
| Full | Hold until the ring fills | Full damage, knockback, only 0.3 s recovery |

- Each job has its own charge time (0.5–1.3 s) and damage (section 2).
- You move at 60% speed while charging.
- **Taps can't stop a charge.** Mid and full hits cancel it (not for Database Admin, whose charge can't be stopped at all). This keeps tap-spamming weak.
- **Aim:** basics aim at the opponent when they're roughly in front of you, otherwise straight ahead. Melee hits an arc in front. Ranged fires a shot.

### 1.3 Motivation and Burnout
| Rule | Value |
|---|---|
| Max | 100, full at round start |
| Regen | +6/s, starting 1 s after you spend |
| Gain | +4 when you land a basic, +2 when you get hit |
| Costs | Skills 20 / 30 / 40, Dash 10 |
| **Burnout** | At 0 Motivation: 2 s of 50% speed, no attacks, skills or dashes. You come back with 35 |
| **Crunch Cast** | You can cast a skill you can't afford. It fires, then you burn out |

### 1.4 Moving and defending
- Move in any direction.
- **Dash:** a short burst, 0.2 s invulnerable, 10 Motivation, 1.2 s cooldown. This is your main defense.
- **No jump and no guard.** You dodge with dash and hide behind cover.
- **Cover:** desks and crates block movement and shots. Some can break.
- **Wall Splat:** a full-charge hit that knocks someone into a wall stuns them for 0.4 s.

### 1.5 Skills
- **One kit per job: 1 passive + 3 skills.** No set picking.
- Slot pattern, so every kit reads the same way:
  - **S1** quick and cheap: 20 Motivation, about 6 s cooldown.
  - **S2** control or utility: 30 Motivation, about 12 s cooldown.
  - **S3** big play: 40 Motivation, about 18 s cooldown.
- **Aiming:** tap a skill to auto-aim at the opponent. Hold or drag it to aim yourself.
- No ultimates. Big moments come from combos, Crunch Casts and Burnout punishes.

### 1.6 Camera and arena size
- Camera looks down at about 55°. The whole arena fits on screen and the camera never scrolls.
- Arenas are about **15 × 9 tiles** (landscape) with walls all around, 2–4 pieces of cover and one hazard.
- Rendering is 3D (three.js). The simulation underneath is 2D on the floor plane, deterministic and integer-only, so rollback netcode keeps working.
- Fighters are about 1 tile wide.

---

## 2. Roster

| # | Job | Role | Basic attack | Speed |
|---|---|---|---|---|
| 1 | Software Engineer | All-rounder | Melee, 22 / 70 dmg, 0.8 s charge | ●●● |
| 2 | Mobile Developer | Hit-and-run | Melee, 16 / 50 dmg, 0.6 s charge | ●●●● |
| 3 | QA Analyst | Debuffer | Melee, 19 / 58 dmg, 0.7 s charge | ●●● |
| 4 | System Analyst | Area control | Melee, 26 / 80 dmg, 1.0 s charge | ●●● |
| 5 | Network Admin | Zoner | Ranged, 22 / 70 dmg, 1.0 s charge | ●● |
| 6 | Database Admin | Tank | Melee, 35 / 110 dmg, 1.3 s charge | ● |
| 7 | DevOps Engineer | Builder | Melee, 24 / 75 dmg, 0.9 s charge | ●●● |
| 8 | Cloud Engineer | Artillery | Melee, 23 / 72 dmg, 0.9 s charge | ●●● |
| 9 | Technical Support | Summoner | Ranged, 16 / 50 dmg, 0.8 s charge | ●●● |
| 10 | Cybersecurity Analyst | Defender | Melee, 22 / 68 dmg, 0.9 s charge | ●● |
| 11 | Data Scientist | Ranged | Ranged, 18 / 60 dmg, 0.8 s charge | ●●● |
| 12 | AI/ML Engineer | Summoner | Ranged, 17 / 52 dmg, 1.0 s charge | ●●● |
| 13 | Business Analyst | Damage over time | Melee, 19 / 60 dmg, 0.8 s charge | ●●● |
| 14 | Project Manager | Controller | Melee, 24 / 75 dmg, 1.0 s charge | ●●● |
| 15 | UI/UX Designer | Rushdown | Melee, 13 / 42 dmg, 0.5 s charge | ●●●●● |
| 16 | Technical Writer | Trapper | Ranged, 18 / 55 dmg, 0.8 s charge | ●●● |
| 17 | Vibe Coder | Burst | Ranged, 15 / 46 dmg, 0.6 s charge | ●●●● |

**Matchup wheel (rough):** rushdown beats zoners, zoners beat tanks, tanks beat rushdown. Summoners lose to area attacks (DROP TABLE, Remove Outliers, Broadcast Storm).

---

## 3. Jobs and kits

One kit per job: **1 passive and 3 skills** (S1 / S2 / S3). Format: `Cost / Cooldown`.

### 3.0 Effect words
Every skill uses only these words. Each has one icon in the game.

| Word | Meaning |
|---|---|
| **Stun** | Can't move or act. Max 1.5 s, then 1 s immune to Stun and Root |
| **Root** | Can't move, can still attack |
| **Slow** | Moves slower. Max 40%, the strongest slow wins |
| **Silence** | Can't use skills. Max 2 s |
| **Weak** | Takes +20% damage |
| **Shield** | Absorbs damage before HP |
| **Knockback** | Pushed away. Into a wall = Wall Splat |
| **Crit** | x1.5 damage |
| **Pet** | A summon with its own HP and timer. Area attacks break it |
| **Wall / Zone** | A placed object or floor area with a timer |

Two job markers also show as icons: **Debt** (Business Analyst) and **Wet** (Cloud Engineer).

### 1. Software Engineer · All-rounder
Basic: melee, charge 0.8 s, 22 / 70 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Compiler** | | Every 3rd hit: next skill +25% damage. |
| S1 | **Semicolon Strike** | 20 / 6 s | Dash forward. 50 dmg. Interrupts. |
| S2 | **Brace Cage** | 30 / 12 s | Braces snap shut on a spot. Stun 1.2 s. |
| S3 | **Recursion** | 40 / 16 s | Shot that bounces off walls. Hits 3 times, 35 each. |

### 2. Mobile Developer · Hit-and-run
Basic: melee, charge 0.6 s, 16 / 50 dmg · Speed ●●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Two Bars** | | 2 dash charges. |
| S1 | **Swipe** | 20 / 6 s | Dash through them. 45 dmg. |
| S2 | **Camera Flash** | 30 / 12 s | Flash cone. 45 dmg, slow 30% for 2 s. |
| S3 | **Deploy to Device** | 40 / 18 s | Phone turret, 6 s. Shoots 15 dmg/s. |

### 3. QA Analyst · Debuffer
Basic: melee, charge 0.7 s, 19 / 58 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Found a Bug** | | Every 4th hit: Weak for 4 s. |
| S1 | **Magnify** | 20 / 7 s | Beam. 40 dmg and Weak for 4 s. |
| S2 | **Bug Net** | 30 / 12 s | Thrown net. 30 dmg, Root 1 s. |
| S3 | **Release the Bug** | 40 / 18 s | Bug pet, 8 s. Chases, bites, slows. |

### 4. System Analyst · Area control
Basic: melee, charge 1.0 s, 26 / 80 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Critical Path** | | +25% damage to stunned or rooted targets. |
| S1 | **Arrow Connector** | 20 / 6 s | Blink to a spot. 40 dmg on the way. |
| S2 | **Swimlane** | 30 / 12 s | Wall for 5 s. Blocks moves and shots. |
| S3 | **UML Box** | 40 / 18 s | Box drops on a spot. 40 dmg, stun 1.5 s. |

### 5. Network Admin · Zoner
Basic: ranged, charge 1.0 s, 22 / 70 dmg · Speed ●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Access Point** | | Router at start. +20% damage near it. |
| S1 | **Ping** | 20 / 5 s | Fast shot. 35 dmg, slow 20% for 1.5 s. |
| S2 | **Packet Loss** | 30 / 14 s | Zone, 5 s. Deletes enemy shots. Enemies deal -30%. |
| S3 | **Broadcast Storm** | 40 / 18 s | 3 rings burst out from you. 45 each. |

### 6. Database Admin · Tank
Basic: melee, charge 1.3 s, 35 / 110 dmg · Speed ●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Heavy** | | Can't be interrupted while charging. Take 10% less damage. |
| S1 | **SELECT** | 20 / 7 s | Hook. Pulls them to you. 30 dmg. |
| S2 | **Table Lock** | 30 / 13 s | Slam next to you. Stun 1.2 s. |
| S3 | **DROP TABLE** | 40 / 20 s | Leap to a spot. 130 dmg. Breaks summons. |

### 7. DevOps Engineer · Builder
Basic: melee, charge 0.9 s, 24 / 75 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Pipeline** | | Every 3 skills: 5 s of +20% speed. |
| S1 | **Container** | 20 / 9 s | Drop a crate wall (150 HP). |
| S2 | **Conveyor** | 30 / 13 s | Belt, 6 s. Pushes enemies your way. |
| S3 | **Push to Prod** | 40 / 16 s | Crate falls on a spot after 1 s. 120 dmg. |

### 8. Cloud Engineer · Artillery
Basic: melee, charge 0.9 s, 23 / 72 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Elastic** | | Dash goes 50% farther. |
| S1 | **Rain Cloud** | 20 / 7 s | Rain on a spot, 3 s. 25 dmg/s. Makes them Wet. |
| S2 | **Cold Start** | 30 / 12 s | Hail on a spot. 40 dmg, slow 40% for 2 s. |
| S3 | **Lightning** | 40 / 16 s | Strike a spot. 100 dmg, 200 if Wet. |

### 9. Technical Support · Summoner
Basic: ranged, charge 0.8 s, 16 / 50 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Hold Music** | | Enemies near your customers: slow 15%. |
| S1 | **Ticket Fan** | 20 / 6 s | 3 tickets in a fan. 20 each. |
| S2 | **Angry Customer** | 30 / 12 s | Customer pet, 8 s. Chases and shoves. Max 2. |
| S3 | **Escalate** | 40 / 20 s | Turns a customer into a Manager. Slam stuns 0.8 s. |

### 10. Cybersecurity Analyst · Defender
Basic: melee, charge 0.9 s, 22 / 68 dmg · Speed ●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Hardened** | | Every 5 s untouched: +30 shield (max 90). |
| S1 | **Firewall** | 20 / 10 s | Wall in front, 4 s. Your shots pass. |
| S2 | **Mirror** | 30 / 14 s | 1 s. Reflects shots and half of melee. |
| S3 | **Zero-Trust** | 40 / 18 s | Bubble, 3 s. Blocks 100, then explodes. |

### 11. Data Scientist · Ranged
Basic: ranged, charge 0.8 s, 18 / 60 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Outlier** | | 15% of hits crit for x1.5. |
| S1 | **Regression** | 20 / 7 s | Shot aimed where they will be. 50 dmg. |
| S2 | **Confidence Band** | 30 / 14 s | Zone, 3 s. Every hit inside crits. |
| S3 | **Remove Outliers** | 40 / 18 s | Big blast. 90 dmg. Deletes summons and traps. |

### 12. AI/ML Engineer · Summoner
Basic: ranged, charge 1.0 s, 17 / 52 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Learning** | | Your bot levels up as it hits (max 3). |
| S1 | **Deploy Bot** | 25 / 10 s | Bot pet, 12 s (150 HP). Bites 12 dmg/s. |
| S2 | **Drones** | 30 / 13 s | 2 drones orbit you, 6 s. They shoot with you. |
| S3 | **Agentic Loop** | 40 / 18 s | All your pets rush them. +50% damage, 4 s. |

### 13. Business Analyst · Damage over time
Basic: melee, charge 0.8 s, 19 / 60 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Interest** | | Each hit adds Debt (max 8). Debt deals 2 dmg/s each. |
| S1 | **Sticky Note** | 20 / 6 s | Shot. 20 dmg, +3 Debt. |
| S2 | **Scope Creep** | 30 / 13 s | Growing zone, 5 s. +1 Debt/s, slow 20%. |
| S3 | **Due Date** | 40 / 20 s | Cash in all Debt. 20 dmg each. |

### 14. Project Manager · Controller
Basic: melee, charge 1.0 s, 24 / 75 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Velocity** | | Each skill hit: -5% cooldowns (max 4). |
| S1 | **Assign Ticket** | 20 / 7 s | Sticks to them. Explodes after 3 s. 80 dmg. |
| S2 | **Deadline** | 30 / 14 s | Bubble, 4 s. Enemies and shots inside: -40% speed. |
| S3 | **Code Freeze** | 40 / 18 s | Shot. 30 dmg, Stun 1.4 s. |

### 15. UI/UX Designer · Rushdown
Basic: melee, charge 0.5 s, 13 / 42 dmg · Speed ●●●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Flow State** | | Each hit in a row: +5% speed (max 25%). |
| S1 | **Grid Snap** | 20 / 6 s | Blink. Your next hit crits. |
| S2 | **Drag & Drop** | 30 / 12 s | Grab and throw. 40 dmg, +20 and stun into a wall. |
| S3 | **Make It Pop** | 40 / 16 s | 5 fast stabs, 16 each. |

### 16. Technical Writer · Trapper
Basic: ranged, charge 0.8 s, 18 / 55 dmg · Speed ●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Track Changes** | | Full-charge hits leave ink: you +15% speed, them -15%. |
| S1 | **RTFM** | 20 / 7 s | Heavy manual. 65 dmg, knockback. |
| S2 | **Paragraph** | 30 / 12 s | Text wall, 6 s. Blocks moves and shots. |
| S3 | **Redact** | 40 / 18 s | Black bar on a spot. 40 dmg, Silence 2 s. |

### 17. Vibe Coder · Burst
Basic: ranged, charge 0.6 s, 15 / 46 dmg · Speed ●●●●

| | Skill | Cost / CD | What it does |
|---|---|---|---|
| Passive | **Context Window** | | First skill after 6 s of no skills: +30% damage. |
| S1 | **Autocomplete** | 20 / 5 s | Homing shot. 35 dmg. |
| S2 | **Generate** | 30 / 10 s | Big blast. 85 dmg. |
| S3 | **YOLO Deploy** | 40 / 18 s | Explode around you. 150 dmg. You take 50. |

---

## 4. Items and Buffs

**Spawn rules:**
- The first item appears at 15 s, then every 15–20 s.
- At most 2 items on the field at once.
- Uncollected items blink, then disappear after 10 s.
- Pick up an item by walking over it. There is no button for it (good for mobile).
- Rarity: Common 60 %, Rare 30 %, Epic 10 %.
- "Permanent" means **for the rest of the round**, with a max of 2 stacks of each.

| Item | Rarity | Type | Effect |
|---|---|---|---|
| ☕ Coffee | Common | Instant / temp | +50 Motivation, +50 % regen for 8 s |
| 🍕 Pizza Friday | Common | Instant | Heal 120 HP |
| 🥫 Energy Drink | Common | Temp | +30 % move and charge speed for 6 s, then a 2 s "crash" at −20 % speed |
| 📅 Calendar Invite | Common | Throwable | Throw it with Attack. On hit, they're "stuck in a meeting" (frozen) for 1.5 s |
| 🦆 Rubber Duck | Rare | Temp | A shield that absorbs 120 for 10 s |
| 🎧 Noise-Cancelling Headphones | Rare | Temp | Immune to CC and slows for 8 s |
| 💡 Stack Overflow Answer | Rare | Temp | Your next 2 skills have no cooldown |
| ⌨️ Mechanical Keyboard | Rare | Permanent | −15 % charge time |
| 💰 Salary Raise | Rare | Permanent | +8 % damage |
| 🪑 Ergonomic Chair | Rare | Permanent | −10 % damage taken |
| 📜 Certification | Rare | Permanent | −10 % skill Motivation cost |
| 📦 Pull Request (mystery box) | Rare | Random | 75 % a random good item, 25 % **Merge Conflict** (stunned 1 s) |
| 🏖️ PTO | Epic | Temp | Cleanse everything, 3 s invulnerable (you can't attack either), heal 100 |
| 🏆 Promotion | Epic | Permanent | +20 max Motivation, −10 % cooldowns |

---

## 5. Arenas

Every arena is a closed room seen from above, about 15 × 9 tiles. Each has **2–4 pieces of cover, one gimmick and one hazard**.
- There's a "Hazards OFF" toggle for competitive play.
- The flat "Terminal" arena is always available.

| Arena | Look | Cover and gimmick | Hazard (toggleable) |
|---|---|---|---|
| **Open Office** (starter) | Cubicles, fluorescent lights | Desk clusters. A rolling chair you can ride by dashing into it | The printer jams every 30 s and sprays paper shots |
| **Server Room** | Blue LEDs, rack rows | Server racks in two rows. Hot-aisle vents push you | **Power outage:** 4 s of near-darkness, only outlines visible |
| **Startup Garage** | Whiteboards, ping-pong table | Beanbags bounce you. The ping-pong table blocks shots | **Funding Round:** 3 items drop at once |
| **Cloud Region** | Above the clouds | Drifting cloud blocks that move slowly | Wind gusts push everyone sideways |
| **Legacy Basement** | Green-screen mainframe, pipes | Punch-card conveyor belts | Spaghetti cables on the floor slow you |
| **Tech Expo Hall** | Booths, banners, a stage | Booths as cover | A spotlight wanders. Standing in it gives +15% damage |
| **Coffee Shop** | Warm lofi café | Tables and the counter | Coffee spawns twice as often. Wi-Fi drops (Network Admin's router turns off for 5 s) |
| **3 AM War Room** | Red alert monitors, pizza boxes | Desk clusters | **"Prod is down" siren:** every 30 s, both lose 15 Motivation |
| **Home Office** | Bedroom, bed, desk | The bed bounces you. A bookshelf blocks shots | A cat walks across and blocks the first attack it touches |
| **Hackathon Night** | Dim lights, laptops, energy cans | Stacked tables | The lights dim as the timer runs down |
| **Team-Building Retreat** | Pine forest, lake, full moon | Logs and rocks. The lake shore slows you | A campfire in the middle burns 10 dmg/s |
| **Campus Rooftop** | Daytime sky, glass towers | AC units and a water tower | A window-cleaning gondola slides across the roof |
| **The Terminal** (competitive) | Black and green code space | Two symmetric blocks | None |

**Job and arena synergy:** Cloud Engineer likes Cloud Region, Network Admin hates the Coffee Shop, DevOps likes the Legacy Basement conveyors.

---

## 6. Game Modes and Online

**Launch modes:**
- **Single player:** Career (6.3), Vs CPU quick match (6.1), Training Room (6.4).
- **Online PvP** with lobby codes (6.2).
- Local 2P is not a launch mode, and there's no separate tutorial (Career's first fight teaches the basics instead).

### 6.1 Vs CPU
Pick a map, the opponent's job and set (or random), and a difficulty.

| Level | Name | Reaction time | How it plays |
|---|---|---|---|
| 1 | Intern | 600 ms | Walks straight in and taps basics. Rarely dodges, uses skills at random, often burns out |
| 2 | Junior | 400 ms | Sometimes charges its basics, uses skills as soon as they're off cooldown, dodges about 20 % of the time |
| 3 | Mid-level | 280 ms | Charges to full, dashes through shots, uses cover, stops spending below 25 Motivation, goes for items |
| 4 | Senior | 200 ms | Plays its kit's combo, punishes your Burnout and missed full charges, plays around your cooldowns |
| 5 | Principal | 150 ms | Adapts to your habits (for example, starts catching you if you always dash the same way), Crunch Casts for the KO, contests item spawns |

- **No cheating at any level.** The CPU never reads your inputs. Difficulty comes only from reaction time and decision quality, so losing to it feels fair.
- **How to build it:** one utility-based AI (it scores each possible action and picks the best). Each job gets a "playbook" listing its preferred range, its combo order and set-specific rules.
- The AI/ML bot, Tech Support customers and other summons reuse the same AI system.

### 6.2 Online PvP with lobby codes
**Flow:**
1. The host taps **Create Lobby** and gets a 6-character code, e.g. `K7QX2M`. Codes skip look-alike characters (0/O, 1/I).
2. The host shares the code. The guest taps **Join** and types it in.
3. In the lobby, both players blind-pick a job and set. The host picks the map, hazards on/off and items on/off. Both press **Ready**.
4. Play best of 3 → results screen → **Rematch** (same lobby) or **Leave**.
- Codes expire after 10 minutes if nobody joins (a Redis TTL). Once both players are connected, the code is deleted, and Rematch keeps using the existing connection.
- **Cross-play between desktop and mobile browsers.**
- **Shareable join link:** the code also works as a link (`…/play?code=K7QX2M`) that drops the guest straight into the lobby.
- The lobby shows ping and warns above about 150 ms.
- **No login, ever.** Players use a temporary name only (see 13).

**Netcode requirements.** Decide these before writing any gameplay code, because adding them later is very painful.
- **Rollback netcode (GGPO-style):**
  - Each game predicts the opponent's input and corrects itself when the real input arrives.
  - The alternative, delaying every input until the opponent's arrives, feels bad in a fighting game.
- **The simulation must be deterministic:**
  - It runs at a fixed 60 ticks/s, kept separate from rendering.
  - Gameplay positions use integer or fixed-point math, not the engine's floating-point physics.
  - Gameplay code never calls `Math.sin`, `Math.cos`, `Math.pow` or similar, because browsers may round them differently. Use lookup tables instead.
- **One shared random seed per match.** Everything random uses it:
  - item spawns
  - Data Scientist's rolls
  - Vibe Coder's Regenerate hallucination
  - the Pull Request mystery box
- **Summons and bots must be deterministic too.** The AI/ML bot, customers and drones run inside the simulation and decide only from game state.
- **Snapshots:** the whole game state has to be small enough to save and restore every frame, since rollback depends on it.
- **Connection (browser):**
  - Browsers can't send raw UDP, so players connect through **WebRTC data channels** set to unreliable and unordered. That's the closest a browser gets to UDP.
  - **Signaling** (turning a lobby code into a WebRTC connection) runs on Vercel functions with Upstash Redis (see 11.1).
  - A **TURN relay** is the fallback when a direct connection fails, which is common on mobile carriers and office networks.
  - The backend is just those two pieces.
- **Desync detection:** both games compare a checksum of the game state every few frames. On a mismatch, log it and end the match cleanly.
- **Disconnects:** wait up to 10 s for a reconnect. After that, the remaining player wins the match.
- **Switching tabs:** browsers slow down hidden tabs, so a hidden tab during an online match counts as a disconnect (same 10 s rule). In Vs CPU, the game pauses.
- **Input delay setting** (1–3 frames): fewer rollbacks on weak mobile connections.

### 6.3 Career: "Climb the Corporate Ladder"
An arcade-style ladder run. You pick a job and set, then fight up the org chart from **Intern to CTO**.
- About 20–25 minutes per run.
- The game saves after every fight, so you can close the tab and resume later.

**Starting a career:** pick a job, a set (A/B) and a career difficulty.
| Career difficulty | CPU level by rung | Continues |
|---|---|---|
| Easy | Intern → Mid-level (levels 1 → 3) | Unlimited |
| Normal | Junior → Senior (2 → 4) | Unlimited |
| Hard | Mid-level → Principal (3 → 5) | 3 |

**The ladder (each fight is best of 3 rounds, 90 s):**
| Rung | Your title | Opponent |
|---|---|---|
| 1 | Intern | Random job from the "easy reads" pool (Tech Writer, Mobile Dev, Cloud, Tech Support) |
| 2 | Junior | Random job |
| 3 | Junior II | Random job |
| ★ | — | **Performance Review** (bonus stage) |
| 4 | Mid-level | Random job |
| 5 | Senior | Random job |
| 6 | Lead | **Your rival** (fixed per job, see below) |
| 7 | Principal | Random job, always played at the top CPU level for your difficulty |
| ☠ | — | **Final boss: Legacy System** |
| ☠☠ | — | **Secret boss: The Board** (only on a Hard clear with no continues) |

- Opponents never repeat within one run. Each one plays a random set (A or B).
- Arenas follow the opponent: each job has a "home" arena (Cloud Engineer → Cloud Region, DBA → Legacy Basement, and so on). Hazards are on.

**Rivals (rung 6).** Each rival fight opens with a two-line exchange.
| Rivals | Flavor |
|---|---|
| Software Engineer ↔ QA Analyst | "Works on my machine." / "Not on mine." |
| Mobile Developer ↔ UI/UX Designer | Pixel-perfect mockup vs. what shipped |
| System Analyst ↔ Business Analyst | Whose requirements are they anyway |
| Network Admin ↔ Cybersecurity Analyst | Open the port vs. close the port |
| Database Admin ↔ Data Scientist | `SELECT *` on production |
| DevOps Engineer ↔ Cloud Engineer | Whose fault is the outage |
| AI/ML Engineer ↔ Vibe Coder | Builds the model vs. prompts the model |
| Technical Support → Technical Writer | "Nobody reads the docs." |
| Technical Writer → Project Manager | "Docs aren't in the sprint." |
| Project Manager → Technical Support | "Why is the backlog 900 tickets?" |

**Performance Review (bonus stage, after rung 3): "Inbox Zero."**
- **How it plays:** 30 s. Tickets fly at your desk from both sides and from above. Destroy them with basics and skills before they land.
  - Motivation and cooldowns work normally, so you can burn out here too.
  - Combo multiplier: every 5 tickets in a row without one landing adds +1×.
- **Rating:** Meets Expectations / Exceeds / Outstanding.
- **Reward:** one **career perk** for the rest of the run, picked from 3 offered (Outstanding gets the pick of 3, Exceeds 2, Meets 1). Perks are deliberately modest:
  - **Salary Band:** +5 % damage.
  - **Wellness Budget:** +10 max Motivation.
  - **Desk Duck:** start each round with a Rubber Duck shield (60 absorb).
  - **Fast Laptop:** −10 % charge time.
  - **Flexible Hours:** +5 s on the round timer.
- Perks exist **only in Career**, never in Vs CPU or Online.

**Final boss: LEGACY SYSTEM** (Legacy Basement arena, 180 s timer, one long fight)
- **What it is:** a giant green-screen mainframe that fills the right third of the arena.
  - 3000 HP, shown as a segmented bar (bosses ignore the equal-HP rule; single player only).
  - Its CRT "face" is the weak point: +50 % damage while it's open.
- **Phase 1 (100–60 %): "Batch Job."**
  - Punch-card volleys in 3 lanes.
  - A spaghetti-cable floor sweep (jump it).
  - The face opens after each volley.
- **Phase 2 (60–25 %): "Migration."**
  - Spawns 2 COBOL Bugs (small chasers, 60 HP).
  - The face only opens while no bugs are alive.
  - The floor conveyors switch on.
- **Phase 3 (25–0 %): "Kernel Panic."**
  - Every 12 s a blue-screen wave sweeps the arena: 150 dmg unless you're behind a platform pillar (pillars rise as warnings).
  - Attacks speed up 20 %.
- **On defeat:** "Migration complete." Your ending card follows.

**Secret boss: THE BOARD** (stretch goal, rooftop boardroom)
- **What it is:** three executives with **1200 HP each**, fought together. Each one leaves as its HP hits 0.
  - **CEO:** "Pivot". Flips the arena layout every 20 s.
  - **CFO:** "Budget Cut". Steals one of your skills for 8 s (it's grayed out).
  - **Chairman:** "Hostile Takeover". A grab that drains 20 Motivation.
- Beating The Board gives the true ending: *"Promoted to CTO."*

**Fight scoring and the end screen:**
- **Points per fight:**
  - Win +1000.
  - HP left ×1 per HP.
  - Perfect round (no damage taken) +500.
  - Time left ×10 per second.
  - No Burnout all fight +300.
  - Longest combo ×50 per hit.
- **Continues** reset your score to 0 for the fight you continue on.
- **Career end:** a "Performance Review" card shows total score, rating and **title earned**:
  - < 15k: "Needs Improvement"
  - 15k: "Solid Contributor"
  - 25k: "10x Engineer"
  - 35k: "Rockstar Ninja"
  - The Board clear: "Chief Technology Officer"
- Local high scores are kept per job and difficulty.

**First-fight teaching (instead of a tutorial mode):**
- **Contextual tips:** rung 1 of your first career shows short tips at the right moment:
  - "Hold to charge" on the first tap attack.
  - "Guard costs Motivation" on the first block.
  - "Burnout!" the first time you burn out, with what it does.
  - "Items spawn" when the first item appears.
- **Skill tips:** a skill's tip shows the first time you use it.
- Tips can be turned off in Settings and show once per browser.

**Content per job:** 1 intro line, 1 win quote, 1 loss quote, the rival exchange (shown with the expression portraits from 14.3), and an **ending card** (one pixel-art still and 3 lines: "Promoted to ___").

### 6.4 Training Room
Free practice against a dummy on any arena. A side panel holds all the settings.
- **Dummy behavior:**
  - Stand, Crouch, Jump, Guard all, Guard after first hit, Dash away, Random.
  - Or "CPU level 1–5": it fights back but never takes damage below 1 HP.
- **Dummy job and set:** any. Useful for practicing matchups.
- **Toggles:**
  - Infinite Motivation, No cooldowns, Infinite Tokens.
  - Infinite HP for you or the dummy.
  - Items off, or **spawn a chosen item**.
- **Info overlays:**
  - Hitboxes and hurtboxes.
  - Damage numbers and combo counter.
  - Frame data (startup / active / recovery).
  - Input display.
  - Motivation spend log.
- **Controls:** reset positions (center / left corner / right corner), 50 % slow motion, and pause with frame step.
- **Record and playback:** record up to 10 s of dummy inputs to practice defending a specific pattern.

### 6.5 Cosmetic unlocks
Every job and both sets are available from the start, so online is always fair. Single player unlocks **cosmetics only**:

| Unlock | How |
|---|---|
| Alt palette 1 for that job | Clear a career on any difficulty |
| Alt palette 2 + a job title for your nameplate (e.g. "Senior QA") | Clear on Normal |
| Gold palette + victory pose | Clear on Hard |
| Animated nameplate | Clear Normal+ with **both** sets of that job |
| Arena night variants | Clear careers with 5 different jobs |
| "Executive" palette (every job) | Beat The Board |
| "Mainframe" title | Beat Legacy System without continues |

- Unlocked titles and palettes show in the online lobby.
- **Saving:** progress lives in browser storage, with no login. Moving progress to another device works by transfer code or QR code (section 13).

## 7. Controls

Same 6 actions everywhere: **Move, Aim, Attack (hold), Dash, Skill 1, Skill 2, Skill 3.**

### 7.1 Keyboard and mouse
| Action | Input |
|---|---|
| Move | W A S D |
| Aim | Mouse |
| Attack (hold to charge) | Left click |
| Dash | Space or Shift (dashes the way you're moving) |
| Skills 1 / 2 / 3 | Q / E / R (cast at the cursor) |
| Menu | Esc |

**Keyboard only:** arrows move, J attack, K dash, U / I / O skills. Everything auto-aims at the opponent. All keys can be rebound.

### 7.2 Gamepad
| Action | Button |
|---|---|
| Move | Left stick |
| Aim | Right stick (let go to auto-aim) |
| Attack (hold) | Right trigger |
| Dash | Left trigger or A / Cross |
| Skills 1 / 2 / 3 | X / Y / B (Square / Triangle / Circle) |

### 7.3 Mobile (landscape)
```
 ┌───────────────────────────────────────────────────────────┐
 │ [SE ███████░░]          [⬡ 62]          [░░███████ DB]   │
 │                                                           │
 │                  (arena, seen from above)                 │
 │                                              (S3)         │
 │                                          (S2)             │
 │   ╭───╮                              (S1)   ( ATTACK )    │
 │  (  ◎  )  ← floating joystick                 [DASH]      │
 │   ╰───╯                                                   │
 └───────────────────────────────────────────────────────────┘
```
- **Left thumb:** a floating joystick that appears where you touch.
- **ATTACK:** hold to charge (a ring fills around the button and the fighter). Drag while holding to aim.
- **Skills:** tap to auto-aim. Drag to aim, release to cast, drag back to cancel. Each shows its cooldown and cost, and turns gray when you can't afford it. Long-press a gray skill to Crunch Cast.
- **DASH:** tap to dash the way you're moving.
- Buttons are at least 56 pt. The layout can be moved and mirrored for left-handed play.

**Mobile browser specifics:**
- **Touch handling:** the canvas blocks pinch-zoom, double-tap zoom, pull-to-refresh, long-press menus and text selection (`touch-action: none`, `user-select: none`).
- **Orientation:** a page can't force landscape on iPhone, so portrait shows a "rotate your phone" screen.
- **Fullscreen:**
  - Android Chrome: a fullscreen button, with landscape locked while fullscreen.
  - iPhone Safari doesn't allow fullscreen for games. Instead, players are prompted to **Add to Home Screen** (PWA), which opens without browser bars.
- **Haptics:** the Vibration API works on Android but not iPhone, so haptics are a bonus, never required feedback.
- **Audio:** browsers block sound until the first tap, so the title screen says "Tap to start".

---

## 8. Balance

- **Equal HP (1000).** Jobs differ in damage, speed, range and charge time.
- **Slot budget:** every kit follows the S1 / S2 / S3 pattern in 1.5, so no kit gets an extra strong skill.
- **Caps:** Stun and Root max 1.5 s, then 1 s immune. Slow max 40%. Silence max 2 s.
- **Pets** always have HP, a timer and a max count. Area attacks break them.
- **Every skill has an answer:** dash through it, break it, hide behind cover or punish the cooldown.
- **Paper model:** `python3 design/kits_v3.py` scores every kit's power per second.
  - v0.3 spread: **−3.6% to +4.4%** around the median (the v0.2 side-view kits were −13% to +11%).
  - The model is a starting point. Once the new sim runs, CPU-vs-CPU win rates replace it (target: every job 45–55%).
- **Playtest targets:** rounds last 45–75 s, about 1–2 Burnouts per player per round.

---

## 9. Build Order

The top-down rebuild is planned in `ROADMAP.md`. Start with 2 jobs (Software Engineer and Database Admin) in one arena, test online early, then add the other 15.

---

## 10. Open Questions for You

1. ~~Perspective~~ **Decided (v0.3):** top-down arena, single screen (section 1.6).
2. ~~Multiplayer~~ **Decided:** Vs CPU with 5 difficulty levels, and Online PvP with lobby codes (section 6).
3. ~~Engine~~ **Decided:** TypeScript + Phaser 3 with our own rollback over WebRTC, deployed on Vercel (section 11).
3b. **Online extras later:** stay with lobby codes only, or add accounts, ranked matchmaking and a public "Quick Match" queue after launch?
4. ~~Permanent buffs~~ **Decided:** they last for the rest of the round.
5. **Mirror matches:** can both players pick the same job? I assumed yes, with an alternate palette.
6. ~~Ultimates~~ **Decided:** none. One passive plus 3 skills per job.
7. ~~Brand names~~ **Decided:** keep the real names.
8. ~~Single player~~ **Decided:** Career ladder, Vs CPU quick match and Training Room. Unlocks are cosmetic only (sections 6.3–6.5).
9. ~~Set selection~~ **Decided (v0.3):** one kit per job for now. More sets can come later from the archived ideas.

---

## 11. Engine and Deployment (decided: Phaser + Vercel)

**What Techken needs:**
- It runs in desktop and **mobile** browsers and loads fast on mobile data (players tap a lobby link and should be fighting within seconds).
- Crisp pixel art.
- A deterministic 60-tick simulation and rollback netcode.
- Lobby codes over WebRTC.

**One rule applies whatever the engine:** gameplay logic is our own integer/fixed-point TypeScript or GDScript, never engine physics, and never `Math.sin`-style functions in gameplay. The engine only draws, plays sound and reads input.

| | **TypeScript + Phaser 3** (own rollback) | **Godot 4 web export + netfox** | **Unity WebGL + Photon Quantum** | **GameMaker (HTML5 / GX.games)** |
|---|---|---|---|---|
| Cost | Free | Free | Unity free at small scale, then a Quantum fee that grows with players online | Paid license |
| First load on a phone | **Small** (about 1 MB of library plus our art) | Heavier: the engine runtime alone is several MB compressed | Heaviest | Medium |
| Mobile browsers | Good. Phaser is built for the web | Works, though iOS Safari has rough edges. Since Godot 4.3 the single-threaded web export doesn't need special server headers | Weak historically, improved in Unity 6 but still heavy | HTML5 export exists |
| Pixel art | Good (pixel-art mode, integer scaling) | Excellent, with an editor | Good | Excellent |
| Rollback | **We write it**: for a 1v1 game with a small serializable state it's a few hundred lines | netfox's rollback core | Quantum, the most proven option | Built-in rollback appears tied to GX.games |
| Lobby codes / relay | WebRTC plus our signaling server and a TURN relay | Godot has a WebRTC peer, **but noray doesn't work in browsers** (browsers can't use UDP), so we'd build signaling and TURN anyway | Photon cloud handles it | GX.games only |
| Editor / tools | No visual editor (code plus Tiled for maps plus Aseprite/LibreSprite for sprites) | Full scene and animation editor | Full editor | Full editor |
| Biggest risk | We own the netcode code | Load size and mobile Safari quirks, and we still build browser networking ourselves | Load size, cost, complexity | Locked to one platform |

### Decision: **TypeScript + Phaser 3, our own rollback, WebRTC, deployed on Vercel**
- **Fastest "tap a link → play" load**, which is the whole point of a browser fighter with lobby codes.
- **Godot's big advantage, noray, doesn't apply in browsers.** We'd build WebRTC signaling and TURN either way.
- **Rollback is manageable:** our gameplay logic is engine-independent by design, so rollback is mostly "save state" and "load state".
- **Bonus:** the same simulation runs in Node.js, so we can run thousands of CPU-vs-CPU matches overnight to balance 17 jobs × 2 sets.

### 11.1 Deployment on Vercel

**The stack:**
| Piece | Where it runs | Job |
|---|---|---|
| The game (Vite build of TypeScript + Phaser) | Vercel static hosting (CDN) | Everything players download |
| `api/` functions | Vercel Functions | Create and join lobbies, exchange the WebRTC handshake, hand out TURN credentials |
| Lobby storage | **Upstash Redis** (Vercel Marketplace) | Holds each lobby code for up to 10 minutes |
| STUN / TURN | **Cloudflare Realtime TURN** | Helps players find each other; relays the match when a direct connection fails |
| The match itself | **Browser ↔ browser** (WebRTC data channels) | Inputs, lobby picks, Ready, Rematch. Vercel isn't involved once players are connected |

**Why the lobby handshake uses short HTTP calls instead of a WebSocket:**
- Vercel WebSockets are generally available as of October 2026.
- But connections end when the function reaches its time limit, and the two players can land on different server instances.
- The handshake is only ~4 messages, so a few short HTTP requests plus Redis is simpler and sturdier.
- Revisit WebSockets later for spectators or a public Quick Match queue.

**Lobby flow:**
1. **Host:**
   - Creates the WebRTC offer.
   - Waits until every connection route (ICE candidate) has been gathered, about 1–2 s. Sending them all in the offer means only one message each way.
   - `POST /api/lobby {offer}` → the server stores `lobby:K7QX2M` in Redis (TTL 10 min) and returns the code.
2. **Guest:** opens the link or types the code.
   - `GET /api/lobby/K7QX2M` → receives the offer.
   - Creates an answer → `POST /api/lobby/K7QX2M/answer {answer}`.
3. **Host:** polls `GET /api/lobby/K7QX2M/answer` every 500 ms until the answer arrives. Then the data channels open.
4. **The server deletes the lobby key.** From here on, everything goes browser to browser over two data channels:
   - `game`: unordered, no retransmits (`ordered: false, maxRetransmits: 0`). Carries inputs, rollback-style.
   - `lobby`: reliable and ordered. Carries job and set picks, Ready, Rematch and disconnect notices.
5. **TURN credentials:** `GET /api/turn` calls Cloudflare with our secret key (kept in Vercel environment variables, never sent to the browser) and returns short-lived credentials.
6. **Abuse protection:** rate-limit lobby creation per IP (Upstash Ratelimit) and validate codes (6 characters, unambiguous alphabet).

**Usage per match:** about 25 function calls and about 50 Redis commands. A relayed match sends about 2 MB (inputs only).

### Code layout
```
techken/
  src/
    sim/      pure TypeScript, integer math, no browser APIs
              step(state, p1Input, p2Input) → state, plus save/load state
              jobs/, items/, arenas/, ai/  (the CPU and summons live here too)
    net/      rollback loop, WebRTC data channels, lobby client, input delay setting
    render/   Phaser scenes. They read the state and draw it, never change it
    ui/       menus, lobby screen, touch controls
  api/        Vercel Functions: lobby.ts, lobby/[code].ts, lobby/[code]/answer.ts, turn.ts, transfer.ts, transfer/[code].ts
  tools/      headless balance runner (CPU vs CPU in Node.js)
  public/     sprites, audio, manifest.webmanifest (PWA)
  vercel.json
```

### Prove it first: a 2-week online test

**Status (2026-11-23):** built. See `README.md`. Locally on the duo test page: 0 rollbacks with no lag. With about 210 ms round trip and 5 % loss, both sides held 60 fps, rollbacks averaged 4–5 frames (maximum 7), and there were no desyncs. Still to run: the real laptop vs iPhone test on mobile data after deploying.

1. Two colored boxes on The Terminal map, each with a charge attack, a dash and an HP bar.
2. Lobby code and join link, running on a Vercel preview deployment with Upstash and Cloudflare TURN.
3. **Test laptop Chrome vs iPhone Safari on mobile data**, and add 100–150 ms of artificial lag.
4. Pass criteria: no desyncs over 20 matches, rollbacks that look fine on screen, joining from a link in under 10 s, first load under 3 s on 4G.
5. Also force a TURN-only connection (`iceTransportPolicy: "relay"`) at least once, to prove the fallback works.
6. If it passes, build the 6 MVP jobs on this foundation.

### Costs
| What | Free allowance | Enough for |
|---|---|---|
| **Vercel Hobby** (hosting and functions) | $0, but **personal / non-commercial use only** | Development and a free game. **If Techken earns money (ads, purchases), upgrade to Vercel Pro (about $20/month per team member)** |
| **Upstash Redis** | 500K commands/month | About 10,000 lobbies a month. After that, $0.20 per 100K commands |
| **Cloudflare Realtime TURN** | 1,000 GB/month (shared with Cloudflare's SFU) | Hundreds of thousands of relayed matches. After that, $0.05/GB |
| Domain name | Optional. Vercel gives a free `*.vercel.app` address | About $10–15/year for a custom domain |
| App stores | Not needed. PWA "Add to Home Screen" covers it | $0 |

**Total: $0** while Techken is free to play. The first real cost would be Vercel Pro once the game makes money.
**Accounts to create (free):** Vercel, Upstash (directly or through the Vercel Marketplace), Cloudflare.

*Sources:* [Vercel WebSockets docs](https://vercel.com/docs/functions/websockets) · [Vercel WebSocket test (Classmethod)](https://dev.classmethod.jp/en/articles/vercel-functions-websocket-public-beta-verification/) · [Upstash Redis pricing](https://upstash.com/docs/redis/overall/pricing) · [Cloudflare Realtime pricing](https://developers.cloudflare.com/realtime/pricing/) · [Cloudflare TURN FAQ](https://developers.cloudflare.com/realtime/turn/faq/) · [netfox](https://github.com/foxssake/netfox) · [GameMaker multiplayer tutorial](https://gamemaker.io/en/tutorials/add-multiplayer-to-gamemaker)

---

## 12. Screens and Menus

### 12.1 Theme: TechkenOS
- **The whole menu system is a fake 8-bit desktop OS.**
  - Menus are desktop icons, and screens open as windows with pixel title bars and a close button (the [×] is "Back").
  - A taskbar at the bottom shows a clock, the player's nickname and title, and a fake Wi-Fi icon that shows real online ping.
  - Loading screens are progress bars that sit at 99 % for a beat.
- **Screen names follow the theme:**

| Screen | TechkenOS name |
|---|---|
| Main menu | Desktop |
| Character select | **Employee Directory** |
| Online lobby | **Meeting Room** (the lobby code is the "Meeting ID") |
| Training Room | **Sandbox** |
| Results | **Post-Mortem** |
| Settings | **Control Panel** |
| Unlocks, bios, high scores | **Swag Drawer** |

**Navigation rules:**
- Every screen works with keyboard, gamepad and touch.
  - Keyboard: arrows/WASD move, J confirm, K back.
  - Gamepad: A confirm, B back.
  - Touch: tap, and the [×] button in the top-left for back.
- **At most 3 steps from the Desktop to a fight.** Example: Desktop → Vs CPU → Employee Directory → fight, using the last map or a random one.
- The last-used job, set, palette and difficulty are remembered (browser storage).

### 12.2 Screen flow
```
Boot ("Tap / press any key"; this also unlocks browser audio)
 └─ Desktop
     ├─ Career ─→ Employee Directory ─→ Difficulty ─→ Ladder map ─→ VS ─→ Fight ─→ Post-Mortem ─→ next rung …
     ├─ Vs CPU ─→ Employee Directory (you + CPU) ─→ Map ─→ VS ─→ Fight ─→ Post-Mortem
     ├─ Online ─→ Create  ─→ Meeting Room ─┐
     │          └ Join (code / link) ─────┴→ Employee Directory (blind pick) ─→ VS ─→ Fight ─→ Post-Mortem ─→ Rematch?
     ├─ Sandbox ─→ Employee Directory (you + dummy) ─→ Training Room
     ├─ Swag Drawer (palettes, titles, job bios, high scores, boss records)
     └─ Control Panel (settings)
```
Opening a `…/play?code=K7QX2M` link skips the Desktop and goes straight to Join.

### 12.3 Desktop (main menu)
```
┌───────────────────────────────────────────────────────────────┐
│  TECHKEN                                                      │
│   ┌────┐     ┌────┐     ┌────┐     ┌────┐                     │
│   │ 🪜 │     │ 🤖 │     │ 🌐 │     │ 🧪 │                     │
│   Career    Vs CPU     Online    Sandbox                      │
│   ┌────┐     ┌────┐                                           │
│   │ 🗄 │     │ ⚙ │                (idle fighters wander      │
│   Swag       Control              across the wallpaper)       │
│   Drawer     Panel                                            │
│                                                               │
│ [▶ Start] ░░░░░░░░░░░░░░░░░░░░░░ guest_4821 · Senior QA 📶 12:04│
└───────────────────────────────────────────────────────────────┘
```
- On mobile, the icons become a 3×2 grid of large tiles.
- First launch asks for a temporary name (default `guest_####`). There's no login. The name is shown online, and you can change it any time in the Control Panel (section 13).

### 12.4 Employee Directory (character select)
A **6 × 3 grid = 17 jobs + Random (?)**, which fits exactly. Grid icons are 32×32 chibi faces, each in its job's palette. The preview panel and VS screen use the **96×96 anime bust portraits** (14.3).

**Desktop layout:**
```
┌──────────────────────── EMPLOYEE DIRECTORY ─────────────────── [×] ┐
│ ┌─── YOU ───────────┐                        ┌─── OPPONENT ─────┐ │
│ │  (idle animation) │   ┌──┬──┬──┬──┬──┬──┐  │                   │ │
│ │                   │   │SE│MD│QA│SA│NA│DB│  │        ?          │ │
│ │ DATABASE ADMIN    │   ├──┼──┼──┼──┼──┼──┤  │  choosing…        │ │
│ │ "The Heavy"       │   │DO│CE│TS│CS│DS│AI│  │                   │ │
│ │ Grappler · ★★     │   ├──┼──┼──┼──┼──┼──┤  │                   │ │
│ │ SPD ▮▯▯▯▯ RNG ▮▮▯▯▯│   │BA│PM│UX│TW│VC│ ?│  │                   │ │
│ │ WGT ▮▮▮▮▮ CHG ▮▮▮▮▯│   └──┴──┴──┴──┴──┴──┘  │                   │ │
│ │ Weapon: a table   │                        │                   │ │
│ └───────────────────┘   0:38 ⏱ (online only)  └───────────────────┘ │
│  [J] Select   [U] Kit info   [I] Palette   [K] Back                │
└────────────────────────────────────────────────────────────────────┘
```
**Step 1, pick a job:**
- Hovering a portrait updates the preview: animated idle sprite, name, tagline, archetype, difficulty stars, and 4 stat bars (Speed, Range, Weight, Charge time).

**Step 2, pick a set.** Two "job offer" cards slide in:
```
┌──── SET A: "ACID" ─────────┐  ┌──── SET B: "Destructive" ───┐
│ ◆ Backup (passive)         │  │ ◆ Indexed (passive)         │
│ ① SELECT * FROM   25 · 10s │  │ ① JOIN            25 · 12s  │
│ ② Table Lock      30 · 15s │  │ ② DROP TABLE      45 · 24s  │
│ ③ ROLLBACK        35 · 22s │  │                             │
│ Style: grappler / sustain  │  │ Style: bruiser / anti-summon│
└────────────────────────────┘  └─────────────────────────────┘
```
- Each card shows the passive and every skill with its icon, Motivation cost and cooldown.
- **Kit info [U]** opens the full text, including the Combo line.
- The cursor remembers the set you used last time with that job.

**Step 3, pick a palette:**
- Choose from the palettes you've unlocked (default first).
- **Mirror match:** if both players pick the same job and palette, the second player automatically gets the next palette.

**Step 4, Ready:**
- **Online (blind pick):**
  - The opponent's panel shows "? choosing…" until both players are Ready, then both picks flip over at once.
  - A 45 s timer; if it runs out, the current hover is locked in, or Random if there isn't one.
- **Random (?):** picks a random job, set and palette, revealed on the VS screen.

**Mobile layout (landscape):**
- The grid moves to the right two-thirds, and the preview becomes a slim panel on the left.
- Tap a portrait to preview it, tap again to choose.
- Set cards are swipeable, with a big **CHOOSE** button. Kit info is an (i) button on each card.

### 12.5 Map select and VS screen
- **Map select:**
  - A horizontal strip of arena thumbnails, plus a **Random** tile and a **Hazards ON/OFF** toggle.
  - In Vs CPU, you pick. Online, the host picks in the Meeting Room. In Career, it's automatic (the opponent's home arena).
- **VS screen (2.5 s, the game loads behind it):**
  - Split diagonal **96×96 anime bust portraits** slam in, with nickname and title, job name, set name, and a big pixel "VS".
  - Press any key or tap to skip your side. Online, it only continues when both are loaded.

### 12.6 Meeting Room (online lobby)
```
┌────────────────────────── MEETING ROOM ──────────────────── [×] ┐
│  Meeting ID:  K 7 Q X 2 M     [Copy link]  [Share]              │
│                                                                 │
│  HOST  guest_4821 · Senior QA      📶 38 ms   ✔ Ready            │
│  GUEST waiting for someone to join…                             │
│                                                                 │
│  Arena: [◀ Server Room ▶]   Hazards: [ON]   Items: [ON]          │
│  (host only; the guest sees these settings read-only)           │
│                                                                 │
│                 [ GO TO EMPLOYEE DIRECTORY ]                    │
└─────────────────────────────────────────────────────────────────┘
```
- **Share:**
  - On mobile, **Share** opens the native share sheet (Web Share API).
  - On desktop, **Copy link** copies `…/play?code=K7QX2M` to the clipboard.
- **Join screen:** 6 big character boxes. Pasting a full link or code fills them, invalid characters are rejected, and the cursor auto-advances.
- **Errors in plain language:**
  - "Meeting not found or expired."
  - "Meeting is full."
  - "Couldn't connect. Trying the relay…", then "Still can't connect. Check your network."
- **Ping** above 150 ms shows a yellow warning icon. Above 250 ms it shows red with "Matches may feel laggy."

### 12.7 In-match HUD
```
┌──────────────────────────────────────────────────────────────┐
│ guest_4821  ●●            ⏱ 72            ○●  cpu_principal  │
│ [██████████████░░░░] HP              HP [░░░░████████████████]│
│ [▮▮▮▮▮▮▯▯▯▯] MOTIVATION        MOTIVATION [▯▯▮▮▮▮▮▮▮▮]        │
│ ◈ slowed 1.2s  🦆                                  📶 42ms   │
│                                                              │
│                        (arena)                               │
│                                                              │
│  ①25 ②⟳4s ③35                               x7 COMBO        │
└──────────────────────────────────────────────────────────────┘
```
- **HP bars** drain from the center outward, with a white "recent damage" ghost segment. Round-win pips (●) sit next to the names.
- **Motivation bar:**
  - It flashes red below 20.
  - During **Burnout** it turns gray with "BURNOUT" and a 2 s countdown.
  - Vibe Coder gets a second, thinner **Tokens** bar, with a "RATE LIMITED" state.
- **Status icons** (debuffs, item buffs) sit under the bars with tiny countdown numbers.
- **Skill row** (desktop and gamepad; on mobile the buttons themselves show this):
  - Shows Motivation cost when ready, a cooldown sweep and seconds when not, and turns gray when you can't afford it.
- **Ping** is shown in online matches only.
- **Combo counter** appears from 3 hits up.
- **Round start:** "ROUND 1 … DEPLOY!" **Round end:** "K.O." / "TIME" / "DOUBLE K.O.", with a short freeze-frame.
- The Control Panel can turn off damage numbers, screen shake and flashes.

### 12.8 Pause and in-match menu
| Single player (pauses the game) | Online (never pauses; an overlay over the live match) |
|---|---|
| Resume · Move List · Control Panel · Restart fight · Quit to Desktop | Move List · Control Panel · **Forfeit** (asks you to confirm) |

**Move List:** your current kit, shown as the set card with full text, the Combo line and your job's quirk.

### 12.9 Post-Mortem (results)
- **Winner:** victory pose, win quote, title.
- **Stats** for both players: damage dealt, longest combo, Burnouts, items grabbed, perfect rounds.
- **Buttons:**
  - **Rematch** (online: both have to accept, with a 15 s window).
  - **Change Employee:** back to the Employee Directory, still in the same lobby.
  - **Desktop.**
- **Career:** the score breakdown (each scoring item ticking up), then **Next Rung**.

### 12.10 Control Panel (settings)
| Tab | Options |
|---|---|
| Audio | Master, Music, SFX, Announcer volume. Mono audio. "Muffle music during my Burnout" toggle (section 15) |
| Controls | Key rebinding, gamepad rebinding, **touch layout editor** (drag and resize buttons), joystick vs D-pad, left-handed mirror, Hold-to-Charge Assist, haptics (Android) |
| Gameplay | Contextual tips, damage numbers, screen shake |
| Display | Scaling (whole-number or fill screen), CRT scanline filter, fullscreen (where the browser allows it) |
| Accessibility | Reduce flashing, colorblind-safe UI colors (Motivation, HP and status), larger UI text |
| Online | Nickname, input delay (1–3 frames), show ping |
| Data | **Transfer progress** (show a code and QR code, or enter a code or scan a QR code), reset progress (with a confirmation step) |

### 12.11 Swag Drawer (collection)
- **Employee Profiles:** a job bio styled like a LinkedIn profile ("Skills: SELECT, ROLLBACK · Endorsed by 3 DevOps Engineers"), stat bars, unlocked palettes and the career ending card.
- **Titles:** choose the title shown on your nameplate.
- **High Scores:** best Career score per job and difficulty, and Legacy System and The Board clear times.

---

## 13. Identity and Save Transfer (no login)

**Rule: Techken never has accounts, passwords or email sign-up.**

### 13.1 Temporary name
- First launch asks for a name. The default is `guest_####`.
- 3–16 characters: letters, numbers, `_` and `-`. A basic profanity filter applies.
- Names are **not unique and not reserved**. Two players can both be `dev_kat`. Online, the lobby shows a 4-digit tag next to the name only when both players have the same name (`dev_kat #4821`).
- Change it any time in Control Panel → Online.

### 13.2 What's saved in the browser
- **Saved** under one storage key, `techken.save.v1`:
  - temporary name and chosen title
  - unlocked palettes and titles
  - career high scores and boss clear times
  - last-used job, set and palette
  - settings, including key bindings and touch layout
  - an in-progress career, if any
- **Size:** under 4 KB.
- **Clearing site data erases it.** The Control Panel says so next to the transfer button.

### 13.3 Moving progress to another device
Control Panel → Data → **Transfer progress** has two options.

| | **Transfer code** (for typing) | **QR code** (for scanning) |
|---|---|---|
| What the player sees | `7KQX-2M9P` (8 characters, no look-alike characters) | A QR code on screen (the code is shown under it too) |
| How it works | The save is uploaded to `POST /api/transfer`, which stores it in Upstash Redis under the code for **15 minutes**. The other device enters the code, and `GET /api/transfer/7KQX-2M9P` returns it and deletes it (**one use**) | The QR holds a link: `…/transfer#7KQX-2M9P`. Scanning it with a phone camera opens Techken and imports straight away. The code is in the `#` part, so it isn't sent in server logs |
| Works offline? | No (needs the server) | No (same server code underneath) |

- **Fallback when the server is unreachable:** "Copy full save" gives a longer self-contained code (the save compressed and base64-encoded, about 300–600 characters). Paste it on the other device. No server needed.
- **Import screen:** shows a preview before anything changes ("guest_4821 · 23 palettes · Senior QA · best score 31,200"), then two choices:
  - **Merge** (default): unlocks combine, high scores keep the best, and the incoming name and settings are used.
  - **Replace:** overwrites this device's progress. A confirmation step says this can't be undone.
- **Safety:**
  - Transfer codes expire after 15 minutes and work once.
  - Rate-limited per IP (Upstash Ratelimit).
  - Imported data is validated against the save schema, and anything unknown is dropped.
  - A modified save can only unlock cosmetics, so cheating harms nobody online.
- **QR library:** generate QR codes in the browser with a small QR encoder, and scan with the phone's own camera app (the link opens Techken). No in-game camera scanner is needed.
- **Cost:** each transfer is about 3 Redis commands, well inside the free tier.

---

## 14. Art Direction: "Modern 8-bit"

**Target look:** the reference images. That means NES-era limits (chunky pixels, limited palette, no smooth gradients) drawn with modern detail, and **characters in a chibi anime style:**
- dark outlines
- 3–4 shades per material
- layered backgrounds that fade into the distance
- grass-capped tile edges

We take the **general style**, not any specific game's characters, tiles or exact palette. Everything is original art.

### 14.1 Rules every asset follows
| Rule | Spec |
|---|---|
| **Pixels** | Every pixel sits on the 384×216 grid. No scaling by fractions, no rotating sprites at runtime (rotations are drawn as frames), no anti-aliasing, no blur |
| **Master palette** | One shared palette of about **56 colors**, built by us in the spirit of the NES palette plus extra shades. Saved as `palette.hex` / `.gpl`. Every asset uses only these colors |
| **Colors per fighter** | At most **16** including the outline. Each material (skin, shirt, hair, weapon) gets **3–4 shades:** shadow, base, light, and a highlight pixel or two |
| **Hue-shifted shading** | Shadows shift toward blue or purple, highlights toward yellow or warm. Never shade by just darkening the same hue (that looks muddy) |
| **Outlines** | Fighters, items and foreground objects get a 1-px outline in the palette's darkest color (a deep blue-black, not pure `#000`). Outline pixels next to a lit edge can use the darkest shade of the material (selective outlining) |
| **Light direction** | Always from the **top-left**. Highlights on top and left edges, shadows bottom-right |
| **Dithering** | Sparingly: only in skies, distant layers and large flat areas (checker or 2-tone stripe bands like the sky in reference 1). Never on fighters |
| **Readability** | Fighters must read against every background, so backgrounds are lower contrast and cooler than the play layer, and fighters keep the strongest contrast and the brightest highlights |

### 14.2 Arena backgrounds: layered depth
Every arena is built from 5 layers, back to front. This is how the references get their depth.

| Layer | Contents | Treatment |
|---|---|---|
| 1. Sky / wall | Stepped color bands (no gradients), stars or ceiling lights | Flattest, dithered band transitions |
| 2. Far | Mountains, skyline, server-rack silhouettes, a distant tower | Low contrast, cool, little detail (like the far castle in reference 1) |
| 3. Mid | Tree lines, office cubicle rows, rack rows | Medium contrast, 2–3 shades |
| 4. Near | Big trees, desks, pillars framing the arena edges | Higher contrast, outlined. Can partly overlap the screen edges |
| 5. Play layer | Floor and platform tiles: grass caps over dirt with stones (outdoor), carpet edge over floorboard (office), and so on | Full contrast, outlined, 16×16 tiles |

- **Ambient motion:** the camera doesn't scroll, but the layers move: clouds drift, trees sway (2-frame), monitors blink, water shimmers, the waterfall loops.
- **Fake parallax on impact:** when the screen shakes on a big hit, layers 1–4 shake less the further back they are. That gives depth for free.

### 14.3 Characters: chibi anime style

**What we take from the character reference sheets.** These are general traits only. One sheet shows famous existing game characters, and Techken makes no lookalikes of them.
- **Proportions:** about 2–2.5 heads tall, with a boxy torso, chunky shoes and big readable weapons. Reads clearly at phone size.
- **Outline and shading:** a 1-px dark outline around every character. Flat 2–3 tone shading per material plus one or two highlight pixels. No noisy texture.
- **Faces:** simple dot eyes and a tiny mouth on in-game sprites. The 16-bit-style knight sheet shows the most detail we go to on a sprite: shaded armor, a spiky anime hair crest, and a separate sprite for each facing.
- **Bold color identity:** each character is recognizable by 2–3 dominant colors (hair, outfit and weapon).

**Items and terrain** (from the icon sheet):
- **Item icons** are **16×16** with bold silhouettes, a 1-px dark outline, 3 tones and a white shine pixel, all in saturated colors (Coffee, Pizza, Trophy, Rubber Duck…).
- **HUD bars** get a round **icon cap** (heart for HP, bolt for Motivation) and a light shine row along the bar.
- **Trees** are clean, flat-shaded shapes: tiered pines (lit left, shadow right, a dark underside per tier) and round-canopy trees with highlight blobs.

**Live style target (approved 2026-11-23):** https://claude.ai/artifact/JHUy9YdDYiwYhuez8CJ1rD. A chibi Software Engineer mirror match on the Team-Building Retreat arena, using 16 colors and every rule in this section.

Fighters are **chibi (super-deformed) anime characters** drawn in pixel art: big heads, big expressive eyes, small bodies, oversized weapons. The big head makes each job recognizable even on a phone screen.

**Proportions (in-game sprite, about 40 px tall):**
| Part | Size | Notes |
|---|---|---|
| Head (including hair) | About 16–18 px tall, **about 2.5 heads** total body height | The face sits in the lower half of the head. Hair volume adds height |
| Eyes | **2×3 px dot eyes** | Dark, with **one white highlight pixel** and a single iris-colored pixel. Full anime eyes are only in the 96×96 portraits. Expressions swap the eye stamp (blink line, swirl, `>` `<`) |
| Mouth | 1–2 px, or none | Opens to 2×2 for shouts and hits |
| Body | About 14 px torso and legs | Short limbs and small hands (2×2 px). Feet are blocky |
| Weapon | Oversized: 50–100 % of body height | DBA's table, PM's alarm clock and Vibe Coder's laptop are comedy-big |

**Anime rules:**
- **Hair is the silhouette.** Every job has a distinct hair shape in clumps (spikes, ahoge, bun, ponytail, fluffy) with a 1–2 px **shine band**. Two jobs should be tellable apart by silhouette alone.
- **Hair colors can be bold** (pink, teal, white, purple), always picked from the master palette.
- **Anime symbols as emotes**, drawn as 8×8 pixel stamps over the head:
  - 💧 sweat drop
  - 💢 anger vein (full charge ready)
  - @@ swirl eyes (Burnout and KO)
  - ✨ sparkle eyes (victory, crits)
  - "!" (hit by a counter)
  - "…" (Technical Writer's taunt)
- **Expression swaps** on the sprite's face: neutral, determined (charging), pain (hurt), dizzy (Burnout), smug (victory).
- **Anime effects:**
  - speed lines on dash
  - radial **impact frames** (a 1-frame white-and-black flash with lines) on full-charge hits and KOs
  - "chibi squash" (1 frame squashed flat) when a fighter lands from a big fall
- **Hurtboxes ignore the big head.** Every fighter's hurtbox is a standard body-sized box, so a big-haired chibi isn't easier to hit.

**Portraits (higher detail than the sprites):**
| Asset | Size | Use |
|---|---|---|
| Face icon | 32×32 | Employee Directory grid, HUD, lobby |
| Bust portrait | 96×96 | Character preview, VS screen, Post-Mortem winner |
| Expression set | 96×96 × 4 (neutral, smug, angry, shocked) | Career intros, rival exchanges, ending cards |

The bust portraits are where the anime look shows most: full-size anime eyes with 2–3 highlights, detailed hair strands and blush marks, still drawn in the master palette with the same outline rules.

### 14.4 Character designs
Everyone is drawn as the chibi version of the job's stereotype. The cast is mixed and doesn't follow a single gender or body type.

| Job | Hair and eyes (silhouette hook) | Outfit | Personality | Signature emote |
|---|---|---|---|---|
| Software Engineer | Messy black hair with one **ahoge** strand. Round glasses that glint | Oversized green hoodie with a `{ }` print | Sleepy genius | Glasses glint ✦ when Compiler is ready |
| Mobile Developer | **Backwards cap**, hair with hot-pink tips | Bomber jacket, phone holster | Hyper, always filming | Peace-sign selfie flash on victory |
| QA Analyst | Short bob with **bug-antenna hair clips**. Goggles on the forehead | Lab coat with sleeves past the hands | Deadpan perfectionist | One eye magnified huge through the glass |
| System Analyst | Neat side part, **square glasses** | Sweater vest and tie | Over-organized planner | Lightbulb pops above the head |
| Network Admin | **Spiky hair in Wi-Fi arcs**. Headphones with antennas | Black tee with a neon-green trim | Chill gamer | Signal bars over the head (1–4 by distance) |
| Database Admin | Tiny bun, **big beard**. Gentle eyes | Cardigan, rolled sleeves | Gentle giant | Calmly sips tea during the opponent's Burnout |
| DevOps Engineer | Messy orange hair under a **hard hat** | Hazard vest, tool belt | Sleep-deprived firefighter | Pager buzzing "!!" |
| Cloud Engineer | **Fluffy white cloud hair**, sky-blue eyes | Yellow raincoat | Dreamy airhead | Little clouds float out of the head |
| Technical Support | High ponytail, **headset**. A permanent forced smile | Hi-vis polo, name badge | Customer-service smile hiding rage | 💢 anger vein *while* still smiling |
| Cybersecurity Analyst | **Hood up**. Eyes glow red in the shadow | Black hoodie, face mask | Edgy loner | Eyes glint in the dark |
| Data Scientist | Long hair in a **bun with a pencil**, round glasses | Cardigan with a chart pattern | Calculating gambler | A d20 spins over the head |
| AI/ML Engineer | Silver and purple hair, **visor**. A floating cube-bot sidekick | Lab jacket with circuit lines | Cheerful mad scientist | A loading spinner over the head |
| Business Analyst | Slick hair, a **sticky note stuck to the forehead** | Suit covered in sticky notes | Smug consultant | Toxic-green sparkle when Debt ticks |
| Project Manager | Sharp bob or crew cut, **wristwatch held up** | Navy suit, lanyard | Drill sergeant | ⏰ speech bubble |
| UI/UX Designer | **Beret**, pastel two-tone hair | Paint-stained smock | Perfectionist artist | ✨ sparkle eyes |
| Technical Writer | Long straight black hair, **pen behind the ear** | Turtleneck, ink-stained fingers | Quiet bookworm | "…" speech bubble |
| Vibe Coder | Messy pink and teal hair, **sunglasses** | Oversized hoodie, slippers | Overconfident and chill | ✨ and "lol" |

### 14.5 Fighter sprites and animation
Sprites are drawn in a 48×48 frame. Animations run at **12 fps** (the simulation runs at 60).

| Animation | Frames | Notes |
|---|---|---|
| Idle | 4 | Breathing bob, the weapon moves a little |
| Walk | 6 | |
| Jump / fall | 2 + 2 | |
| Charging | 3 (loop) | The outline flashes white for 1 frame at full charge |
| Tap attack | 3 | |
| Full-charge attack | 5 | 1 frame of anticipation, a smear frame, impact |
| Guard | 2 | |
| Dash | 3 | Afterimage trail using the job's accent color |
| Hurt | 2 | |
| **Burnout** | 4 (loop) | Slumped, gray palette swap, sweat drop, "zzz" |
| KO | 4 | |
| Victory | 6 | |
| Skills | 4–8 each | |

That's about **55–65 frames per fighter** plus skill effects.

**Palette swaps:** the Alt and Gold palettes plus the mirror-match palette are done by **color remapping at runtime** from the master palette, not extra drawings.

### 14.6 Effects and UI
- **Hit sparks:** 3–4 frame chunky bursts, bigger for full charges. Skill effects use each job's effect style (see each job's "Art" line).
- **Screen flash and freeze frame:** on a KO and on full-charge hits (with a reduce-flashing option).
- **Fonts:** a bitmap pixel font with two sizes (8 px for labels, 16 px for big text). Damage numbers use the small one with a 1-px outline.
- **Menus (TechkenOS):** windows drawn as 9-slice pixel frames in the same palette.

### 14.7 Asset pipeline
- **Tools:**
  - **Aseprite** for sprites (about $20, or compile it free from source). LibreSprite is a free alternative.
  - **Tiled** for arenas (free).
- **Export:** Aseprite sprite sheets plus JSON load directly into Phaser (`this.load.aseprite`). Tiled maps export as JSON for Phaser's tilemap loader.
- **Repo layout:**
  - `public/art/palette.hex`
  - `public/art/fighters/<job>.aseprite → .png + .json`
  - `public/art/arenas/<arena>/layer1..5.png + tiles.png + map.json`
- **Production order:**
  1. **Style target first.** One fighter (Software Engineer) fully animated, plus one complete arena (Team-Building Retreat). That locks in the palette, outline and detail level before anything else is drawn.
  2. The other 5 MVP fighters and 3 arenas.
  3. The remaining 11 fighters and 8 arenas, in waves.
- **Scale of the job:**
  - 17 fighters × about 60 frames ≈ 1,000 frames.
  - 17 × (face icon + bust portrait + 4 expressions) = about 100 portraits.
  - About 34 skill-effect sets.
  - 13 arenas × 5 layers.
- **Sound:** see section 15.

---

## 15. Sound and Music

### 15.1 Style: "NES+ chiptune"

**Playable prototype (direction approved 2026-11-23):** https://claude.ai/artifact/LDp6xm7NwjUFG66HWcaRQM. Synthesized chip versions of the arena loop (with the Crunch stem and Burnout muffle), the charge system, about 60 SFX, the announcer stingers and all 17 job motifs and victory jingles.

- **The base is NES-style chip sound:**
  - 2 pulse (square) leads
  - a triangle bass
  - a noise channel for drums
- **Plus a little modern polish**, the "8-bit with modern detail" approach that matches the art:
  - 1–2 extra chip channels (a saw or a second triangle) for harmony
  - light stereo width and a touch of reverb on music only
  - SFX stay dry and punchy
- **Mood:** upbeat, catchy, a bit silly, like an office sitcom scored by an arcade cabinet. Every arena track has a hook you could hum.
- **Tech-office sounds in the chip palette:**
  - keyboard clacks as hi-hats
  - modem screech as a riser
  - notification pings as arpeggios
  - hold music as a running joke

### 15.2 How audio runs in the browser
| Decision | Choice |
|---|---|
| **Music format** | Pre-rendered **OGG + MP3** pair (Phaser picks what the browser supports). Mono or narrow stereo, 32–44 kHz, about 96 kbps. A 90 s loop is about 1.1 MB |
| **Seamless loops** | Each track has an intro and a loop section. Web Audio's `loopStart`/`loopEnd` makes the loop sample-accurate, with no gap |
| **Memory** | Only the current arena's music is decoded. Menu music and stingers stay loaded. Everything else is unloaded when you leave a screen (this matters on phones) |
| **SFX** | Short WAV→OGG/MP3 files, pre-decoded at boot as one **audio sprite** (one file with a time map). That's about 150 sounds in roughly 1–2 MB |
| **Dynamic music** | Each arena track has a second **"Crunch" stem** (extra drums and arpeggio) that plays in sync and fades in when the round timer is ≤ 15 s or either fighter is below 25 % HP |
| **Burnout muffle** | While **you** are burned out, a low-pass filter on the music bus muffles it, and a heartbeat thump plays. This is local only, so in online play your opponent doesn't hear it |
| **Unlock** | Audio starts on the first tap or key (the "Tap to start" boot screen) |
| **iPhone silent switch** | Test early. Safari's `navigator.audioSession` (where available) can request playback-style audio so the game isn't silently muted |

**Rollback-safe sound (important for online):**
- Rollback can re-simulate frames, so sounds are triggered from **game events with an ID** (frame + event type + who caused it).
- An event that's re-simulated with the same ID doesn't play again.
- If a rollback erases an event that already played (a predicted hit that didn't actually happen), its sound is **faded out within 30 ms** instead of playing on.

### 15.3 Music cue list
| Cue | Length | Notes |
|---|---|---|
| **TechkenOS boot chime** | 2 s | A fake OS startup chord, the game's sonic logo |
| **Desktop (main menu)** | 60 s loop | Lo-fi chiptune, relaxed |
| **Employee Directory** | 45 s loop | Upbeat and building. Hovering a job plays its 1-bar leitmotif on top |
| **Meeting Room (lobby)** | 45 s loop | Elevator music, chiptune version |
| **VS sting** | 2.5 s | Hits on the VS slam |
| **Arena themes ×13** | 75–90 s loop each + Crunch stem | One per arena (below) |
| **Round stingers** | 1–2 s | Round start, K.O., Time Up, Double K.O. |
| **Victory jingles ×17** | 3–4 s | Each job's leitmotif as a victory fanfare |
| **Post-Mortem (results)** | 30 s loop | Calm and reflective, a little smug |
| **Sandbox (training)** | 60 s loop | Chill, low energy |
| **Career ladder map** | 30 s loop | "Climbing" motif that rises a step per rung |
| **Inbox Zero (bonus stage)** | 30 s | Frantic, speeds up |
| **Legacy System (boss)** | 3 phases | Phase 1 slow and heavy. Phase 2 adds glitchy arps. Phase 3, Kernel Panic, is fast with an alarm. Phase changes crossfade on a bar line |
| **The Board (secret boss)** | 90 s loop | A pompous corporate march |
| **Ending / credits** | 90 s | Reprise of the Desktop theme, triumphant |

**Arena themes:**
| Arena | Musical idea |
|---|---|
| Open Office | Bouncy major-key groove with keyboard-clack hi-hats and printer-noise snare |
| Server Room | Driving minor-key track with fan-hum pads and blinking-LED arpeggios |
| Startup Garage | Garage-band energy: big triangle bass, "pitch deck" stabs |
| Cloud Region | Airy, floating triangle pads, wind noise sweeps |
| Legacy Basement | Slow, heavy, a little spooky. Punch-card rhythm percussion |
| Tech Expo Hall | Showy fanfare, crowd-cheer noise bursts |
| Coffee Shop | Lo-fi chip jazz. Swing rhythm, espresso-steam noise hits |
| 3 AM War Room | Tense alarm loop, pager-beep motif, the fastest track |
| Home Office | Cozy, gentle. A cat-meow pulse sample appears once per loop |
| Hackathon Night | Synthwave-style chip with a countdown motif |
| Team-Building Retreat | Folk-adventure tune, campfire crackle ambience bed |
| Campus Rooftop | Sunny, open, big melody (the "main theme" candidate) |
| The Terminal | Minimal, competitive. Pure 2A03-style, no extra channels |

### 15.4 Job leitmotifs
Each job has a **1-bar motif** (used on the Employee Directory hover and the VS screen) and a **4-bar version** (its victory jingle). Each one also defines that job's SFX flavor.

| Job | Motif idea |
|---|---|
| Software Engineer | Square lead plus typing-clack rhythm, resolving on a "compile success" chord |
| Mobile Developer | Rising notification-ping arpeggio |
| QA Analyst | A melody that "glitches" (repeats a note, skips a beat), then fixes itself |
| System Analyst | Neat, orderly ascending arpeggio |
| Network Admin | Opens with a modem-handshake noise burst |
| Database Admin | Slow, heavy triangle bass riff |
| DevOps Engineer | Industrial noise-drum loop, siren tail |
| Cloud Engineer | Floating triangle chords |
| Technical Support | **Hold music.** The same tune is its taunt and its win jingle |
| Cybersecurity Analyst | Tense minor arpeggio ending on a "lock" click |
| Data Scientist | A random arpeggio that always lands on the right note |
| AI/ML Engineer | Robotic pulse with a "thinking" bleep pattern |
| Business Analyst | Smug walking bassline |
| Project Manager | Ticking-clock percussion, march rhythm |
| UI/UX Designer | Bright, sparkly major-7th chords |
| Technical Writer | Typewriter clacks ending in a carriage-return "ding" |
| Vibe Coder | Lo-fi beat with a lazy "lol" pitch-bend |

### 15.5 Sound effects list
About **150 sounds**. Every frequently repeated sound gets 2–3 variants plus ±5 % random pitch, so it never sounds like a machine gun.

| Group | Sounds |
|---|---|
| **Charge system** | Charge start, charge loop (rising pitch), **full-charge "ding"** (must be unmistakable), tap swing, tap hit, full swing whoosh, **full hit crunch + impact boom**, guard block thud, **guard break glass-crack** |
| **Movement** | Jump, double jump, land (light / heavy for DBA), dash whoosh, wall splat, platform drop-through |
| **Motivation** | Low-Motivation warning beep (< 20), **Burnout "womp-womp" (the sad Monday jingle)**, Burnout heartbeat, recovery chime, **Crunch Cast alarm** |
| **Round flow** | 3-2-1 countdown, "DEPLOY!", K.O., Time Up, last-10-seconds tick, round-win pip |
| **Items** | Spawn chime, despawn blinking tick, and a pickup sound per item: Coffee slurp, Pizza chomp, Energy Drink can-pop fizz, **Rubber Duck squeak**, Headphones "noise off" swoosh, Keyboard clack, Salary Raise cha-ching, Ergonomic Chair squeak, Certification stamp, Pull Request "merged" chime / **Merge Conflict buzzer**, PTO beach waves, Promotion fanfare |
| **Skills** | 2–3 per job, about 50 total, each in that job's flavor (Semicolon Strike: keystroke snap, DROP TABLE: crash + crowd gasp, Ping: sonar blip, Rain Cloud: drizzle, Escalate to Manager: "excuse me?!" chip grunt, YOLO Deploy: explosion + "lol") |
| **Summons** | Bug skitter, customer grumble (chip "blah blah"), bot beeps, drone hum, pod spawn |
| **Emotes** | Glint "ting", anger-vein pop, sweat-drop plip, zzz snore |
| **UI (TechkenOS)** | Cursor blip, select, back, error "bonk", window open/close, Ready, lobby joined chime, copy-link click, toast pop |
| **Ambience** | One loop per arena: campfire crackle and water, server fans, office murmur, café clatter, rooftop wind |

### 15.6 Announcer: the TechkenOS voice
- **What it is:** a robotic, slightly bitcrushed system voice, the operating system narrating the fight.
- **Lines:**
  - "Round 1… DEPLOY!"
  - "K.O."
  - "Time's up."
  - "Double K.O."
  - "Burnout!"
  - "Perfect review!" (a perfect round)
  - "Overtime."
  - Each job's name on the VS screen.
- **About 30 lines.** Record them yourself and process them (bitcrush plus a slight robot effect), or use a text-to-speech voice whose license allows commercial use.
- **Every announcer line also appears as on-screen text**, so it's never required to hear it.

### 15.7 Mixing rules
- **Buses:** Master → Music / SFX / Announcer / UI, each with its own volume slider. Music sits about 6 dB under SFX by default.
- **Ducking:** music dips −6 dB for 0.5 s on K.O., full-charge hits and announcer lines.
- **Priority and voice limit:** at most 12 simultaneous SFX. Priority order:
  1. announcer
  2. full-charge ding and hit
  3. guard break and Burnout
  4. skills
  5. items
  6. ambience

  When the limit is reached, the lowest priority is cut first.
- **Stereo:** sounds pan gently by the fighter's x-position (at most ±30 %). The "Mono audio" setting turns panning off.
- **Feedback rule:** every gameplay-critical sound (full-charge ready, guard break, Burnout, item spawn, last 10 s) also has a **visual cue** (outline flash, emote, icon), so the game is fully playable muted. That's common on phones.
- **Haptics (Android):** short buzz on the full-charge ding, on being hit by a full charge, and on Burnout.

### 15.8 Tools and production
- **Music:**
  - **FamiStudio** (free, open source, NES-style tracker, exports WAV) is the main tool for authentic chip sound.
  - **BeepBox / JummBox** (free, browser-based) work for fast sketching.
- **SFX:**
  - **jsfxr / sfxr** and **ChipTone** (free) generate chip SFX.
  - **Audacity** (free) for trimming, bitcrushing the announcer and building the audio sprite.
- **Free asset packs:** only use **CC0** packs, such as Kenney's audio packs, so no attribution or license problems.
- **MVP audio set:**
  - menus, VS sting, 4 arena themes with Crunch stems
  - round stingers, 6 victory jingles
  - core combat, Motivation, item and UI SFX
  - the announcer

  That's about 25 music cues and 80 SFX. The rest arrives with later content waves.
- **Cost:** $0 with the free tools above. Commissioning a chiptune composer is optional later.

