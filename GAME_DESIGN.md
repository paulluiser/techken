# TECHKEN — Game Design Doc (v0.2, tuned)

> A 2D 8-bit 1v1 fighting game where every fighter is a tech job.
> All numbers are **first-pass values** to give the system a shape. Tune them in playtests.

---

## 1. Core Rules (gaps filled in)

### 1.1 Match structure
| Rule | Value |
|---|---|
| Format | 1v1, best of 3 rounds (first to 2) |
| Platform / stack | **Browser game** built with **TypeScript + Phaser 3**, deployed on **Vercel**. Runs in desktop and mobile browsers (Chrome, Safari, Firefox, Edge) with nothing to install. Optionally installable as a PWA |
| Perspective | Side view, platform-lite, single screen (see 1.6) |
| Modes at launch | Vs CPU (5 difficulty levels) and Online PvP through lobby codes (see section 6) |
| Round timer | 90 s |
| HP | 1000 for every job. No item or passive raises max HP, so the "equal HP" rule always holds |
| KO | HP hits 0 → the other player scores 1 point |
| Time out | Higher **HP %** wins the round |
| Exact HP tie at time out | **Overtime** (15 s): items stop spawning, the arena walls slowly close in ("Scope Creep"), the first clean hit wins |
| Double KO | Both players score. If that makes it 2–2, play a **Production Incident** tiebreaker: 50 % HP, 45 s, no items |
| Between rounds | HP, Motivation, cooldowns and all buffs reset. Fighters return to their start positions |
| Comeback (optional) | The player who lost the last round starts the next one with a random Common item ("Pity Coffee") |

### 1.2 Basic attacks (charge system)
Basic attacks are **hold to charge, release to swing**. Spamming is weak by design.

| Tier | How | Effect |
|---|---|---|
| Tap | Release before 25 % charge | Low damage, short flinch, **0.5 s recovery** |
| Mid | 25–99 % charge | Scales up linearly |
| Full | Reach 100 % (sprite flashes, sound cue) | Max damage, knockback, **breaks guard**, only **0.3 s recovery** |

- Every job has its own charge time, from 0.5 s to 1.3 s (see the roster table).
- While charging you move at 60 % speed.
- Getting hit while charging **cancels the charge**, unless the job has super armor (DBA).
- You can hold a full charge for up to 1.5 s, then it fires on its own.
- Full charge rewards you with a faster follow-up than tapping does. That is the anti-spam rule.

### 1.3 Motivation and Burnout
| Rule | Value |
|---|---|
| Max Motivation | 100, full at round start |
| Regen | +6/s, starting 1 s after you last spent any |
| On landing a basic hit | +4 |
| On taking a hit | +2 (a small comeback trickle) |
| Spent by | Skills (15–45), Dash (10), Guard (5 per blocked hit) |
| **Burnout trigger** | Motivation reaches exactly 0 |
| **Burnout effect** | 2.0 s: move speed −50 %, **can't attack, cast or dash**. You can still jump and guard, but guard only blocks 40 % |
| Burnout recovery | You come back with 35 Motivation |
| **Crunch Cast** | You *can* cast a skill you can't afford. It fires, and you burn out right away. This is a deliberate all-in move for the last hit |
| Visual | Sprite goes grayscale, sweat drop, "zzz" over the head, a sad "Monday" jingle |

Guard and dash also cost Motivation, so a defensive player can burn out too. Pressure creates burnout, and burnout creates openings.

### 1.4 Defense and movement (shared by all jobs)
- **Move / Jump / Double jump** (DBA and System Analyst: single jump; Cloud Engineer: triple jump).
- **Drop through platforms** with down.
- **Guard** (hold): blocks 70 % of damage, costs 5 Motivation per blocked hit, and you can't move. A full-charge basic breaks guard (0.6 s stagger).
- **Dash**: 0.2 s of invincibility frames, costs 10 Motivation, 1.2 s cooldown.
- **Wall Splat**: the arena is closed, so a full-charge hit into a wall bounces the target off it for a short combo window. This rewards corner pressure.
- **Hitstun**: tap 0.2 s, mid 0.35 s, full = knockback plus 0.5 s.

### 1.5 Skills
- Each job has **1 passive and 2–3 actives**. Keep the cap at 3 actives: mobile has room for about 3 skill buttons.
- **No ultimates / super moves.** Big moments come from combos, Crunch Casts and Burnout punishes.
- Every skill has a **Motivation cost and a cooldown**.
- **Balance rule:** a job with 3 actives has lower numbers per skill than a job with 2.
- Targeted skills (Cloud Engineer and others) use **smart cast**: a tap targets the opponent's position, and holding the button lets you aim (see Controls).

### 1.6 Perspective: platform-lite, single screen
- **Side view. The whole arena fits on one screen, so the camera never scrolls.** Both players always see everything, which fits the 8-bit look and keeps online play fair.
- **Layout:** walls on the left and right, a ceiling, the main floor, and 2–4 **one-way platforms** (jump up through them, press down to drop through).
- **Base resolution 384×216 (16:9)**, scaled up by whole numbers so pixels stay crisp: ×3 = 1152×648, ×5 = 1920×1080, ×10 = 4K. Tiles are 16×16. *(Raised from 320×180 to fit the detailed art style in section 14 with room for platforms.)*
  - Browser windows come in any size, so the canvas uses the largest whole-number scale that fits and fills the rest with black bars (CSS `image-rendering: pixelated`).
- **Fighter size:** a 48×48 frame with a **chibi** body about 40 px tall (about 2.5 heads). DBA is bigger (about 44 px tall) and UI/UX is smaller (about 36 px tall), so the hitbox size matches the job's weight. See 14.3.

---

## 2. Roster Overview

