import "./style.css";
import * as Phaser from "phaser";
import * as C from "./sim/constants";
import { ARENAS } from "./sim/arenas";
import { JOBS, JOB_CODES, JOB_NAMES } from "./sim/registry";
import { DEFAULT_CONFIG, type MatchConfig } from "./sim/sim";
import { Driver, implementedJobs } from "./game/driver";
import { Autoplay, CombinedInput, Keyboard, TouchPad } from "./game/input-sources";
import { GameScene } from "./render/GameScene";
import { PeerLink } from "./net/transport";
import { PROTOCOL_VERSION, type CtrlMsg } from "./net/protocol";
import { createLobby, fetchOffer, getIceServers, LobbyError, normalizeCode, postAnswer, waitForAnswer } from "./net/lobby-client";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

// ---------- settings (per browser) ----------
interface Settings { delay: number; lag: number; jitter: number; loss: number; relay: boolean; auto: boolean; debug: boolean; job: number; set: number; arena: number }
const DEFAULTS: Settings = { delay: 2, lag: 0, jitter: 0, loss: 0, relay: false, auto: false, debug: true, job: 0, set: 0, arena: 0 };
function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("techken.test.settings") || "{}") }; } catch { return { ...DEFAULTS }; }
}
const settings = loadSettings();
if (!JOBS[settings.job]) settings.job = 0;
const saveSettings = () => { try { localStorage.setItem("techken.test.settings", JSON.stringify(settings)); } catch { /* private mode */ } };
const bindSelect = (id: string, key: "delay" | "lag" | "jitter" | "loss") => {
  const el = $<HTMLSelectElement>(id);
  el.value = String(settings[key]);
  el.addEventListener("change", () => { settings[key] = Number(el.value); saveSettings(); applyLag(); });
};
const bindCheck = (id: string, key: "relay" | "auto" | "debug") => {
  const el = $<HTMLInputElement>(id);
  el.checked = settings[key];
  el.addEventListener("change", () => { settings[key] = el.checked; saveSettings(); auto.enabled = settings.auto; });
};
bindSelect("o-delay", "delay"); bindSelect("o-lag", "lag"); bindSelect("o-jitter", "jitter"); bindSelect("o-loss", "loss");
bindCheck("o-relay", "relay"); bindCheck("o-auto", "auto"); bindCheck("o-debug", "debug");

// ---------- input + driver + Phaser ----------
const kb = new Keyboard();
const touch = new TouchPad($("touch"));
const auto = new Autoplay();
auto.enabled = settings.auto;
const driver = new Driver(new CombinedInput(kb, touch, auto));
const isTouch = matchMedia("(pointer: coarse)").matches || new URLSearchParams(location.search).has("touch");

// The simulation loop runs independently of the renderer (animation frames + an interval
// backup); driver.update() steps by the real clock, so calling it from both is safe.
function simLoop() { driver.update(); requestAnimationFrame(simLoop); }
requestAnimationFrame(simLoop);
setInterval(() => driver.update(), 8);

let game: Phaser.Game | null = null;
async function bootPhaser() {
  try { await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fallback font */ }
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: "game", width: C.W, height: C.H, pixelArt: true, backgroundColor: "#05060a",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new GameScene(driver)],
  });
}
bootPhaser();

// ---------- screens ----------
const screens = ["s-menu", "s-meeting", "s-join", "s-pick", "s-msg"];
function show(id: string | null) {
  for (const s of screens) $(s).hidden = s !== id;
  const playing = id === null;
  $("touch").hidden = !(playing && isTouch);
  $("leave").hidden = !playing;
  $("debug").hidden = !(playing && settings.debug && driver.mode === "online");
  kb.enabled = playing;
}
function message(title: string, text: string) {
  $("msg-title").textContent = title;
  $("msg-text").textContent = text;
  show("s-msg");
}
function setStatus(id: string, text: string, err = false) {
  const el = $(id); el.textContent = text; el.classList.toggle("err", err);
}

let abort: AbortController | null = null;
let connectTimer = 0;
let pending: PeerLink | null = null;
function backToMenu() {
  abort?.abort(); abort = null;
  clearTimeout(connectTimer);
  pending?.close(); pending = null;
  driver.startAttract();
  history.replaceState(null, "", location.pathname);
  show("s-menu");
}
for (const el of document.querySelectorAll<HTMLElement>("[data-back]")) el.addEventListener("click", backToMenu);
$("leave").addEventListener("click", backToMenu);
addEventListener("keydown", (e) => { if (e.key === "Escape" && $("s-menu").hidden) backToMenu(); });

