# Techken build roadmap

The full game from `GAME_DESIGN.md`, built in phases. Each phase:
- keeps the game playable, both locally and online
- passes the tests
- gets committed and pushed

The simulation stays deterministic throughout (integer math, no randomness outside the seeded
RNG in the state), so rollback netcode keeps working as content is added.

| Phase | Scope | Status |
|---|---|---|
| 0 | Online test: rollback netcode, WebRTC, lobby codes, Vercel API | ✅ done |
| 1 | **Combat engine**: guard, skills, cooldowns, Crunch Cast, status effects with caps, projectiles, summons, zones, walls, traps, all 14 items, all 13 arena layouts. **6 MVP jobs × 2 sets** (SE, DBA, Cloud, Tech Support, QA, Vibe Coder). Job/set pick for practice and online (blind) | ✅ done |
| 2 | **The other 11 jobs × 2 sets**: Mobile Dev, System Analyst, Network Admin, DevOps, Cybersecurity, Data Scientist, AI/ML, Business Analyst, PM, UI/UX, Technical Writer | ✅ done |
| 3 | **Arena hazards** (13), Overtime, double-KO tiebreaker, aimed (hold) targeting for "anywhere" skills | ✅ done |
| 4 | **TechkenOS menus**: Desktop, Employee Directory (blind pick, palettes), Meeting Room, VS screen, Post-Mortem, Control Panel (rebinding, touch layout editor), Swag Drawer | ✅ done |
| 5 | **CPU AI**: 5 difficulty levels and per-job playbooks. Headless balance runner (CPU vs CPU win rates) | ✅ done: baseline in `design/balance-report.md` |
| 6 | **Art**: chibi pixel sprites for 17 jobs (generated in the approved style), 5-layer backgrounds for 13 arenas, item icons, effects, portraits | ⏳ |
| 7 | **Audio**: chip synth engine, 13 arena themes with Crunch stems, 17 job motifs, about 150 SFX, announcer text and lines, mixing rules, rollback-safe sound events | ⏳ |
| 8 | **Single player**: Career ladder (rivals, Inbox Zero bonus stage, Legacy System and The Board bosses, scoring, endings), Training Room | ⏳ |
| 9 | **Saves**: browser save, cosmetic unlocks, temporary names, transfer code and QR (`/api/transfer`) | ⏳ |
| 10 | **Polish**: PWA, accessibility options, performance on phones, balance pass from the CPU runner (start with the outliers in `design/balance-report.md`: Tech Support A, Vibe Coder A/B high; DevOps B, Cyber B, QA A low) | ⏳ |