| # | Job | Archetype | Weapon | Range | Full charge | Tap / Full dmg | Speed | Weight | Difficulty |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Software Engineer | All-rounder / combo | Mechanical keyboard (two-handed club) | Mid melee | 0.8 s | 25 / 70 | ●●● | ●●● | ★★ |
| 2 | Mobile Developer | Hit-and-run | Phone on a selfie stick (flail) | Mid | 0.6 s | 20 / 60 | ●●●● | ●● | ★★ |
| 3 | QA Analyst | Debuffer / hunter | Bug net | Mid melee, wide arc | 0.7 s | 20 / 65 | ●●● | ●●● | ★★ |
| 4 | System Analyst | Area control | Telescopic presentation pointer (spear) | Long melee poke | 1.0 s | 25 / 80 | ●●● | ●●● | ★★★ |
| 5 | Network Admin | Zoner | Router that fires signal waves | Long ranged, damage falls to 70 % at max range | 1.0 s | 20 / 70 | ●● | ●● | ★★★ |
| 6 | Database Admin | Grappler / tank | **A literal table** | Short, wide | 1.3 s (super armor) | 35 / 110 | ● | ●●●●● | ★★ |
| 7 | DevOps Engineer | Builder | Pipe wrench | Mid | 0.9 s | 25 / 75 | ●●● | ●●●● | ★★★ |
| 8 | Cloud Engineer | Artillery | Umbrella (glide) | Short melee | 0.9 s | 20 / 60 | ●●● | ● (floaty) | ★★★ |
| 9 | Technical Support | Summoner / pressure | Stack of tickets (thrown) | Short-mid projectile | 0.8 s | 20 / 65 | ●●● | ●●● | ★★ |
| 10 | Cybersecurity Analyst | Defensive / counter | Riot "firewall" shield and baton | Short | 0.9 s | 25 / 70 | ●● | ●●●● | ★★★ |
| 11 | Data Scientist | Ranged / probability | Graph notebook that fires scatter-plot dots | Mid spread shot | 0.8 s | 3×8 / 3×20 | ●●● | ●● | ★★★ |
| 12 | AI/ML Engineer | Summoner (autonomous) | Holo-tablet (weak zap) | Mid | 1.0 s | 15 / 60 | ●●● | ●● | ★★★★ |
| 13 | Business Analyst | Attrition / poison | Requirements binder and sticky notes | Short melee | 0.8 s | 20 / 60 | ●●● | ●●● | ★★ |
| 14 | Project Manager | Controller / tempo | Alarm clock on a chain (flail) | Long melee | 1.0 s | 25 / 75 | ●●● | ●●● | ★★★★ |
| 15 | UI/UX Designer | Rushdown | Stylus rapier | Mid poke, sweet spot at the tip | 0.5 s | 15 / 50 | ●●●●● | ● | ★★★ |
| 16 | Technical Writer | Zoner / trapper | Fountain pen (ink arcs) | Mid arcing projectile | 0.8 s | 20 / 65 | ●●● | ●● | ★★★ |
| 17 | Vibe Coder | Glass cannon / burst | Stickered laptop that fires prompt bubbles | Mid projectile | 0.6 s | 20 / 60 | ●●●● | ●● | ★★ |