// ---------- Employee Directory (job + set pick) ----------
type PickMode = "practice" | "host" | "guest";
let pickMode: PickMode = "practice";
let onReady: (job: number, set: number, arena: number, cpu: number, items: boolean) => void = () => {};

function renderPick() {
  const grid = $("p-jobs");
  grid.innerHTML = "";
  JOB_NAMES.forEach((name, k) => {
    const j = JOBS[k];
    const b = document.createElement("button");
    b.textContent = JOB_CODES[k];
    b.title = j ? name : `${name} (coming in phase 2)`;
    b.style.background = j ? `#${j.color.toString(16).padStart(6, "0")}` : "#3d3a4a";
    b.disabled = !j;
    b.setAttribute("aria-selected", String(settings.job === k));
    b.addEventListener("click", () => { settings.job = k; settings.set = 0; saveSettings(); renderPick(); });
    grid.appendChild(b);
  });
  const j = JOBS[settings.job]!;
  $("p-jobname").textContent = `${j.name.toUpperCase()} · charge ${(j.chargeFull / 60).toFixed(1)} s · ${j.tap}/${j.full} dmg · ${j.ranged ? "ranged" : "melee"} · weight ${j.weight}`;
  const sets = $("p-sets");
  sets.innerHTML = "";
  j.sets.forEach((st, k) => {
    const b = document.createElement("button");
    b.className = "setcard";
    b.setAttribute("aria-pressed", String(settings.set === k));
    b.innerHTML = `<h4>SET ${"AB"[k]}: "${esc(st.name)}"</h4><span class="pas">◆ ${esc(st.passive)}: ${esc(st.passiveDesc)}</span>` +
      st.skills.map((sk, n) => `<span class="sk">${"UIO"[n]} · ${esc(sk.name)} (${sk.cost / 100}${sk.tok ? ` + ${sk.tok / 100} tok` : ""} / ${sk.cd / 60}s): ${esc(sk.desc)}</span>`).join("") +
      `<span class="sk"><i>${esc(st.combo)}</i></span>`;
    b.addEventListener("click", () => { settings.set = k; saveSettings(); renderPick(); });
    sets.appendChild(b);
  });
  $("p-arena-wrap").hidden = pickMode === "guest";
  $("p-cpu-wrap").hidden = pickMode !== "practice";
}
function openPick(mode: PickMode, ready: typeof onReady) {
  pickMode = mode; onReady = ready;
  const ar = $<HTMLSelectElement>("p-arena");
  ar.innerHTML = ARENAS.map((a, k) => `<option value="${k}">${esc(a.name)}</option>`).join("");
  ar.value = String(settings.arena);
  const cpu = $<HTMLSelectElement>("p-cpu");
  cpu.innerHTML = `<option value="-1">Random</option>` + implementedJobs().map((k) => `<option value="${k}">${esc(JOB_NAMES[k])}</option>`).join("");
  $<HTMLButtonElement>("p-ready").disabled = false;
  setStatus("p-status", mode === "practice" ? "" : "Your pick stays hidden until you're both ready.");
  renderPick();
  show("s-pick");
}
$("p-ready").addEventListener("click", () => {
  settings.arena = Number($<HTMLSelectElement>("p-arena").value); saveSettings();
  onReady(settings.job, settings.set, settings.arena, Number($<HTMLSelectElement>("p-cpu").value), $<HTMLInputElement>("p-items").checked);
});

$("b-practice").addEventListener("click", () => openPick("practice", (job, set, arena, cpu, items) => {
  const jobs = implementedJobs();
  const cj = cpu >= 0 ? cpu : jobs[Math.floor(Math.random() * jobs.length)];
  driver.startPractice({ ...DEFAULT_CONFIG, jobs: [job, cj], sets: [set, Math.floor(Math.random() * 2)], arena, items, seed: (Math.random() * 2 ** 31) | 0 });
  show(null);
}));

// ---------- online ----------
function applyLag() {
  if (driver.link) driver.link.lag = { delayMs: settings.lag, jitterMs: settings.jitter, lossPct: settings.loss };
}

