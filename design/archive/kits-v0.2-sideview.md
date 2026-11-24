# Archived: v0.2 side-view kits and balance notes

Replaced by the v0.3 top-down kits in GAME_DESIGN.md section 3 (data in design/kits_v3.py).
Kept as a source of skill ideas for later sets.

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

