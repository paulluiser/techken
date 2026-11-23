// Tiny key-value store with TTL: Upstash Redis (REST) in production, memory for local dev.
export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  setNx(key: string, value: string, ttlSec: number): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  incr(key: string, ttlSec: number): Promise<number>;
}

export function memoryStore(): Store {
  const m = new Map<string, { v: string; exp: number }>();
  const live = (k: string) => {
    const e = m.get(k);
    if (!e) return null;
    if (Date.now() > e.exp) { m.delete(k); return null; }
    return e;
  };
  return {
    async get(k) { return live(k)?.v ?? null; },
    async set(k, v, ttl) { m.set(k, { v, exp: Date.now() + ttl * 1000 }); },
    async setNx(k, v, ttl) { if (live(k)) return false; m.set(k, { v, exp: Date.now() + ttl * 1000 }); return true; },
    async del(...ks) { for (const k of ks) m.delete(k); },
    async incr(k, ttl) {
      const e = live(k);
      const n = (e ? Number(e.v) : 0) + 1;
      m.set(k, { v: String(n), exp: e ? e.exp : Date.now() + ttl * 1000 });
      return n;
    },
  };
}

export function upstashStore(url: string, token: string): Store {
  const cmd = async (...args: (string | number)[]) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(args.map(String)),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const j = (await res.json()) as { result?: unknown; error?: string };
    if (j.error) throw new Error(`Upstash: ${j.error}`);
    return j.result;
  };
  return {
    async get(k) { const r = await cmd("GET", k); return typeof r === "string" ? r : null; },
    async set(k, v, ttl) { await cmd("SET", k, v, "EX", ttl); },
    async setNx(k, v, ttl) { return (await cmd("SET", k, v, "EX", ttl, "NX")) === "OK"; },
    async del(...ks) { if (ks.length) await cmd("DEL", ...ks); },
    async incr(k, ttl) {
      const n = Number(await cmd("INCR", k));
      if (n === 1) await cmd("EXPIRE", k, ttl);
      return n;
    },
  };
}

type Env = Record<string, string | undefined>;
let fallback: Store | null = null;

/** Upstash when configured (either env naming from the Vercel Marketplace), memory otherwise. */
export function storeFromEnv(env: Env): Store {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (url && token) return upstashStore(url, token);
  return (fallback ??= memoryStore());
}
