// ICE servers for WebRTC: public STUN always; Cloudflare Realtime TURN when a key is configured.
// The TURN API token stays on the server; browsers only get short-lived credentials.
type Env = Record<string, string | undefined>;

const STUN = [{ urls: ["stun:stun.cloudflare.com:3478"] }];

export async function iceServers(env: Env): Promise<{ iceServers: unknown[]; turn: boolean }> {
  const keyId = env.CF_TURN_KEY_ID, token = env.CF_TURN_KEY_API_TOKEN;
  if (!keyId || !token) return { iceServers: STUN, turn: false };
  try {
    // Current endpoint returns {iceServers: [...]} ready for RTCPeerConnection.
    // Verify against https://developers.cloudflare.com/realtime/turn/generate-credentials/
    const res = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ttl: 3600 }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { iceServers?: unknown };
    const list = Array.isArray(j.iceServers) ? j.iceServers : j.iceServers ? [j.iceServers] : [];
    if (!list.length) throw new Error("empty");
    return { iceServers: [...STUN, ...list], turn: true };
  } catch {
    return { iceServers: STUN, turn: false };
  }
}
