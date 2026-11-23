import { describe, expect, it } from "vitest";
import { handleLobby, type ApiReq } from "../server/lobby-core";
import { memoryStore } from "../server/store";

const SDP = "v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n";
const req = (p: Partial<ApiReq>): ApiReq => ({ method: "GET", query: {}, body: undefined, ip: "1.2.3.4", ...p });

describe("lobby signaling", () => {
  it("runs the full offer/answer handshake once", async () => {
    const store = memoryStore();
    const created = await handleLobby(req({ method: "POST", body: { offer: SDP } }), store);
    expect(created.status).toBe(201);
    const code = (created.body as { code: string }).code;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    expect((await handleLobby(req({ query: { code, answer: "1" } }), store)).status).toBe(202);
    expect((await handleLobby(req({ query: { code } }), store)).body).toEqual({ offer: SDP });
    expect((await handleLobby(req({ method: "POST", query: { code, answer: "1" }, body: { answer: SDP } }), store)).status).toBe(204);
    // a third person can't join
    expect((await handleLobby(req({ query: { code } }), store)).status).toBe(409);
    expect((await handleLobby(req({ method: "POST", query: { code, answer: "1" }, body: { answer: SDP } }), store)).status).toBe(409);
    // host collects the answer; the code is then gone
    expect((await handleLobby(req({ query: { code, answer: "1" } }), store)).body).toEqual({ answer: SDP });
    expect((await handleLobby(req({ query: { code } }), store)).status).toBe(404);
  });

  it("rejects bad codes and bad SDP", async () => {
    const store = memoryStore();
    expect((await handleLobby(req({ query: { code: "O0I1XX" } }), store)).status).toBe(400);
    expect((await handleLobby(req({ method: "POST", body: { offer: "hello" } }), store)).status).toBe(400);
    expect((await handleLobby(req({ query: { code: "ABCDEF" } }), store)).status).toBe(404);
  });

  it("rate-limits lobby creation per IP", async () => {
    const store = memoryStore();
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await handleLobby(req({ method: "POST", body: { offer: SDP } }), store)).status;
    expect(last).toBe(429);
  });
});