function makeLink(ice: RTCIceServer[], role: 0 | 1, statusId: string): PeerLink {
  let started = false;
  let mine: { job: number; set: number; arena: number; items: boolean } | null = null;
  let theirs: { job: number; set: number } | null = null;
  const tryStart = () => {
    if (role !== 0 || started || !mine || !theirs) return;
    started = true;
    const cfg: MatchConfig = { ...DEFAULT_CONFIG, jobs: [mine.job, theirs.job], sets: [mine.set, theirs.set], arena: mine.arena, items: mine.items, seed: (Math.random() * 2 ** 31) | 0 };
    link.sendCtrl({ t: "start", cfg });
    begin(link, 0, cfg);
  };
  const link: PeerLink = new PeerLink(ice, settings.relay, {
    onOpen: () => {
      clearTimeout(connectTimer);
      setStatus(statusId, "Connected.");
      link.sendCtrl({ t: "hello", v: PROTOCOL_VERSION, delay: settings.delay });
    },
    onCtrl: (m: CtrlMsg) => {
      if (m.t === "hello") {
        if (m.v !== PROTOCOL_VERSION) { link.close(); message("VERSION MISMATCH", "You and your opponent are on different versions. Both refresh the page and try again."); return; }
        openPick(role === 0 ? "host" : "guest", (job, set, arena, _cpu, items) => {
          mine = { job, set, arena, items };
          link.sendCtrl({ t: "pick", job, set });
          $<HTMLButtonElement>("p-ready").disabled = true;
          setStatus("p-status", "Ready. Waiting for your opponent's pick…");
          tryStart();
        });
      } else if (m.t === "pick") {
        if (JOBS[m.job] && (m.set === 0 || m.set === 1)) theirs = { job: m.job, set: m.set };
        tryStart();
      } else if (m.t === "start" && role === 1 && !started) {
        started = true;
        begin(link, 1, m.cfg);
      } else if (m.t === "bye") {
        if (driver.link === link || pending === link) message("OPPONENT LEFT", "Your opponent left the meeting.");
      }
    },
    onGame: (m) => { if (driver.link === link) driver.session?.onMessage(m); },
    onClose: (reason) => {
      clearTimeout(connectTimer);
      if (driver.link === link) message("DISCONNECTED", `${reason} Your opponent's connection dropped.`);
      else if (!started) setStatus(statusId, `${reason} If one of you is on mobile data or office Wi-Fi, the TURN relay is needed (see README).`, true);
    },
  });
  pending = link;
  return link;
}

function begin(link: PeerLink, me: 0 | 1, cfg: MatchConfig) {
  pending = null;
  driver.startOnline(link, me, settings.delay, cfg);
  applyLag();
  history.replaceState(null, "", location.pathname);
  show(null);
}

function watchConnect(statusId: string) {
  clearTimeout(connectTimer);
  connectTimer = window.setTimeout(() => {
    setStatus(statusId, "Still can't connect. Check your network, or turn on Force TURN relay if TURN is configured.", true);
  }, 15000);
}

$("b-host").addEventListener("click", async () => {
  show("s-meeting");
  $("m-code").textContent = "······";
  $<HTMLButtonElement>("b-copy").disabled = true;
  setStatus("m-status", "Creating meeting…");
  abort = new AbortController();
  const signal = abort.signal;
  try {
    const ice = await getIceServers();
    const link = makeLink(ice, 0, "m-status");
    signal.addEventListener("abort", () => { if (driver.link !== link) link.close(); });
    const offer = await link.createOffer();
    if (signal.aborted) return;
    const code = await createLobby(offer);
    const url = `${location.origin}${location.pathname}?code=${code}`;
    $("m-code").textContent = code;
    try { new BroadcastChannel("techken-dev").postMessage({ code }); } catch { /* dev harness only */ }
    const copy = $<HTMLButtonElement>("b-copy");
    copy.disabled = false;
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(url); setStatus("m-status", "Link copied. Send it to your opponent."); }
      catch { setStatus("m-status", url); }
    };
    if (navigator.share) {
      const share = $("b-share"); share.hidden = false;
      share.onclick = () => navigator.share({ title: "Techken", text: `Join my Techken meeting: ${code}`, url }).catch(() => {});
    }
    setStatus("m-status", "Waiting for someone to join… (code expires in 10 minutes)");
    const answer = await waitForAnswer(code, signal);
    setStatus("m-status", "Opponent found. Connecting…");
    await link.acceptAnswer(answer);
    watchConnect("m-status");
  } catch (e) {
    if (signal.aborted) return;
    setStatus("m-status", e instanceof LobbyError ? e.message : "Couldn't create the meeting.", true);
  }
});

