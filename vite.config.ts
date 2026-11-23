import { defineConfig, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleLobby } from "./server/lobby-core.js";
import { memoryStore, storeFromEnv } from "./server/store.js";
import { iceServers } from "./server/turn-core.js";

// Local dev: serve /api/lobby and /api/turn from the same code the Vercel Functions use.
// Without Upstash env vars, lobbies live in memory (fine for local testing).
function localApi(): Plugin {
  const store = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL ? storeFromEnv(process.env) : memoryStore();
  const readBody = (req: IncomingMessage) =>
    new Promise<unknown>((resolve) => {
      let raw = "";
      req.on("data", (c) => { raw += c; if (raw.length > 100_000) req.destroy(); });
      req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : undefined); } catch { resolve(undefined); } });
    });
  const send = (res: ServerResponse, status: number, body?: unknown) => {
    res.statusCode = status;
    res.setHeader("cache-control", "no-store");
    if (body === undefined) { res.end(); return; }
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  };
  return {
    name: "techken-local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://local");
        if (url.pathname === "/api/turn") return send(res, 200, await iceServers(process.env));
        if (url.pathname !== "/api/lobby") return next();
        const body = req.method === "POST" ? await readBody(req) : undefined;
        const out = await handleLobby(
          {
            method: req.method ?? "GET",
            query: { code: url.searchParams.get("code") ?? undefined, answer: url.searchParams.get("answer") ?? undefined },
            body,
            ip: req.socket.remoteAddress ?? "local",
          },
          store,
        );
        send(res, out.status, out.body);
      });
    },
  };
}

export default defineConfig({
  plugins: [localApi()],
  build: { target: "es2022", chunkSizeWarningLimit: 2000 },
});
