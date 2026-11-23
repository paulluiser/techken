# Techken

**Build status:** see `ROADMAP.md`. Phase 1 is done: the combat engine (guard, skills, status caps, summons, projectiles, zones, all 14 items, all 13 arena layouts) Phase 2 added the other 11 jobs, so **all 17 jobs × 2 sets (34 kits)** are playable vs CPU and online with a blind job/set pick.

## Online test (phase 0)

The first build of Techken: two boxes fighting online. It exists to prove that browser
rollback netcode feels good between a laptop and a phone before any art or fighters are made
(see `GAME_DESIGN.md`, sections 6.2 and 11).

**What's in it**
- **Deterministic sim** (`src/sim/`): integer-only, 60 ticks/s. Walk, jump/double jump,
  drop-through platforms, hold-to-charge attack (tap 25 / full 70), dash with i-frames,
  Motivation and Burnout, best-of-3 rounds of 90 s on The Terminal.
- **Rollback netcode** (`src/net/rollback.ts`): input delay (default 2 frames), prediction,
  up to 8 frames of rollback, time sync, and checksums every second to catch desyncs.
- **WebRTC transport** (`src/net/transport.ts`): browser to browser, with an unreliable
  channel for inputs and a reliable one for control messages. Includes a lag simulator.
- **Lobby codes** (`api/`, `server/`): Vercel Functions plus Upstash Redis, which carry only
  the WebRTC handshake. `api/turn` hands out Cloudflare TURN credentials.
- **Phaser 4 renderer** (`src/render/`): it only draws, and never changes game state.
- **Touch controls** on phones, plus keyboard on desktop.

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

| Action | Keys |
|---|---|
| Move | A/D or ←/→ |
| Jump | W, ↑ or Space |
| Drop through a platform | S or ↓ |
| Attack | **J** (hold to charge) |
| Guard | **K** |
| Dash | L or Shift |
| Skills | **U / I / O** |

On phones the on-screen buttons appear automatically. Add `?touch=1` to force them on desktop.

## Tests

```bash
npm test
```

| Test file | What it checks |
|---|---|
| `tests/sim.test.ts` | Determinism, clone and resume, integer-only state, damage, Burnout and KO rules |
| `tests/rollback.test.ts` | Two sessions over a simulated network (up to ~200 ms jitter, 20 % loss, 30 seeds). They must never desync, and must end on the exact state of a plain simulation with the same inputs |
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
