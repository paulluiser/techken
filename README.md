# Techken

A 1v1 **top-down arena fighter** where every fighter is a tech job. Browser game, no login.

**Build status:** see `ROADMAP.md`. The game is being rebuilt as a top-down fighter (v0.3).
**R1 is done:** the top-down core with the **Software Engineer** and the **Database Admin**,
playable vs CPU (5 levels) and online. The other 15 jobs arrive in R2.

**What's in it**
- **Deterministic sim** (`src/sim/`): integer-only, 60 ticks/s, 64-direction fixed-point math.
  Move in any direction, dash with invulnerability, hold-to-charge basic attacks, 3 skills per
  job, Motivation and Burnout, best-of-3 rounds of 90 s with Overtime.
- **Kit data** (`src/sim/data/kits.gen.ts`): generated from `design/kits_v3.py`, which also
  scores balance and prints the tables in `GAME_DESIGN.md`.
- **Rollback netcode** (`src/net/rollback.ts`): input delay (default 2 frames), prediction,
  up to 8 frames of rollback, time sync, and checksums every second to catch desyncs.
- **WebRTC transport** (`src/net/transport.ts`) and **lobby codes** (`api/`, `server/`, Vercel
  Functions plus Upstash Redis). `api/turn` hands out Cloudflare TURN credentials.
- **three.js renderer** (`src/render3d/`): stand-in chibi models, arena dioramas and the HUD.
  It only draws and never changes game state.
- **CPU opponents** (`src/ai/cpu.ts`): they dodge shots, use cover and skills, and punish openings.

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

- Open http://localhost:5173. Lobbies work locally with no accounts: they're kept in memory.
- **Two players on one screen:** open http://localhost:5173/dev/duo.html. It runs a host and a
  guest side by side, both on autoplay.
- **Phone on the same Wi-Fi:** `npm run dev` prints a Network URL (for example
  `http://192.168.1.20:5173`). Open it on the phone.
  - Some browsers (iPhone Safari in particular) only allow WebRTC on `https` or `localhost`.
    If the phone can't connect, test against a Vercel preview deployment instead (below).

**Controls**

| Action | Keyboard and mouse | Gamepad | Touch |
|---|---|---|---|
| Move | W A S D or arrows | Left stick | Floating joystick (left side) |
| Aim | Mouse (or auto-aim) | Right stick (or auto-aim) | Drag Attack or a skill button |
| Attack (hold to charge) | Left click or J | Right trigger | ATK |
| Dash | Space, Shift, K or right click | Left trigger or A | DASH |
| Skills 1 / 2 / 3 | Q / E / R (or U / I / O) | X / Y / B | Skill buttons (drag to aim, drag back to cancel) |

Without manual aim, attacks and skills aim at the opponent. On phones the touch controls appear
automatically. Add `?touch=1` to force them on desktop.

## Tests

```bash
npm test
```

| Test file | What it checks |
|---|---|
| `tests/sim.test.ts` | Determinism, cloning, movement and walls, dash, charged basics, both R1 kits, Burnout, round flow and Overtime |
| `tests/rollback.test.ts` | Two sessions over a simulated network (up to ~200 ms jitter, 20 % loss, 30 seeds). They must never desync, and must end on the exact state of a plain simulation with the same inputs |
| `tests/cpu.test.ts` | CPU matches finish, Principal beats Intern, rounds last a sensible time |
| `tests/lobby.test.ts` | The handshake, the "meeting is full" rule, code validation and rate limiting |

```bash
npm run typecheck
```

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel. The framework (Vite) is detected,
   and `api/*.ts` become Functions.
2. **Storage → Marketplace → Upstash Redis**, connected to the project. This sets
   `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or the `UPSTASH_*` pair), and both namings work.
3. **Cloudflare dashboard → Realtime → TURN Server → Create key.** Add `CF_TURN_KEY_ID` and
   `CF_TURN_KEY_API_TOKEN` to the Vercel project's environment variables.
   - Without TURN, players on strict networks (many mobile carriers, office Wi-Fi) may not
     connect.
   - `server/turn-core.ts` uses the `generate-ice-servers` endpoint. Check it against
     Cloudflare's current docs if TURN credentials come back empty.
4. Redeploy, then open the preview URL on both devices.

All three services are free at this scale (Vercel Hobby, the Upstash free tier, and Cloudflare
TURN's 1,000 GB per month).

## The 2-week test

**Setup:** a laptop running Chrome against an iPhone running Safari **on mobile data**, using the
deployed URL. Enable the stats overlay (on by default under *Test settings*).

| Check | Pass when |
|---|---|
| Joining | Joining by link takes under 10 s |
| First load | Under 3 s on 4G (the bundle is about 370 KB gzipped) |
| Sync | 20 matches with **no "DESYNC"** in the overlay |
| Feel | Rollbacks look fine at 100–150 ms (try *Simulated lag* on both devices) |
| Relay fallback | Works once with **Force TURN relay** on (the overlay should show `route relay`) |

**What the overlay shows:**
- `route`: host (LAN), srflx (direct) or relay (TURN).
- `ping`: round-trip time.
- `rollbacks avg / max`: how many frames were re-simulated.
- `stalls`: waits caused by the opponent being too far behind.
- `checksums OK` / `DESYNC`.

**Measured locally on the duo page:**
- **No lag:** 0 rollbacks, all checksums OK.
- **With 100 ± 25 ms each way and 5 % loss (about 210 ms round trip):** both sides held 60 fps
  within 1–2 frames of each other. Rollbacks averaged 4–5 frames (maximum 7), with 0 stalls and
  every checksum OK.

## Notes

- Hidden tabs pause their animation frames. The sim also ticks from a timer, but browsers slow
  timers down in background tabs. If a player switches away for more than 10 s, the opponent
  sees "disconnected", as the design doc specifies.
- `dev/duo.html` isn't part of the production build.
