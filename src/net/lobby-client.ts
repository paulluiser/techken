// Talks to /api/lobby and /api/turn (Vercel functions in production, Vite middleware in dev).
export class LobbyError extends Error {}

async function call(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new LobbyError("Can't reach the lobby server. Check your connection.");
  }
  return res;
}

async function errorText(res: Response, fallback: string) {
  try { const j = await res.json(); return j.error ?? fallback; } catch { return fallback; }
}

export async function getIceServers(): Promise<RTCIceServer[]> {
  try {
    const res = await call("/api/turn");
    if (res.ok) { const j = await res.json(); if (Array.isArray(j.iceServers)) return j.iceServers; }
  } catch { /* fall through */ }
  return [{ urls: "stun:stun.cloudflare.com:3478" }];
}

export async function createLobby(offer: string): Promise<string> {
  const res = await call("/api/lobby", { method: "POST", body: JSON.stringify({ offer }) });
  if (!res.ok) throw new LobbyError(await errorText(res, "Couldn't create a meeting."));
  return (await res.json()).code;
}

export async function fetchOffer(code: string): Promise<string> {
  const res = await call(`/api/lobby?code=${encodeURIComponent(code)}`);
  if (!res.ok) throw new LobbyError(await errorText(res, "Meeting not found or expired."));
  return (await res.json()).offer;
}

export async function postAnswer(code: string, answer: string) {
  const res = await call(`/api/lobby?code=${encodeURIComponent(code)}&answer=1`, { method: "POST", body: JSON.stringify({ answer }) });
  if (!res.ok) throw new LobbyError(await errorText(res, "Couldn't join the meeting."));
}

/** Host polls every 500 ms until the guest's answer arrives. */
export async function waitForAnswer(code: string, signal: AbortSignal): Promise<string> {
  while (!signal.aborted) {
    const res = await call(`/api/lobby?code=${encodeURIComponent(code)}&answer=1`);
    if (res.status === 200) return (await res.json()).answer;
    if (res.status !== 202) throw new LobbyError(await errorText(res, "Meeting not found or expired."));
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new LobbyError("Cancelled.");
}

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function normalizeCode(raw: string): string {
  // accept a pasted link or code; keep only valid characters
  const m = raw.match(/[?&]code=([^&#]+)/);
  const s = (m ? decodeURIComponent(m[1]) : raw).toUpperCase();
  return [...s].filter((c) => CODE_ALPHABET.includes(c)).join("").slice(0, 6);
}
