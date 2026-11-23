// Lobby-code signaling. Only the WebRTC handshake goes through here (one offer, one answer);
// the match itself runs browser-to-browser.
//
//   POST /api/lobby                    {offer}   -> 201 {code}
//   GET  /api/lobby?code=K7QX2M                  -> 200 {offer} | 404 | 409 full
//   POST /api/lobby?code=K7QX2M&answer=1 {answer} -> 204 | 404 | 409 full
//   GET  /api/lobby?code=K7QX2M&answer=1          -> 200 {answer} (and the code is deleted) | 202 waiting | 404
import type { Store } from "./store.js";

export interface ApiReq {
  method: string;
  query: Record<string, string | undefined>;
  body: unknown;
  ip: string;
}
export interface ApiRes { status: number; body?: unknown }

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
export const LOBBY_TTL = 600; // 10 minutes
const MAX_SDP = 20000;
const RATE_LIMIT = 30; // lobbies per IP per 10 minutes

function randomCode(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
function validCode(c: string | undefined): c is string {
  return !!c && c.length === 6 && [...c].every((ch) => CODE_ALPHABET.includes(ch));
}
function sdpFrom(body: unknown, key: "offer" | "answer"): string | null {
  if (!body || typeof body !== "object") return null;
  const v = (body as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 && v.length <= MAX_SDP && v.startsWith("v=0") ? v : null;
}

const NOT_FOUND: ApiRes = { status: 404, body: { error: "Meeting not found or expired." } };
const FULL: ApiRes = { status: 409, body: { error: "Meeting is full." } };

export async function handleLobby(req: ApiReq, store: Store): Promise<ApiRes> {
  const code = req.query.code?.toUpperCase();
  const isAnswer = req.query.answer === "1";

  if (req.method === "POST" && !code) {
    const offer = sdpFrom(req.body, "offer");
    if (!offer) return { status: 400, body: { error: "Missing or invalid offer." } };
    const n = await store.incr(`rl:lobby:${req.ip}`, LOBBY_TTL);
    if (n > RATE_LIMIT) return { status: 429, body: { error: "Too many meetings created. Try again in a few minutes." } };
    for (let i = 0; i < 6; i++) {
      const c = randomCode();
      if (await store.setNx(`lobby:${c}:offer`, offer, LOBBY_TTL)) return { status: 201, body: { code: c } };
    }
    return { status: 503, body: { error: "Couldn't create a meeting. Try again." } };
  }

  if (!validCode(code)) return { status: 400, body: { error: "That code isn't valid. Codes are 6 letters and numbers." } };
  const offerKey = `lobby:${code}:offer`, answerKey = `lobby:${code}:answer`;

  if (req.method === "GET" && !isAnswer) {
    const offer = await store.get(offerKey);
    if (!offer) return NOT_FOUND;
    if (await store.get(answerKey)) return FULL;
    return { status: 200, body: { offer } };
  }
  if (req.method === "POST" && isAnswer) {
    const answer = sdpFrom(req.body, "answer");
    if (!answer) return { status: 400, body: { error: "Missing or invalid answer." } };
    if (!(await store.get(offerKey))) return NOT_FOUND;
    if (!(await store.setNx(answerKey, answer, LOBBY_TTL))) return FULL;
    return { status: 204 };
  }
  if (req.method === "GET" && isAnswer) {
    const answer = await store.get(answerKey);
    if (answer) { await store.del(offerKey, answerKey); return { status: 200, body: { answer } }; }
    if (!(await store.get(offerKey))) return NOT_FOUND;
    return { status: 202, body: { waiting: true } };
  }
  return { status: 405, body: { error: "Method not allowed." } };
}
