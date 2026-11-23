// Vercel Function: hands out ICE servers (STUN + short-lived Cloudflare TURN credentials).
import { iceServers } from "../server/turn-core.js";

interface VRes { status(code: number): VRes; json(body: unknown): void; setHeader(k: string, v: string): void }

export default async function handler(_req: unknown, res: VRes) {
  res.setHeader("cache-control", "no-store");
  res.status(200).json(await iceServers(process.env));
}
