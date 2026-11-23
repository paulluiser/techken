// Vercel Function: lobby-code signaling. Logic lives in server/lobby-core.ts.
import { handleLobby } from "../server/lobby-core.js";
import { storeFromEnv } from "../server/store.js";

interface VReq { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown; headers: Record<string, string | string[] | undefined> }
interface VRes { status(code: number): VRes; json(body: unknown): void; end(): void; setHeader(k: string, v: string): void }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function handler(req: VReq, res: VRes) {
  res.setHeader("cache-control", "no-store");
  const env = process.env;
  if (!(env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) || !(env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN)) {
    // in-memory storage isn't shared between Vercel instances, so lobbies would randomly vanish
    res.status(503).json({ error: "Lobby storage isn't set up yet. Connect Upstash Redis to the Vercel project (see README)." });
    return;
  }
  try {
    const ip = (one(req.headers["x-forwarded-for"]) ?? "unknown").split(",")[0].trim();
    const out = await handleLobby(
      { method: req.method ?? "GET", query: { code: one(req.query.code), answer: one(req.query.answer) }, body: req.body, ip },
      storeFromEnv(process.env),
    );
    if (out.body === undefined) res.status(out.status).end();
    else res.status(out.status).json(out.body);
  } catch {
    res.status(500).json({ error: "The lobby server had a problem. Try again." });
  }
}