async function join(raw: string) {
  const code = normalizeCode(raw);
  show("s-join");
  $<HTMLInputElement>("j-code").value = code;
  if (code.length !== 6) { setStatus("j-status", "That code isn't valid. Codes are 6 letters and numbers.", true); return; }
  abort = new AbortController();
  const signal = abort.signal;
  setStatus("j-status", `Joining ${code}…`);
  try {
    const ice = await getIceServers();
    const offer = await fetchOffer(code);
    const link = makeLink(ice, 1, "j-status");
    signal.addEventListener("abort", () => { if (driver.link !== link) link.close(); });
    const answer = await link.acceptOffer(offer);
    if (signal.aborted) return;
    await postAnswer(code, answer);
    setStatus("j-status", "Connecting…");
    watchConnect("j-status");
  } catch (e) {
    if (signal.aborted) return;
    setStatus("j-status", e instanceof LobbyError ? e.message : "Couldn't join the meeting.", true);
  }
}
$("b-join").addEventListener("click", () => { show("s-join"); setStatus("j-status", ""); $<HTMLInputElement>("j-code").focus(); });
$("b-join-go").addEventListener("click", () => join($<HTMLInputElement>("j-code").value));
$<HTMLInputElement>("j-code").addEventListener("keydown", (e) => { if (e.key === "Enter") join((e.target as HTMLInputElement).value); });

// ---------- netcode stats overlay + disconnect watchdog ----------
let route = "?";
setInterval(async () => {
  const s = driver.session;
  if (driver.mode !== "online" || !s) return;
  const quiet = performance.now() - s.stats.lastHeard;
  if (quiet > 10000 && $("s-msg").hidden) { message("DISCONNECTED", "Your opponent's connection dropped for 10 seconds. You win this match."); driver.startAttract(); return; }
  if (driver.link && s.frame % 120 < 20) route = await driver.link.route();
  if (!settings.debug) return;
  const st = s.stats;
  const avg = st.rollbacks ? (st.rolledFrames / st.rollbacks).toFixed(1) : "0";
  const lines = [
    `you P${s.me + 1} · route ${route}`,
    `ping ${Math.round(st.pingMs)} ms · delay ${s.delay}f`,
    `frame ${s.frame} · confirmed ${st.confirmed}`,
    `advantage ${st.advantage}f`,
    `rollbacks ${st.rollbacks} · avg ${avg}f · max ${st.maxRollback}f`,
    `stalls ${st.stalls} · sync waits ${st.syncStalls}`,
    st.desync ? `DESYNC at frame ${st.desyncFrame}!` : `checksums OK ${st.checksOk}`,
    settings.lag || settings.loss ? `lag sim ${settings.lag}±${settings.jitter} ms · ${settings.loss}% loss` : "lag sim off",
    quiet > 1500 ? `no data for ${(quiet / 1000).toFixed(1)} s…` : "",
  ];
  const el = $("debug");
  el.textContent = lines.filter(Boolean).join("\n");
  el.style.color = st.desync ? "var(--danger)" : "";
}, 250);

document.addEventListener("visibilitychange", () => {
  if (document.hidden && driver.mode === "practice") show("s-menu");
});

// ---------- start ----------
if (import.meta.env.DEV) (window as unknown as { techken: unknown }).techken = { driver, game: () => game, settings };
driver.startAttract();
const params = new URLSearchParams(location.search);
if (params.has("auto")) auto.enabled = true; // dev: random inputs for this page only
const qp = params.get("code");
if (qp) join(qp);
else if (params.has("host")) $("b-host").click(); // dev harness: create a meeting right away
else show("s-menu");
// dev harness: auto-ready on the pick screen
if (params.has("autopick")) {
  new MutationObserver(() => { const b = $<HTMLButtonElement>("p-ready"); if (!$("s-pick").hidden && !b.disabled) b.click(); })
    .observe($("s-pick"), { attributes: true });
}