**Matchup wheel (rough):**
Rushdown → beats Zoners → beat Grapplers/Tanks → beat Rushdown.
Summoners lose to AoE (DBA's DROP TABLE, Data Scientist's Remove Outliers, Network Admin's Broadcast Storm) and beat slow tanks.

---

## 3. Jobs, with two skill sets each

Format: `Skill (Motivation cost / cooldown)`. They are complete kits, not parts to mix.

**About each job's "Art" line:** every fighter shares one rendering style (section 14), so they look like they belong in the same game. A job's "Art" line describes its **color family and its skill-effect style**. For example, the Software Engineer's effects use a Game Boy green tone ramp, and the Technical Writer's effects are 1-bit ink.

**Set selection:**
- Players pick **job, then Set A or B, every match** at character select.
- Picks are **blind**: both are revealed together when both players press Ready, so nobody can counter-pick after seeing the other's choice.
- **Between rounds, the player who lost the round may switch set** (not job). That's a small adaptation tool for the loser.
- **Real product names stay** (Jira, Kubernetes, Stack Overflow, Figma and so on).

---

### 1. Software Engineer: "Syntax"
- **Art:** Game Boy 4-shade green palette. Skill effects use syntax-highlighting colors (purple keywords, orange strings).
- **Weapon:** Mechanical keyboard swung like a club. Keycaps fly off on full charge.
- **Quirk:** *Syntax chain*. Tap → Tap → Full flows as one chain with no recovery between hits.

**Set A: "Strongly Typed"** (combo builder)
- **Passive, Compiler:** Land 3 hits within 2 s and your next skill "compiles" for +25 % damage. Taking a hit resets it ("Build Failed").
- **`;` Semicolon Strike (20 / 6 s):** A short dash that ends the opponent's current action (interrupts a charge or cast). 45 dmg.
- **`{ }` Brace Cage (30 / 12 s):** Two curly braces slam shut around a zone in front of you. Traps the target for 1.0 s.
- **Recursion (35 / 14 s):** A function projectile that bounces back and forth through the target, up to 3 calls at 30 dmg each.
- **Combo:** Syntax chain fills Compiler → Brace Cage → compiled Recursion hits the caged target 3 times.

**Set B: "Exception Handling"** (patient counter-puncher)
- **Passive, Try/Catch:** After 4 s without taking damage, the next hit on you is "caught": −35 % damage and +10 Motivation.
- **throw Error (20 / 6 s):** A projectile that marks the target "Unhandled" for 4 s. Your next hit on a marked target does +30.
- **finally { } (30 / 16 s):** A 0.8 s counter stance. If you're hit during it, you auto-counter for 80 dmg.
- **Hotfix (25 / 18 s):** Heal 60 HP over 2 s.
- **Combo:** Throw a mark → they rush in to retaliate → `finally` counters → the mark pops. Try/Catch rewards playing patiently.

---

### 2. Mobile Developer: "Everything's on the phone"
- **Art:** Glossy app-icon gradients, rounded pixels, red notification badges everywhere.
- **Weapon:** A phone on a selfie stick, swung like a flail. Full charge fires a camera-flash cone.
- **Quirk:** 2 dash charges (fastest repositioning in the game).

**Set A: "Push Notifications"** (stack and cash out)
- **Passive, Notification Badge:** Every hit adds a red badge to the opponent (max 5).
- **Swipe (20 / 7 s):** A swipe dash through the opponent. 35 dmg and +1 badge.
- **Camera Flash (25 / 12 s):** A cone that "blinds": the opponent's charge speed is −50 % for 3 s.
- **Push Notification (25 / 8 s):** Buzzes all their badges. 20 dmg per badge plus a 0.1 s vibrate-stun per badge.
- **Combo:** Fast basics and Swipe stack 5 badges → Flash stops their retaliation → Push for 100+.

**Set B: "Cross-Platform Release"** (stance switcher)
- **Passive, Cross-Platform:** Each skill you cast swaps your stance. **iOS:** +15 % damage. **Android:** +15 % speed. The palette changes to match.
- **Deploy to Device (30 / 12 s):** Throw your phone as a turret (80 HP, 6 s) that fires a 12-dmg tap at the opponent every second.
- **Hot Reload (25 / 16 s):** Teleport to where you were 3 s ago and recover 50 % of the HP you lost in those 3 s.
- **Combo:** Drop the turret (stance swap) → fight near it → Hot Reload undoes a bad trade (swap back).

---

### 3. QA Analyst: "Finds your weaknesses"
- **Art:** White lab coat, bug-green and warning-yellow palette, magnifying-glass glint, CRT scanlines on effects.
- **Weapon:** Bug net with a wide arc. Full charge can "net" a summon and destroy it.
- **Quirk:** Can always see the opponent's skill cooldowns on the HUD.

**Set A: "Exploratory Testing"** (expose and punish)
- **Passive, Found a Bug:** Every 4th hit on the opponent exposes a **Weak Spot** for 5 s: they take +20 % damage.
- **Magnify (20 / 8 s):** A scanning beam. Applies Weak Spot right away.
- **Release the Bug (30 / 15 s):** Summon a pixel bug (60 HP) that chases, bites for 15/s and slows 20 %.
- **Reopen Ticket (35 / 18 s):** Puts the opponent's last-used skill back on its full cooldown.
- **Combo:** Magnify → Weak Spot → the bug and a charged net hit for +20 %. Reopen Ticket shuts down their escape skill.

**Set B: "Bug Bounty"** (burnout hunter)
- **Passive, Edge Case:** +25 % damage against opponents who are airborne, against a wall, or in Burnout.
- **Bug Net (20 / 9 s):** Throw a net for 30 dmg. A catch roots for 1 s.
- **Infestation (35 / 18 s):** Plant 3 bug eggs on the floor as traps. Stepping on one hatches a bug that clings and drains 5 Motivation/s for 3 s.
- **Combo:** Eggs and the cling drain push them toward Burnout → Net them → Edge Case damage during Burnout.

---

### 4. System Analyst: "Designs the battlefield" *(brainstormed)*
Theme: flowcharts, UML, swimlanes, requirements, as-is/to-be.
- **Art:** Blueprint style. A blue-tinted sprite with white outlines and dotted-line effects.
- **Weapon:** Telescopic presentation pointer, used like a spear for long pokes.
- **Quirk:** Single jump only. Full charge pierces 50 % of guard.

**Set A: "Flowchart"** (node network)
- **Passive, Decision Node:** Every skill you cast leaves a ◇ node where you stand (max 3). Nodes connect with lines. An opponent who crosses a line takes 20 dmg and a short slow.
- **Arrow Connector (20 / 6 s):** Zip along an arrow to any node, hitting everything on the path for 55.
- **Swimlane (30 / 14 s):** A vertical lane wall for 5 s. Blocks movement and projectiles, and stuns anyone it pops up on for 0.3 s.
- **Combo:** Build a triangle of nodes → Swimlane cuts off the exit → zip node to node through them.

**Set B: "Requirements Gathering"** (adapts to the opponent)
- **Passive, Stakeholder Interview:** Each *different* skill the opponent hits you with gives 1 Insight (max 3). Each Insight is +8 % damage for the round.
- **Change Request (20 / 12 s):** Swap positions with the opponent.
- **UML Box (30 / 15 s):** Draws a class box around the opponent. If they don't get out within 1 s, they're "Encapsulated" (stunned 1 s).
- **Gap Analysis (25 / 10 s):** Measures the gap between you. If they retreat and widen it within 4 s, they take 70.
- **Combo:** Change Request puts them in the corner → UML Box → Gap Analysis punishes the escape.

---

### 5. Network Admin: "Signals"
- **Art:** Black background with neon-green phosphor, scanlines, and signal bars over the head.
- **Weapon:** A router whose antennas fire signal waves. Damage drops with distance (1–4 bars).
- **Quirk:** The slowest walker, with the best long range.

**Set A: "Full Bars"** (fight near your router)
- **Passive, Access Point:** Place a router at round start. Within its radius you have full bars: +20 % damage and +50 % Motivation regen.
- **Ping (15 / 4 s):** A fast pulse for 20 dmg. On hit it also adds "lag": their next action comes out 0.2 s late.
- **Packet Loss (30 / 14 s):** A field for 5 s. Projectiles passing through are destroyed, and the opponent's attacks inside do −30 %.
- **Relocate AP (20 / 10 s):** Teleport the router to your position.
- **Combo:** Hold ground near the AP → Pings add lag → Packet Loss shuts down their zoning. Relocate when they push you out.

**Set B: "Traffic Control"** (lockdown)
- **Passive, Bandwidth:** Every hit fills a bandwidth meter. When it's full, your next skill is "Broadcast": bigger area, +30 % damage.
- **Throttle (30 / 15 s):** Tether to the opponent for 4 s. They are −35 % speed and you are +15 %. Breaking the range snaps the tether for 60 dmg.
- **Signal Jam (20 / 12 s):** A wave that silences skills for 2 s.
- **Broadcast Storm (40 / 20 s):** Three screen-wide pulse waves, 45 dmg each. Jump to avoid them.
- **Combo:** Throttle → Jam (they can't skill out) → Broadcast Storm while they're slowed.

---

### 6. Database Admin: "The Heavy" *(brainstormed)*
Theme: tables, queries, locks, JOIN, ROLLBACK, DROP TABLE, backups.
- **Art:** Chunky, the biggest sprite. Brown and tan palette, with spreadsheet-grid effects.
- **Weapon:** A literal table, swung like a hammer.
- **Quirk:** Super armor on full charge. Light hits don't flinch. Single jump. Slowest speed.

**Set A: "ACID"** (grappler)
- **Passive, Backup:** Snapshots your HP every 20 s (a ghost bar on the HUD).
- **SELECT * FROM (25 / 10 s):** A query beam pulls the opponent to you (command grab, mid range).
- **Table Lock (30 / 15 s):** Locks the opponent in place for 1 s, or 1.5 s (the hard-CC cap) if you just pulled them.
- **ROLLBACK (35 / 22 s):** Restores your HP to the last snapshot, up to +150.
- **Combo:** SELECT pulls them in → Table Lock → full-charge table slam. ROLLBACK covers the damage you took getting in.

**Set B: "Destructive Queries"** (bruiser)
- **Passive, Indexed:** Each hit on the same opponent gives −10 % charge time (max −40 %). Resets after 4 s without a hit.
- **JOIN (25 / 12 s):** Links both fighters for 4 s. 40 % of the damage either one takes is mirrored to the other. The tank wins that trade.
- **DROP TABLE (45 / 24 s):** Leap and slam. 150 AoE damage, and it destroys summons and placed objects. Your table is gone for 4 s, so your basics become weak punches.
- **Combo:** JOIN → quick hits stack Indexed → DROP TABLE as the finisher. Also the hard counter to summoners.

---

### 7. DevOps Engineer: "Automates the fight" *(brainstormed)*
Theme: CI/CD, containers, pods, rollbacks, on-call pagers, "works on my machine".
- **Art:** Hazard orange and black stripes, an industrial pipes-and-steam look.
- **Weapon:** Pipe wrench.
- **Quirk:** Builds structures (with HP) that both players can stand on.

**Set A: "CI/CD Pipeline"** (builder)
- **Passive, Pipeline:** Each skill fills a stage (Build → Test → Deploy). When all 3 are full you're **Deployed** for 5 s: +20 % charge speed and ×2 Motivation regen.
- **Container (25 / 12 s):** Drop a shipping container (150 HP) that works as a wall or platform.
- **Conveyor (30 / 15 s):** Lay a belt on the floor for 6 s that pushes the opponent in a direction you choose.
- **Push to Prod (30 / 14 s):** A container drops from the sky at a target spot after 1 s. 100 dmg.
- **Combo:** Conveyor pushes them into the Container wall → Push to Prod lands → Deployed buff for the follow-up.

**Set B: "On-Call"** (reactive)
- **Passive, Monitoring:** Every time the opponent casts a skill, you get an alert ping and +8 Motivation.
- **Pod Replicas (35 / 18 s):** Spawn 2 mini clones (40 HP each) that copy your basics at 30 % damage for 6 s. Each pod restarts once when it dies.
- **Rollback Deploy (25 / 14 s):** Cleanse all debuffs and return to your position from 2 s ago.
- **Works on My Machine (20 / 10 s):** Ignore the next status effect within 3 s.
- **Combo:** The opponent's skills feed your Motivation → Pods triple your charged basics → Rollback if the push fails.

---

### 8. Cloud Engineer: "Literally clouds, strikes anywhere"
- **Art:** Pastel sky dithering, fluffy whites, a soft sprite with no black outline.
- **Weapon:** An umbrella. Hold jump to glide.
- **Quirk:** Triple jump and glide. Weak up close.

**Set A: "Weather Forecast"** (artillery)
- **Passive, Auto-Scaling:** Your clouds grow 20 % bigger every second they're alive.
- **Rain Cloud (20 / 7 s):** Target anywhere. It rains 20/s for 3 s and makes the target "Wet".
- **Lightning Strike (35 / 14 s):** Target anywhere. A 0.8 s warning, then 100 dmg, or **200 against a Wet target**.
- **Cumulus (15 / 8 s):** Spawn a solid cloud platform anywhere for 5 s.
- **Combo:** Rain → Wet → Lightning. Cumulus gives you height to kite from.

**Set B: "Multi-Region"** (anchors)
- **Passive, High Availability:** Once per round, lethal damage fails you over to a living cloud anchor with 100 HP. With no anchor alive, nothing happens.
- **Deploy Region (15 / 10 s):** Place a cloud anchor anywhere (max 2, 60 HP each).
- **Serverless Strike (30 / 12 s):** A cloud fist launches from *every* anchor at the opponent, 60 each.
- **Cold Start (25 / 16 s):** A hail cloud anywhere: 30 dmg, and slows 40 % for 3 s.
- **Combo:** 2 anchors give a crossfire. Cold Start makes them hard to dodge. Anchors are also your extra life, so the opponent has to choose between chasing you and destroying them.

---

### 9. Technical Support: "Customers and Tickets"
- **Art:** Hi-vis yellow polo, blue headset, comic-strip "!!!" speech bubbles over customers.
- **Weapon:** A stack of tickets. Tap throws one ticket, full charge throws a stapled bundle.
- **Quirk:** Taunt plays hold music (cosmetic, very annoying).

**Set A: "Escalation"** (summoner)
- **Passive, CSAT Score:** Each hit by your customers adds a ★ (max 5). At 5★ your next summon comes already escalated and costs 0.
- **Angry Customer (30 / 12 s):** Summon a customer (100 HP, 8 s) who chases and shoves for 20 dmg. Max 2.
- **Escalate to Manager (35 / 20 s):** Turn a living customer into a **Manager** (250 HP) with a 60-dmg slam that stuns 0.8 s, and a shouting cone. With no customer alive, it summons a normal one.
- **Ticket Barrage (15 / 5 s):** 3 tickets in a fan, 20 each.
- **Combo:** Customers pressure → ★ builds → a free Manager. Barrage covers your approach.

**Set B: "Help Desk"** (burnout pressure)
- **Passive, Turn It Off and On Again:** Once every 25 s, a CC or debuff applied to you is cleansed after 0.3 s (a quick "reboot" animation).
- **Put on Hold (25 / 10 s):** A hold-music field for 3 s. Inside it, the opponent has **no Motivation regen** and skills cost +10.
- **Mass Ticket (35 / 16 s):** 6 tickets rain from the top of the screen over 2 s, 20 dmg each.
- **Customer Mob (40 / 20 s):** 3 small customers stampede across the floor, 30 dmg each. Jump to avoid them.
- **Combo:** Put them on Hold → they can't afford skills → Mob and Mass Ticket force guard and dash, which costs Motivation → Burnout.

---

### 10. Cybersecurity Analyst: "Defense and reflection"
- **Art:** Monochrome black with one red accent, hoodie, padlock motifs.
- **Weapon:** A riot "firewall" shield and a baton.
- **Quirk:** Guard blocks 85 % (not 70 %), and the first block every 3 s costs no Motivation. Slowest dash.

**Set A: "Defense in Depth"** (layers)
- **Passive, Hardened:** Every 5 s without being hit, gain a shield layer that absorbs 30 (max 3).
- **Firewall (25 / 12 s):** A wall in front of you for 4 s. Blocks projectiles and summons, and your own attacks pass through it.
- **Mirror Protocol (30 / 15 s):** A 1 s window that reflects 100 % of projectiles and 50 % of melee damage.
- **Patch (20 / 14 s):** Restore all shield layers right away.
- **Combo:** Patch to full layers → bait aggression → Mirror Protocol. Firewall hard-counters zoners.

**Set B: "Red Team"** (trickster defense)
- **Passive, Threat Intel:** After reflecting or blocking 3 attacks, your next basic is instantly fully charged.
- **Honeypot (25 / 14 s):** Place a fake item that looks like a real buff. Picking it up stuns for 1 s.
- **Zero-Trust Bubble (30 / 16 s):** A 3 s bubble that absorbs damage, then explodes for 50 % of what it absorbed.
- **Encrypt (20 / 12 s):** Your sprite scrambles for 2 s. Their homing and targeted skills lose lock.
- **Combo:** Honeypot near a real item spawn → stun → instant full-charge from Threat Intel.

---

### 11. Data Scientist: "Probability" *(brainstormed)*
Theme: regression, outliers, sampling, confidence intervals, p-values, overfitting.
- **Art:** A rainbow chart palette of categorical dots, graph-paper background effects.
- **Weapon:** A notebook that fires scatter-plot dots in a 3-dot spread.
- **Quirk:** Damage has ±20 % variance, and big rolls show as critical hits.

**Set A: "Predictive Model"** (data-driven sniper)
- **Passive, Training Data:** Each hit adds a data point (max 10). More data means bigger skill hitboxes. At 10 you have a **Trained Model**: +15 % crit chance.
- **Linear Regression (25 / 8 s):** A 60-dmg line projectile aimed where the opponent *will be* in 0.5 s, based on their movement.
- **Confidence Interval (30 / 14 s):** A shaded band for 3 s. Every hit on a target inside it is a crit.
- **Combo:** Spread shots collect data → Regression snipes → Confidence Interval cashes in guaranteed crits.

**Set B: "Monte Carlo"** (gambler)
- **Passive, Regression to the Mean:** Your damage rolls 50–150 %. Three below-average rolls in a row make the next hit a guaranteed 200 %.
- **Random Sample (20 / 7 s):** 5 dots appear at random points around the opponent, then converge on them, 18 dmg each.
- **p < 0.05 (30 / 15 s):** Your next 3 attacks roll twice and keep the better result.
- **Remove Outliers (35 / 18 s):** Deletes every enemy summon and trap in a wide area, and does 80 if it hits the opponent.
- **Combo:** p-hack buff → Random Sample. Remove Outliers is your answer to summoners and trappers.

---

### 12. AI/ML Engineer: "The bot does the work"
- **Art:** Purple and magenta holographic glitch with chromatic-aberration pixels. The bot is a one-eyed cube.
- **Weapon:** A holo-tablet that fires a weak zap. Personally weak and slow to charge.
- **Quirk:** Bots move autonomously and have their own AI. Hardest to play well.

**Set A: "Reinforcement Learning"** (one strong bot)
- **Passive, Learning Rate:** The bot gains XP when it hits. **Lv2:** +HP and damage. **Lv3:** unlocks a laser beam. Resets each round.
- **Deploy Model (30 / 15 s after it dies):** Summon the Bot (150 HP, bites for 12 dmg/s). While it's alive, recasting tells it to dash at the opponent (10 Motivation).
- **Fine-Tune (20 / 10 s):** The bot gets +1 level for 6 s, or heals 50 % if it's already Lv3.
- **Hallucinate (25 / 12 s):** The bot projects 2 decoys of you for 3 s.
- **Combo:** The bot pressures → decoys confuse who to hit → Fine-Tune for a Lv3 laser burst.

**Set B: "Multi-Agent"** (swarm)
- **Passive, Orbit:** Up to 3 tiny agent drones orbit you and fire an 8-dmg shot whenever you release a basic.
- **Spawn Agent (20 / 6 s):** +1 drone (30 HP), max 3.
- **Agentic Loop (35 / 16 s):** Drones leave orbit and hunt the opponent on their own for 5 s, each firing every 0.5 s.
- **Prompt Injection (30 / 18 s):** Hijack an enemy summon or turret for 5 s. With none on the field, the opponent's left and right controls flip for 1.5 s.
- **Combo:** 3 drones → each charged basic is a 4-hit volley → Agentic Loop for an off-screen pincer.

---

### 13. Business Analyst: "Technical Debt"
- **Art:** A corporate gray suit and toxic-green debt sludge dripping off spreadsheet cells.
- **Weapon:** A requirements binder (melee) and sticky notes.
- **Quirk:** Even tap attacks apply 1 Debt, so tapping has a purpose for this job.
- **Debt (both sets):** each stack deals 1 dmg/s (max 10 stacks unless the set says otherwise). Debt fades one stack every 4 s if no new Debt was applied.

**Set A: "Compound Interest"** (DoT stacker)
- **Passive, Interest:** Every 6 s, +1 Debt stack accrues as interest (Debt max 8 in this set). **Counterplay:** each hit the opponent lands on you pays off 1 stack.
- **Quick Workaround (20 / 6 s):** A sticky-note throw. +3 Debt.
- **Scope Creep (30 / 14 s):** A zone that slowly grows for 5 s. Inside it: +1 Debt/s and −20 % speed.
- **Due Date (40 / 22 s):** Calls in the debt. Consumes every stack for 20 dmg each.
- **Combo:** Stack debt → let interest grow while you play keep-away → Due Date at 6–8 stacks for 120–160.

**Set B: "Morale Drain"** (burnout specialist)
- **Passive, Debt Fatigue:** Each Debt stack lowers the opponent's Motivation regen by 6 % (max −40 %).
- **Legacy Code (25 / 10 s):** A spaghetti-code puddle for 6 s. Standing in it builds Debt.
- **Deprioritize (30 / 15 s):** Adds +2 s to all of the opponent's current cooldowns.
- **Stakeholder Sign-off (30 / 16 s):** Self-buff for 4 s: immune to slow, and heal 4 HP/s per Debt stack on the opponent.
- **Combo:** Puddle stacks debt → their regen falls apart → Deprioritize → they Burn Out trying to keep up.

---

### 14. Project Manager: "Tickets and timelines"
- **Art:** A navy suit. Each skill effect is a colored Gantt bar, with clocks and calendar pages.
- **Weapon:** An alarm clock on a chain. The flail wraps around and can hit behind you.
- **Quirk:** Very high skill ceiling built around timing.

**Set A: "Sprint Board"** (ticket burst)
- **Passive, Velocity:** Each skill that lands gives a Velocity stack (max 4): −5 % cooldowns each. Burnout resets it.
- **Assign Ticket (20 / 6 s):** A ticket sticks to the opponent and moves To Do → In Progress → Done over 3 s. On Done it does 70. Each hit you land moves it one column sooner. If they hit you first, it becomes **Blocked** and fizzles.
- **Code Freeze (35 / 22 s):** Freezes the opponent for 1.2 s.
- **Rewind Sprint (30 / 18 s):** Snaps the opponent back to where they were 3 s ago and cancels their current action.
- **Combo:** Assign → Code Freeze → two quick hits push it to Done → Velocity shortens your cooldowns.

**Set B: "Timeline Control"** (tempo)
- **Passive, Crunch Time:** In the last 30 s of a round you get ×1.5 Motivation regen, and Burnout doesn't slow you.
- **Move the Deadline (25 / 14 s):** A slow-time bubble for 4 s. The opponent and projectiles inside move −40 %.
- **Fast-Track (25 / 14 s):** Haste yourself for 4 s: +35 % speed and charge speed.
- **Push to Backlog (35 / 18 s):** Disables the opponent's last-used skill for 5 s.
- **Combo:** Slow them, haste yourself, backlog their escape tool. You get stronger as the timer runs down.
- *Spicy option:* **Extend Sprint**. Once per round, add or remove 5 s from the round clock.

---

### 15. UI/UX Designer: "Pixel-perfect rushdown" *(brainstormed)*
Theme: wireframes, grids, A/B tests, drag and drop, "make it pop", user flows.
- **Art:** Flat design. Bright pastels, **no outlines**, and the smoothest animations in the game (more frames).
- **Weapon:** A stylus used as a rapier. Fast, low-damage pokes.
- **Quirk:** The fastest fighter. Can cling to walls and wall-jump. Lightest, so they get knocked the farthest.

**Set A: "Design System"** (precision)
- **Passive, Pixel Perfect:** Hitting with the exact tip of the rapier (the sweet spot) does +35 % and refunds 5 Motivation.
- **Wireframe (25 / 10 s):** Leave a wireframe outline of yourself. Recast within 4 s to teleport back to it.
- **Drag & Drop (30 / 14 s):** Grab the opponent and drop them in a direction you choose for 40 dmg. Into a wall gives a Wall Splat.
- **Make It Pop (35 / 16 s):** A 5-stab flurry, 15 dmg each. The last stab pops them away for knockback.
- **Combo:** Wireframe → dive in → Drag & Drop into the wall → Make It Pop → teleport out to the Wireframe.

**Set B: "User Flow"** (momentum)
- **Passive, Flow State:** Each hit in a row without getting hit gives +5 % speed (max +25 %).
- **Grid Snap (20 / 8 s):** Blink to the next grid point in a direction. Your next attack crits.
- **A/B Test (30 / 15 s):** Split into A and B. One is fake and pops on any hit.
- **Color Picker (30 / 18 s):** Copy the opponent's last-used skill and cast it at 60 % power.
- **Combo:** Grid Snap in → flurry builds Flow → A/B Test to escape their punish. Color Picker turns their own toolkit against them.

---

### 16. Technical Writer: "The pen is mightier" *(brainstormed)*
Theme: manuals, RTFM, redacted, footnotes, red pen, track changes, typos.
- **Art:** 1-bit black ink on cream paper with typewriter-font effects. The writer is drawn like an ink sketch.
- **Weapon:** A fountain pen that flicks ink in an arc. Full charge leaves an ink blot puddle.
- **Quirk:** Words written on screen become real terrain.

**Set A: "The Manual"** (control)
- **Passive, Documented:** The first time the opponent uses each skill on you, it gets logged. You take −15 % damage from logged skills for the rest of the round.
- **RTFM (25 / 10 s):** Throw a heavy manual. 80 dmg and a knockdown.
- **Redact (30 / 16 s):** A black bar slams over the opponent and silences their skills for 2 s.
- **Footnote* (20 / 8 s):** Place a tiny asterisk mine (max 2). It detonates for 50 when touched.
- **Combo:** Footnotes on their approach path → RTFM knockdown onto a mine → Redact stops their comeback.

**Set B: "Red Pen"** (terrain)
- **Passive, Track Changes:** Your ink puddles give you +15 % speed and slow the opponent 15 %.
- **Write a Paragraph (20 / 10 s):** Write a text block that becomes a solid wall or platform for 6 s.
- **Strikethrough (25 / 9 s):** A horizontal line across the whole screen at your height. 65 dmg, and it cancels projectiles.
- **Typo (30 / 14 s):** Curses the opponent. Their next skill misfires in the wrong direction.
- **Combo:** Paragraph platforms put you above them → Strikethrough on a level they can't jump → Typo wrecks their answer.

---

### 17. Vibe Coder: "Burst, then rate-limited"
- **Art:** Vaporwave pink and teal dithered gradients, sunglasses, an oversized hoodie, sparkle effects on every skill.
- **Weapon:** A laptop covered in stickers that fires glowing prompt bubbles.
- **Quirk:** A **second resource, Tokens (100).** Skills cost Tokens *plus* a small Motivation cost, so Burnout still applies. Tokens regen 10/s only after 2 s of casting no skills. **At 0 Tokens you're Rate Limited for 5 s:** skills are disabled, you do −30 % damage, you take +15 % damage, and then Tokens refill fully.

**Set A: "Prompt & Pray"** (pure burst)
- **Passive, Context Window:** The first skill after a full Token bar does +30 % damage.
- **Generate (35 Tok + 10 M / 4 s):** A big code-blast projectile. 80 dmg.
- **Accept All Changes (45 Tok + 10 M / 12 s):** A 6-hit auto-dash flurry, 18 each. You can't steer it.
- **Regenerate (20 Tok + 5 M / 6 s):** Re-casts your last skill at 60 % power. 25 % chance it **hallucinates** and fires in a random direction.
- **Combo:** Full bar → Generate (+30 %) → Accept All → Regenerate for about 280 burst in 3 s. The full combo costs exactly 100 Tokens, so you're Rate Limited right after and very vulnerable.

**Set B: "Ship It Friday"** (sustain the vibe)
- **Passive, Vibes:** Every hit you land refunds 5 Tokens. Every hit you take costs 5 Tokens.
- **Autocomplete (20 Tok + 5 M / 3 s):** A homing tab-key projectile. 35 dmg.
- **YOLO Deploy (50 Tok + 15 M / 15 s):** An explosion around you. 150 dmg to them, 50 to you.
- **Touch Grass (no cost / 16 s):** Sit on grass for 1.5 s, rooted and open to hits, and refill Tokens completely. Can't be used while Rate Limited.
- **Combo:** Land Autocompletes to keep Tokens up → YOLO Deploy at close range → Touch Grass in a safe moment to reset.

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

All arenas are closed (walls on both sides and a ceiling). Each has a **main floor, 2–4 platforms, one terrain gimmick and one hazard**.
- There's a "Hazards OFF" toggle for competitive play.
- One flat "Terminal" map is always available.

| Arena | Look | Terrain | Hazard (toggleable) |
|---|---|---|---|
| **Open Office** (starter) | Cubicles and fluorescent lights | Desks as platforms. A rolling chair you can ride by dashing onto it | The printer jams every 30 s and sprays paper projectiles |
| **Server Room** | Blue LEDs, rack rows | Raised floor. Cable trays as platforms. Hot-aisle vents launch you up | **Power outage:** 4 s of near-darkness, only silhouettes visible |
| **Startup Garage** | Whiteboards, ping-pong table | Beanbags bounce you. The ping-pong table is a platform | **Funding Round:** an item rain (3 items at once) |
| **Cloud Region** | Literally above the clouds | Drifting cloud platforms. Soft floor | Wind gusts push everyone sideways |
| **Legacy Basement** | A green-screen mainframe, dripping pipes | Punch-card conveyor belts | Spaghetti-cable patches on the floor slow movement |
| **Tech Expo Hall** | Booths, banners, a stage | Booths as platforms | A stage spotlight wanders. Standing in it gives +15 % damage |
| **Coffee Shop** | Warm lofi café | Tables and the counter as platforms | Coffee spawns twice as often. Wi-Fi drops (Network Admin's AP turns off for 5 s) |
| **3 AM War Room** | Red alert monitors, empty pizza boxes | Desk clusters | **"Prod is down" siren:** every 30 s, both players lose 15 Motivation |
| **Home Office** | Bedroom, bed, desk | The bed bounces you. A shelf platform | A cat walks across and blocks the first attack it touches. The doorbell drops a delivery item |
| **Hackathon Night** | Dim lights, laptops, energy cans | Stacked tables | The lights dim more as the timer runs down |
| **Team-Building Retreat** | Pine forest, lake, waterfall, full moon at night | Log platforms, a rock ledge, the lake shore | A campfire in the middle burns 10 dmg/s. A "trust fall" platform drops whoever stands on it for 3 s |
| **Campus Rooftop** | Bright daytime sky, puffy clouds, glass office towers | Rooftop AC units and a water tower as platforms | A window-cleaning gondola slides across one platform level |
| **The Terminal** (competitive) | Black and green code space | One flat floor, two symmetric platforms | None |

**Job and map synergy:** Cloud Engineer likes Cloud Region, Network Admin hates Coffee Shop, DevOps likes the Legacy Basement conveyors. This gives map picks some strategy (the loser of a round picks the next map?).

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
| 1 | Intern | 600 ms | Walks straight in and taps basics. Rarely guards, uses skills at random, often burns out |
| 2 | Junior | 400 ms | Sometimes charges its basics, uses skills as soon as they're off cooldown, guards about 20 % of the time |
| 3 | Mid-level | 280 ms | Charges to full, guards and dashes, stops spending below 25 Motivation, goes for items |
| 4 | Senior | 200 ms | Plays its set's combo, punishes your Burnout and missed full charges, plays around your cooldowns |
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

### 7.1 Desktop browser: keyboard
All keys can be rebound. While a match is running, the game stops Space and the arrow keys from scrolling the page. No action uses Ctrl/Cmd shortcuts the browser already reserves (like closing the tab).

| Action | Key |
|---|---|
| Move | A / D |
| Jump / Double jump | W or Space |
| Crouch / drop through platform | S |
| **Basic attack (hold to charge)** | J |
| Guard (hold) | K |
| Dash | L (or double-tap a direction) |
| Skill 1 / 2 / 3 | U / I / O |
| Pause / menu | Esc. In online matches this opens the menu without pausing the game |

**Targeted skills on PC:** tap = smart cast at the opponent's position. Hold = a reticle appears on the opponent, you move it with the movement keys, and release to cast.

**Optional mouse scheme:** left click = attack (hold to charge), right click = guard, Q/E/R = skills aimed at the cursor, Shift = dash.

### 7.2 Gamepad
| Action | Button |
|---|---|
| Move | Left stick or D-pad |
| Jump | A / Cross |
| Attack (hold) | X / Square |
| Dash | B / Circle |
| Guard | R1 |
| Skill 1 / 2 / 3 | Y / L1 / R2 |
| Aim a targeted skill | Right stick while holding the skill button |

Gamepads work in the browser through the Gamepad API (Chrome, Edge, Firefox and Safari).

### 7.3 Mobile browser (landscape)
```
 ┌───────────────────────────────────────────────────────────┐
 │ [P1 HP ███████░░] [⏱ 72] [░░███████ P2 HP]          [II] │
 │ [Motivation ████░]                   [░████ Motivation]  │
 │                                                           │
 │                     (game view)                           │
 │                                            (S1)           │
 │                                        (S2)    (S3)       │
 │    ╭───╮                           [GUARD]                │
 │   ( ◎  )  ← floating joystick           (  ATTACK  )      │
 │    ╰───╯                          [DASH]       [JUMP]     │
 └───────────────────────────────────────────────────────────┘
```
- **Left thumb:** a floating joystick that appears where your thumb lands. An 8-bit D-pad is available as an option.
- **Right thumb:** a big **ATTACK** button. Holding it fills a **radial charge ring**, which also shows on the character, and a full charge gives a haptic buzz.
- **Skill buttons** sit in an arc above Attack. They show a cooldown sweep and their Motivation cost, and turn gray when you can't afford them. **Long-press a gray skill to Crunch Cast** (red warning flash).
- **Targeted skills:** tap = smart cast on the opponent. **Drag from the skill button to aim, release to cast** (MOBA-style). Drag back to the button to cancel.
- **Swipe anywhere on the right half** = dash in that direction. It's an alternative to the Dash button.
- Fighters always face the opponent automatically.
- Accessibility:
  - Buttons are at least 56 pt.
  - The layout is editable, with a mirrored layout for left-handed players.
  - Haptics can be turned off.
  - Optional **Hold-to-Charge Assist**: tap twice to auto-charge to full.
- The thumb controls cover the lower corners of the screen, so map design keeps platforms and item spawn points out of those corners.

**Mobile browser specifics:**
- **Touch handling:** the canvas blocks pinch-zoom, double-tap zoom, pull-to-refresh, long-press menus and text selection (`touch-action: none`, `user-select: none`).
- **Orientation:** a page can't force landscape on iPhone, so portrait shows a "rotate your phone" screen.
- **Fullscreen:**
  - Android Chrome: a fullscreen button, with landscape locked while fullscreen.
  - iPhone Safari doesn't allow fullscreen for games. Instead, players are prompted to **Add to Home Screen** (PWA), which opens without browser bars.
- **Haptics:** the Vibration API works on Android but not iPhone, so haptics are a bonus, never required feedback.
- **Audio:** browsers block sound until the first tap, so the title screen says "Tap to start".

**Design constraint from mobile:** at most 3 active skills per job, and no input motions (no quarter-circles). Every skill is one button.

---

## 8. Balance Framework

- **Equal HP (1000)** for everyone. Jobs are balanced through damage, speed, weight, range and charge time instead.
- **Power budget:** score every kit on DPS potential, burst, control seconds (stun/root/silence), mobility and sustain. Jobs high on one axis must be low on another. Examples:
  - DBA: high burst and sustain, the lowest mobility.
  - UI/UX: the highest mobility, the lowest per-hit damage.
- **Caps:**
  - Hard CC (stun, freeze, root) never exceeds 1.5 s.
  - A target can't be hard-CC'd again for 1 s after a hard CC ends (**CC immunity window**), to prevent infinite lockdowns.
- **Summons** always have HP, a lifetime and a max count, and AoE skills can destroy them.
- **Three-skill jobs** get about 15 % less power per skill than two-skill jobs.
- **Every set needs counterplay.** For each skill, write down "how does the opponent answer this?" (for example, Debt is paid off by hitting the BA).
- **Track in playtests:** win rate per job and set, average round length (target 45–75 s), how often rounds time out, and Burnout frequency (target: about 1–2 per round per player).

---

### 8.1 Status effects and global rules (v0.2)
| Effect | Category | Rule |
|---|---|---|
| Stun, Root, Freeze, Trap, Lock, Encapsulate, "Stuck in a meeting", Inverted controls | **Hard CC** | **Max 1.5 s.** Afterwards the target is immune to hard CC for 1 s |
| Silence (Signal Jam, Redact) | **Silence** | Blocks skills, not basics or movement. **Max 2 s**, followed by 1 s of silence immunity |
| Slow | **Soft CC** | **Max 40 %.** Slows don't stack: the strongest one applies |
| Cooldown push (Reopen Ticket, Deprioritize, Push to Backlog) | **Denial** | Enemy effects can add at most +5 s in total to any one cooldown |
| Debt, bites, rain | **Damage over time** | Ticks every 0.5 s. Guard doesn't block it |
| Critical hit | **Crit** | **×1.5 damage.** Crit sources: Data Scientist passives, Confidence Interval, Grid Snap |
| Summons, turrets, anchors | **Entities** | Each has HP and a lifetime. AoE skills and full-charge basics hit them. Caps are per skill as listed |

### 8.2 Tuning model
- [`design/kit_budget.py`](design/kit_budget.py) scores every kit's power per second. It adds up:
  - damage from basics
  - damage from skills, limited by how much Motivation (or Tokens) the kit can afford
  - damage from passives
  - sustain (healing and shields)
  - hard CC, valued at 40 dmg per second of CC
  - soft utility, which is hand-estimated
- Run `python3 design/kit_budget.py` to see the tuned numbers, or `--before` to see the v0.1 numbers.
- **Result:** the spread went from **26.0–41.5** (−20 % to +28 % around the median) to **28.0–35.6** (−13 % to +11 %).
- **Kits that may still score low:**
  - Network Admin B and Cloud B are long-range kits. The model doesn't credit the safety of fighting from range, so scoring a little low is intended.
  - Watch both in playtests.
- **It's a paper model**, built on estimated hit rates. Once the TypeScript simulation exists, replace it with CPU-vs-CPU win rates (target: every kit between 45 % and 55 %).

### 8.3 Tuning changelog, v0.1 → v0.2
**Nerfs (the kits that scored too high):**
- **Vibe Coder:**
  - Basic attack full charge 70 → 60.
  - Generate: 90 → 80 dmg, costs 35 Tokens.
  - Accept All: 6×20 → 6×18, costs 45 Tokens.
  - Regenerate now repeats your last skill at 60 % power. *(This fixes an exploit: re-casting Accept All for half the Tokens gave about 360 burst without ever getting Rate Limited.)*
  - Autocomplete 40 → 35.
- **Business Analyst:**
  - Debt is 1 dmg/s per stack (was 2).
  - Set A: max 8 stacks, interest every 6 s, Due Date 20 per stack.
  - Set B: Fatigue 6 % per stack (max −40 %), Deprioritize +2 s, Sign-off 4 HP/s per stack.
  - Debt now fades one stack every 4 s if no new Debt is applied.
- **DevOps B:** Pod Replicas copy basics at 30 % damage. *(Before, two clones copying full basics made it the highest-burst kit, about 335.)*
- **Software Engineer:**
  - Basic attack full charge 75 → 70.
  - Set A: Semicolon 45 dmg on a 6 s cooldown, Brace Cage 1.0 s, Recursion 3×30.
  - Set B: Try/Catch −35 % and +10 Motivation, throw Error mark +30, finally 80, Hotfix 60.
- **Mobile A:** Swipe 35, Camera Flash 12 s cooldown, Push 20 per badge.
- **Tech Support A:** Ticket Barrage 20 per ticket.
- **Cloud B:** failover at 100 HP, and only if an anchor is alive. Anchors have 60 HP.
- **DBA A:** Table Lock max 1.5 s (the hard-CC cap). ROLLBACK max +150.
- **PM A:** Velocity max 4 stacks at −5 %.
- **UI/UX A:** Pixel Perfect +35 % (was +50 %).
- **Data Scientist:** Basic attack full charge 3×25 → 3×20.

**Buffs (the kits that scored too low):**
- **Network Admin:**
  - Damage falls off to 70 % at max range (falloff wasn't defined before).
  - Ping does 20 dmg (it had no damage).
  - Throttle snap does 60.
  - Signal Jam costs 20.
  - Broadcast Storm does 45 per wave.
- **Cloud B:** Deploy Region costs 15. Serverless Strike 60 per anchor. Cold Start does 30 dmg.
- **System Analyst:**
  - Flowchart lines 20.
  - Arrow Connector 55.
  - Swimlane stuns 0.3 s on spawn.
  - Gap Analysis 70.
- **PM:** Assign Ticket 70. Code Freeze costs 35. Fast-Track +35 %.
- **AI/ML Engineer:** Basic attack full charge 60 with a 1.0 s charge time.
- **QA B:** Bug Net does 30 dmg.
- **Mobile B:** the turret does 12 dmg/s.
- **Technical Writer B:** Strikethrough 65.
- **Vibe B:** Touch Grass cooldown 16 s.
- **Data Scientist B:** Random Sample 5×18.

**Missing numbers now defined:**
- Customer 20 dmg per shove. Manager slam 60.
- Mass Ticket 6×20. Customer Mob 3×30.
- Bot 12 dmg/s. Drone shots 8.
- Regression 60.
- Drag & Drop 40. Make It Pop 5×15.
- Crit ×1.5.

## 9. Suggested MVP Roster (6 jobs that cover every archetype)
1. **Software Engineer**: all-rounder (the "learn the game" pick)
2. **Database Admin**: grappler / tank
3. **Cloud Engineer**: artillery / target anywhere
4. **Technical Support**: summoner
5. **QA Analyst**: debuffer / burnout hunter
6. **Vibe Coder**: glass cannon / unique resource

Add the other 11 in content waves once the core feel (charge, Burnout, items) is fun.

**Build order (because of online play):**
1. Deterministic core simulation, plus rollback, with just 2 jobs on The Terminal map. Test online early, because every later feature has to stay deterministic.
2. The lobby code service and relay.
3. The CPU AI (Intern through Mid-level first), Vs CPU quick match and the Training Room.
4. The remaining MVP jobs, items and arenas.
5. Senior and Principal AI, then Career mode (the Performance Review stage, the Legacy System boss, then the secret boss).

---

## 10. Open Questions for You

1. ~~Perspective~~ **Decided:** platform-lite, single screen (section 1.6).
2. ~~Multiplayer~~ **Decided:** Vs CPU with 5 difficulty levels, and Online PvP with lobby codes (section 6).
3. ~~Engine~~ **Decided:** TypeScript + Phaser 3 with our own rollback over WebRTC, deployed on Vercel (section 11).
3b. **Online extras later:** stay with lobby codes only, or add accounts, ranked matchmaking and a public "Quick Match" queue after launch?
4. ~~Permanent buffs~~ **Decided:** they last for the rest of the round.
5. **Mirror matches:** can both players pick the same job? I assumed yes, with an alternate palette.
6. ~~Ultimates~~ **Decided:** none. Passive plus 2–3 skills only.
7. ~~Brand names~~ **Decided:** keep the real names.
8. ~~Single player~~ **Decided:** Career ladder, Vs CPU quick match and Training Room. Unlocks are cosmetic only (sections 6.3–6.5).
9. ~~Set selection~~ **Decided:** blind-pick per match, and the loser may switch set between rounds (section 3).

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

