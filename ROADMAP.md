# Techken build roadmap

## v0.3: top-down rebuild

Techken is moving from a side-view fighter to a **top-down arena fighter** with a mobile 3D look
(`GAME_DESIGN.md` v0.3, `design/art/reference-archero2.md`). Each phase:
- keeps the game playable, locally and online
- passes the tests
- gets committed and pushed

The simulation stays deterministic (integer math, seeded RNG in the state), so rollback keeps working.

**Kept from the side-view build:** rollback netcode, WebRTC transport, lobby codes and the Vercel API,
the job/skill hook framework, the status-effect caps, the CPU runner and balance tooling, settings,
the touch-control editor and the TechkenOS menu shell.

| Phase | Scope | Status |
|---|---|---|
| R1 | **Top-down core**: floor-plane movement, wall and cover collision, dash, charged basics (melee arc and ranged shot), aim input (mouse, right stick, touch drag, auto-aim). three.js renderer with stand-in chibis. **Software Engineer and Database Admin** in Open Office and The Terminal. Works online | ✅ done. CPU mirror win rates SE vs DBA: 25 % (Mid-level), 60 % (Principal), to fix in R4 |
| R2 | **All 17 kits** (1 passive + 3 skills each, `design/kits_v3.py`): shots, dashes, delayed areas, zones, walls, pets, the 10 effect words with over-head icons | ✅ done. CPU win rates 32–67 % (`design/balance-report.md`) |
| R3 | **Arenas and items**: 13 top-down layouts with cover and hazards, the 14 items, Overtime shrink | ⏳ |
| R4 | **CPU AI and balance**: 5 levels re-tuned for top-down (dodging, cover), playbooks per kit, CPU-vs-CPU runner until every job is 45–55% | ⏳ |
| R5 | **Simple menus**: fewer words, icon-first. Quick 3-step tutorial (move, charge, skill). Roster stage, kit view with one line per skill | ⏳ |
| R6 | **3D art**: chibi models and rigs for 17 jobs, skill VFX, 13 arena dioramas, HUD in the mobile style | ⏳ |
| R7 | **Audio**: chip synth, arena themes, job motifs, SFX, rollback-safe sound events | ⏳ |
| R8 | **Solo modes**: Roguelite fight ladder (office tower, perks between floors, boss) and Training Room | ⏳ |
| R9 | **Saves**: browser save, cosmetic unlocks, temporary names, transfer code and QR | ⏳ |
| R10 | **Polish**: PWA, accessibility, phone performance, final balance pass | ⏳ |

## v0.2: side-view build (done, replaced)

Phases 0–6 built the side-view game: netcode and lobby (0), combat engine and 34 kits (1–2),
hazards and Overtime (3), menus (4), CPU AI and balance runner (5), pixel art (6).
The last side-view build is published as the "Techken" artifact; its kits are archived in
`design/archive/kits-v0.2-sideview.md`.
