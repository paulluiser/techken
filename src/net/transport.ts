// WebRTC peer link: two negotiated data channels (no extra signaling round-trip).
//  - game: unordered, no retransmits (closest a browser gets to UDP) for inputs/checksums/pings
//  - ctrl: reliable + ordered for hello/start/bye
// Includes an optional lag simulator (delay, jitter, loss) for testing bad connections.
import type { CtrlMsg, GameMsg } from "./protocol";

export interface LagSim { delayMs: number; jitterMs: number; lossPct: number }

export interface LinkEvents {
  onGame: (m: GameMsg) => void;
  onCtrl: (m: CtrlMsg) => void;
  onOpen: () => void;
  onClose: (reason: string) => void;
  onState?: (s: string) => void;
}

export class PeerLink {
  readonly pc: RTCPeerConnection;
  private game: RTCDataChannel;
  private ctrl: RTCDataChannel;
  private opened = 0;
  private closed = false;
  lag: LagSim = { delayMs: 0, jitterMs: 0, lossPct: 0 };
  bytesOut = 0;

  constructor(iceServers: RTCIceServer[], forceRelay: boolean, private ev: LinkEvents) {
    this.pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: forceRelay ? "relay" : "all" });
    this.game = this.pc.createDataChannel("game", { negotiated: true, id: 0, ordered: false, maxRetransmits: 0 });
    this.ctrl = this.pc.createDataChannel("ctrl", { negotiated: true, id: 1, ordered: true });
    for (const ch of [this.game, this.ctrl]) {
      ch.onopen = () => { if (++this.opened === 2) this.ev.onOpen(); };
      ch.onclose = () => this.fail("The connection closed.");
    }
    this.game.onmessage = (e) => { try { this.ev.onGame(JSON.parse(e.data)); } catch { /* ignore malformed */ } };
    this.ctrl.onmessage = (e) => { try { this.ev.onCtrl(JSON.parse(e.data)); } catch { /* ignore malformed */ } };
    this.pc.onconnectionstatechange = () => {
      this.ev.onState?.(this.pc.connectionState);
      if (this.pc.connectionState === "failed") this.fail("Couldn't connect.");
    };
  }

  private fail(reason: string) {
    if (this.closed) return;
    this.closed = true;
    this.ev.onClose(reason);
  }

  /** Host: create the offer with every ICE candidate included (no trickle). */
  async createOffer(): Promise<string> {
    await this.pc.setLocalDescription(await this.pc.createOffer());
    await waitForIce(this.pc);
    return this.pc.localDescription!.sdp;
  }

  /** Guest: accept the offer and produce the answer. */
  async acceptOffer(offerSdp: string): Promise<string> {
    await this.pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    await waitForIce(this.pc);
    return this.pc.localDescription!.sdp;
  }

  /** Host: apply the guest's answer. */
  async acceptAnswer(answerSdp: string) {
    await this.pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  sendGame(m: GameMsg) {
    if (this.game.readyState !== "open") return;
    const data = JSON.stringify(m);
    const { delayMs, jitterMs, lossPct } = this.lag;
    if (lossPct > 0 && Math.random() * 100 < lossPct) return;
    this.bytesOut += data.length;
    if (delayMs <= 0 && jitterMs <= 0) { this.game.send(data); return; }
    const d = Math.max(0, delayMs + (Math.random() * 2 - 1) * jitterMs);
    setTimeout(() => { if (this.game.readyState === "open") this.game.send(data); }, d);
  }

  sendCtrl(m: CtrlMsg) {
    if (this.ctrl.readyState === "open") this.ctrl.send(JSON.stringify(m));
  }

  /** Which path the connection uses: "host" (LAN), "srflx" (direct via STUN) or "relay" (TURN). */
  async route(): Promise<string> {
    try {
      const stats = await this.pc.getStats();
      let pairId = "";
      stats.forEach((r: any) => { if (r.type === "transport" && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId; });
      let localId = "";
      stats.forEach((r: any) => {
        if (r.type === "candidate-pair" && (r.id === pairId || (!pairId && r.nominated && r.state === "succeeded"))) localId = r.localCandidateId;
      });
      let type = "?";
      stats.forEach((r: any) => { if (r.id === localId) type = r.candidateType; });
      return type;
    } catch { return "?"; }
  }

  close() {
    this.closed = true;
    try { this.sendCtrl({ t: "bye" }); } catch { /* ignore */ }
    try { this.pc.close(); } catch { /* ignore */ }
  }
}

function waitForIce(pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { pc.removeEventListener("icegatheringstatechange", check); clearTimeout(t); resolve(); };
    const check = () => { if (pc.iceGatheringState === "complete") done(); };
    const t = setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", check);
  });
}
