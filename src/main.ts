// TechkenOS: every menu screen, plus the glue between UI, driver and network.
import "./style.css";
import * as Phaser from "phaser";
import * as C from "./sim/constants";
import { ARENAS } from "./sim/arenas";
import { JOBS, JOB_CODES, JOB_NAMES } from "./sim/registry";
import { DEFAULT_CONFIG, PHASE_MATCH_END, type MatchConfig } from "./sim/sim";
import { ST } from "./sim/types";
import { Driver, implementedJobs } from "./game/driver";
import { Autoplay, CombinedInput, Keyboard, TouchPad } from "./game/input-sources";
import { GameScene } from "./render/GameScene";
import { PeerLink } from "./net/transport";
import { PROTOCOL_VERSION, type CtrlMsg } from "./net/protocol";
import { createLobby, fetchOffer, getIceServers, LobbyError, normalizeCode, postAnswer, waitForAnswer } from "./net/lobby-client";
import { ACTIONS, keyLabel, loadSettings, randomGuest, resetSettings, saveSettings, validName, type ActionId } from "./ui/settings";
import { META, PALETTES, paletteColor, paletteUnlocked } from "./ui/jobmeta";
import { LEVELS } from "./ai/cpu";
import { faceIcon, fullBodyIcon } from "./render/art/chibi";

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const params = new URLSearchParams(location.search);
const DEV = import.meta.env.DEV;

// ---------- settings, input, driver, renderer ----------
let settings = loadSettings();
const save = () => saveSettings(settings);
const kb = new Keyboard(() => settings);
const touch = new TouchPad($("#touch"));
const auto = new Autoplay();
auto.enabled = settings.auto || params.has("auto");
const driver = new Driver(new CombinedInput(kb, touch, auto));
const isTouch = matchMedia("(pointer: coarse)").matches || params.has("touch");

function simLoop() { driver.update(); requestAnimationFrame(simLoop); }
requestAnimationFrame(simLoop);
setInterval(() => driver.update(), 8);

let game: Phaser.Game | null = null;
const integerZoom = () => Math.max(1, Math.floor(Math.min(innerWidth / C.W, innerHeight / C.H)));
async function bootPhaser() {
  try { await Promise.race([document.fonts.load('8px "Press Start 2P"'), new Promise((r) => setTimeout(r, 1500))]); } catch { /* fallback font */ }
  const integer = settings.scaling === "integer";
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: "game", width: C.W, height: C.H, pixelArt: true, backgroundColor: "#05060a",
    scale: integer ? { mode: Phaser.Scale.NONE, zoom: integerZoom(), autoCenter: Phaser.Scale.CENTER_BOTH } : { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [new GameScene(driver, () => settings)],
  });
}
bootPhaser();
addEventListener("resize", () => { if (game && settings.scaling === "integer") (game.scale as unknown as { setZoom(z: number): void }).setZoom(integerZoom()); });

function applyLook() {
  document.documentElement.classList.toggle("big", settings.bigText);
  $("#crt").hidden = !settings.crt;
  const t = settings.touch, tp = $("#touch");
  tp.classList.toggle("lefty", t.leftHanded);
  tp.style.opacity = String(t.opacity / 100);
  $("#pad-move").style.transform = `translate(${t.lx}px, ${t.ly}px) scale(${t.size / 100})`;
  $("#pad-act").style.transform = `translate(${t.rx}px, ${t.ry}px) scale(${t.size / 100})`;
}
applyLook();

// ---------- window helpers ----------
const ui = $("#ui");
let onScreen = "";
function screen(name: string, html: string, desk = false): HTMLElement {
  onScreen = name;
  ui.innerHTML = `<section class="screen${desk ? " desk" : ""}" data-screen="${name}">${html}</section>`;
  setPlaying(false);
  const root = ui.firstElementChild as HTMLElement;
  root.querySelectorAll<HTMLElement>("[data-close]").forEach((b) => b.addEventListener("click", () => closeTo()));
  return root;
}
const win = (title: string, body: string, wide = false, closable = true) =>
  `<div class="window${wide ? " wide" : ""}"><div class="titlebar"><span>${esc(title)}</span>${closable ? `<button class="x" data-close aria-label="Close">×</button>` : ""}</div><div class="body">${body}</div></div>`;
let closeTo: () => void = () => showDesktop();
function setPlaying(on: boolean) {
  if (on) { ui.innerHTML = ""; onScreen = ""; }
  $("#touch").hidden = !(on && isTouch);
  $("#menu-btn").hidden = !on;
  $("#debug").hidden = !(on && settings.debug && driver.mode === "online");
  kb.enabled = on;
}
let toastT = 0;
function toast(msg: string) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = window.setTimeout(() => (t.hidden = true), 3000); }
function message(title: string, text: string) {
  closeTo = () => showDesktop();
  screen("msg", win(title, `<p class="status">${esc(text)}</p><div class="row"><button class="btn primary" data-close>BACK TO DESKTOP</button></div>`));
}

// ---------- first launch: temporary name ----------
function showName(then: () => void) {
  const root = screen("name", win("WELCOME TO TECHKEN OS", `
    <p class="lead">No account needed. Pick a temporary name (you can change it any time in the Control Panel).</p>
    <input type="text" id="nm" maxlength="16" value="${esc(settings.name || randomGuest())}" autocomplete="off" spellcheck="false">
    <p class="status" id="nm-st"></p>
    <div class="row"><button class="btn primary" id="nm-go">CONTINUE</button></div>`, false, false));
  const go = () => {
    const v = ($("#nm", root) as HTMLInputElement).value.trim();
    const err = validName(v);
    if (err) { const st = $("#nm-st", root); st.textContent = err; st.classList.add("err"); return; }
    settings.name = v; save(); then();
  };
  $("#nm-go", root).addEventListener("click", go);
  $("#nm", root).addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") go(); });
}

// ---------- Desktop ----------
function showDesktop() {
  abortPending();
  driver.startAttract();
  driver.view = { names: ["", ""], palettes: [0, 0] };
  closeTo = () => showDesktop();
  const icon = (id: string, glyph: string, label: string, note = "", disabled = false) =>
    `<button class="icon" id="${id}" ${disabled ? "disabled" : ""}><span class="glyph">${glyph}</span><span>${label}</span>${note ? `<small>${note}</small>` : ""}</button>`;
  const root = screen("desktop", `<div class="desktop">
    <div class="logo">TECHKEN</div>
    <div class="icons">
      ${icon("i-cpu", "VS", "Vs CPU")}
      ${icon("i-online", "@", "Online", "lobby codes")}
      ${icon("i-career", "▲", "Career", "phase 8", true)}
      ${icon("i-sandbox", "◇", "Sandbox", "phase 8", true)}
      ${icon("i-swag", "★", "Swag Drawer")}
      ${icon("i-cp", "⚙", "Control Panel")}
    </div>
    <div class="taskbar"><span class="start">▶ START</span><span class="grow">${esc(settings.name)} · Employee</span><span id="clock"></span></div>
  </div>`, true);
  $("#i-cpu", root).addEventListener("click", () => openDirectory("practice"));
  $("#i-online", root).addEventListener("click", showMeetingRoom);
  $("#i-swag", root).addEventListener("click", () => showSwag());
  $("#i-cp", root).addEventListener("click", () => showControlPanel());
  tickClock();
}
function tickClock() { const c = document.getElementById("clock"); if (c) c.textContent = new Date().toTimeString().slice(0, 5); }
setInterval(tickClock, 15000);

// ---------- Employee Directory ----------
type PickMode = "practice" | "host" | "guest";
interface Pick { job: number; set: number; palette: number }
let dirReady: ((p: Pick) => void) | null = null;

function statsHtml(k: number) {
  const m = META[k], names = ["SPD", "RNG", "WGT", "CHG"];
  return `<dl class="stats">${m.stats.map((v, n) => `<dt>${names[n]}</dt><dd>${[1, 2, 3, 4, 5].map((p) => `<span class="pip${p <= v ? " on" : ""}"></span>`).join("")}</dd>`).join("")}</dl>`;
}
function setCardHtml(k: number, set: number, pressed: boolean) {
  const st = JOBS[k]!.sets[set];
  return `<button class="setcard" data-set="${set}" aria-pressed="${pressed}"><h4>SET ${"AB"[set]}: "${esc(st.name)}"</h4><span class="pas">◆ ${esc(st.passive)}: ${esc(st.passiveDesc)}</span>` +
    st.skills.map((sk, n) => `<span class="sk">${"UIO"[n]} · ${esc(sk.name)}${sk.aim ? " (aim)" : ""} (${sk.cost / 100}${sk.tok ? ` + ${sk.tok / 100} tok` : ""} / ${sk.cd / 60}s): ${esc(sk.desc)}</span>`).join("") +
    `<span class="sk"><i>${esc(st.combo)}</i></span></button>`;
}
function openDirectory(mode: PickMode, ready?: (p: Pick) => void) {
  dirReady = ready ?? null;
  closeTo = mode === "practice" ? () => showDesktop() : () => { leaveOnline(); showDesktop(); };
  let random = false;
  const render = () => {
    const k = settings.job, j = JOBS[k]!, m = META[k];
    const opp = mode === "practice"
      ? (settings.cpu >= 0 ? `<div class="sprite"><img class="body flip" src="${fullBodyIcon(settings.cpu)}" alt=""></div><p class="jobname">${esc(JOB_NAMES[settings.cpu])}</p>` : `<div class="sprite"><div class="mystery">?</div></div><p class="muted">Random CPU</p>`)
      : `<div class="sprite"><div class="mystery">?</div></div><p class="muted" id="opp-st">${net?.theirs ? "READY" : "choosing…"}</p><p class="muted">${esc(net?.them ?? "")}</p>`;
    const optsHtml = mode === "guest" ? "" : `<div class="row opts">
        <label>Arena <select id="o-arena">${ARENAS.map((a, n) => `<option value="${n}" ${n === settings.arena ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></label>
        ${mode === "practice" ? `<label>CPU <select id="o-cpu"><option value="-1">Random</option>${implementedJobs().map((n) => `<option value="${n}" ${n === settings.cpu ? "selected" : ""}>${esc(JOB_NAMES[n])}</option>`).join("")}</select></label>
        <label>Difficulty <select id="o-lvl">${LEVELS.map((l, n) => `<option value="${n + 1}" ${n + 1 === settings.cpuLevel ? "selected" : ""}>${n + 1} · ${l.name}</option>`).join("")}</select></label>` : ""}
        <label><input type="checkbox" id="o-items" ${settings.items ? "checked" : ""}> Items</label>
        <label><input type="checkbox" id="o-haz" ${settings.hazards ? "checked" : ""}> Hazards</label>
      </div>`;
    const root = screen("dir", win("EMPLOYEE DIRECTORY", `
      <div class="dir">
        <div class="side"><h4>YOU · ${esc(settings.name)}</h4>
          ${random ? `<div class="sprite"><div class="mystery">?</div></div><p class="jobname">RANDOM</p>` :
          `<div class="sprite"><img class="body" src="${fullBodyIcon(k, settings.palette)}" alt=""></div>
          <p class="jobname">${esc(j.name)}</p><p class="muted">"${esc(m.tag)}" · ${esc(m.arch)} · ${"★".repeat(m.diff)}${"☆".repeat(4 - m.diff)}</p>
          ${statsHtml(k)}<p class="muted">${esc(m.weapon)} · charge ${(j.chargeFull / 60).toFixed(1)} s · ${j.tap}/${j.full}</p>`}
        </div>
        <div style="display:grid;gap:10px;min-width:0">
          <div class="pickgrid" role="listbox" aria-label="Jobs">
            ${JOB_NAMES.map((n, idx) => `<button data-job="${idx}" title="${esc(n)}" aria-label="${esc(n)}" aria-selected="${!random && idx === k}" style="background:${hex(JOBS[idx]!.color)}"><img src="${faceIcon(idx, 0, hex(JOBS[idx]!.color))}" alt=""><span>${JOB_CODES[idx]}</span></button>`).join("")}
            <button class="rand" data-job="-1" aria-selected="${random}" title="Random job, set and palette">?</button>
          </div>
          ${random ? `<p class="muted">Job, set and palette are picked at random and revealed on the VS screen.</p>` : `<div class="sets">${setCardHtml(k, 0, settings.set === 0)}${setCardHtml(k, 1, settings.set === 1)}</div>
          <div class="pals">${PALETTES.map((p, n) => `<button data-pal="${n}" aria-pressed="${n === settings.palette}" ${paletteUnlocked(n) ? "" : "disabled title='Unlocks in Career'"}><i style="background:${hex(paletteColor(j.color, n))}"></i>${p}${paletteUnlocked(n) ? "" : " 🔒"}</button>`).join("")}</div>`}
          ${optsHtml}
          <div class="row"><button class="btn primary" id="ready">READY</button><span class="status" id="dir-st">${mode === "practice" ? "" : "Your pick stays hidden until you're both ready."}</span></div>
        </div>
        <div class="side them"><h4>${mode === "practice" ? "CPU" : "OPPONENT"}</h4>${opp}</div>
      </div>`, true));
    root.querySelectorAll<HTMLElement>("[data-job]").forEach((b) => b.addEventListener("click", () => {
      const n = Number(b.dataset.job);
      if (n < 0) random = true; else { random = false; if (n !== settings.job) { settings.job = n; settings.set = 0; } }
      save(); render();
    }));
    root.querySelectorAll<HTMLElement>("[data-set]").forEach((b) => b.addEventListener("click", () => { settings.set = Number(b.dataset.set); save(); render(); }));
    root.querySelectorAll<HTMLElement>("[data-pal]").forEach((b) => b.addEventListener("click", () => { settings.palette = Number(b.dataset.pal); save(); render(); }));
    const sel = (id: string) => root.querySelector<HTMLSelectElement>(id);
    sel("#o-arena")?.addEventListener("change", (e) => { settings.arena = Number((e.target as HTMLSelectElement).value); save(); });
    sel("#o-cpu")?.addEventListener("change", (e) => { settings.cpu = Number((e.target as HTMLSelectElement).value); save(); render(); });
    sel("#o-lvl")?.addEventListener("change", (e) => { settings.cpuLevel = Number((e.target as HTMLSelectElement).value); save(); });
    root.querySelector<HTMLInputElement>("#o-items")?.addEventListener("change", (e) => { settings.items = (e.target as HTMLInputElement).checked; save(); });
    root.querySelector<HTMLInputElement>("#o-haz")?.addEventListener("change", (e) => { settings.hazards = (e.target as HTMLInputElement).checked; save(); });
    $("#ready", root).addEventListener("click", () => {
      const jobs = implementedJobs();
      const p: Pick = random
        ? { job: jobs[Math.floor(Math.random() * jobs.length)], set: Math.floor(Math.random() * 2), palette: Math.floor(Math.random() * 2) }
        : { job: settings.job, set: settings.set, palette: settings.palette };
      if (mode === "practice") startPractice(p);
      else { ($("#ready", root) as HTMLButtonElement).disabled = true; $("#dir-st", root).textContent = "Ready. Waiting for your opponent…"; dirReady?.(p); }
    });
    if (params.has("autopick") && mode !== "practice") setTimeout(() => ($("#ready", root) as HTMLButtonElement)?.click(), 300);
  };
  render();
}

function startPractice(p: Pick) {
  const jobs = implementedJobs();
  const cj = settings.cpu >= 0 ? settings.cpu : jobs[Math.floor(Math.random() * jobs.length)];
  const cfg: MatchConfig = { ...DEFAULT_CONFIG, jobs: [p.job, cj], sets: [p.set, Math.floor(Math.random() * 2)], arena: settings.arena, items: settings.items, hazards: settings.hazards, seed: (Math.random() * 2 ** 31) | 0 };
  const cpuPal = cj === p.job && p.palette === 0 ? 1 : 0;
  lastPractice = p;
  const cpuName = `CPU · ${LEVELS[settings.cpuLevel - 1].name}`;
  showVS(cfg, [settings.name, cpuName], [p.palette, cpuPal], () => {
    driver.startPractice(cfg, settings.cpuLevel);
    driver.view = { names: [settings.name, cpuName], palettes: [p.palette, cpuPal] };
    playing();
  });
}
let lastPractice: Pick | null = null;

// ---------- VS screen ----------
function showVS(cfg: MatchConfig, names: [string, string], pals: [number, number], then: () => void) {
  const side = (i: 0 | 1) => {
    const j = JOBS[cfg.jobs[i]]!;
    return `<div class="who"><img class="vsbody${i ? " flip" : ""}" src="${fullBodyIcon(cfg.jobs[i], pals[i])}" alt="" style="justify-self:${i ? "end" : "start"}">${esc(names[i] || `P${i + 1}`)}<small>${esc(j.name)} · Set ${"AB"[cfg.sets[i]]} "${esc(j.sets[cfg.sets[i]].name)}"</small></div>`;
  };
  ui.innerHTML = `<div class="vs" id="vs"><div class="half l">${side(0)}</div><div class="half r">${side(1)}</div><div class="bigvs">VS</div><div class="arena">${esc(ARENAS[cfg.arena].name.toUpperCase())}</div></div>`;
  onScreen = "vs";
  setPlaying(false);
  let done = false;
  const go = () => { if (done) return; done = true; removeEventListener("keydown", go); then(); };
  setTimeout(go, 2500);
  if (driver.mode !== "online") { addEventListener("keydown", go, { once: true }); $("#vs").addEventListener("pointerdown", go); }
}

// ---------- in-match: menu chip, pause, post-mortem ----------
let postShown = false;
function playing() { postShown = false; setPlaying(true); }
$("#menu-btn").addEventListener("click", showPause);
addEventListener("keydown", (e) => { if (e.key === "Escape" && onScreen === "" && driver.mode !== "attract") showPause(); });
function showPause() {
  const online = driver.mode === "online";
  if (!online) driver.paused = true;
  const s = driver.state, me = driver.me, f = s.f[me], st = JOBS[f.job]!.sets[f.set];
  closeTo = () => { driver.paused = false; playing(); };
  const root = screen("pause", win(online ? "MENU (THE MATCH KEEPS RUNNING)" : "PAUSED", `
    <div class="row">
      ${online ? "" : `<button class="btn primary" id="p-resume">RESUME</button><button class="btn" id="p-restart">RESTART FIGHT</button>`}
      <button class="btn" id="p-cp">CONTROL PANEL</button>
      <button class="btn" id="p-quit">${online ? "FORFEIT" : "QUIT TO DESKTOP"}</button>
    </div>
    <h3 class="sec">MOVE LIST · ${esc(JOBS[f.job]!.name.toUpperCase())}</h3>
    <div class="sets" style="grid-template-columns:1fr">${setCardHtml(f.job, f.set, true)}</div>
    <p class="muted">Quirk: ${esc(META[f.job].weapon)}. ${esc(st.combo)}</p>`));
  $("#p-resume", root)?.addEventListener("click", () => closeTo());
  $("#p-restart", root)?.addEventListener("click", () => { driver.paused = false; if (lastPractice) startPractice(lastPractice); });
  $("#p-cp", root).addEventListener("click", () => showControlPanel("controls", () => showPause()));
  $("#p-quit", root).addEventListener("click", () => {
    if (online && !confirmForfeit) { confirmForfeit = true; ($("#p-quit", root) as HTMLButtonElement).textContent = "FORFEIT? CLICK AGAIN"; return; }
    confirmForfeit = false; driver.paused = false; leaveOnline(); showDesktop();
  });
}
let confirmForfeit = false;

setInterval(() => {
  const s = driver.state;
  if (driver.mode === "attract" || onScreen !== "" || postShown) return;
  if (s.phase === PHASE_MATCH_END && s.phaseT <= 1) { postShown = true; showPost(); }
}, 200);

function showPost() {
  const s = driver.state, me = driver.mode === "online" ? driver.me : 0;
  const names = driver.view.names.map((n, i) => n || `P${i + 1}`);
  const w = s.matchWinner;
  const head = w === 2 ? "DRAW" : w === me ? "YOU WIN!" : `${names[w].toUpperCase()} WINS`;
  const rows: [string, number][] = [["Damage dealt", ST.DMG], ["Longest combo", ST.MAX_COMBO], ["Burnouts", ST.BURNOUTS], ["Items grabbed", ST.ITEMS], ["Perfect rounds", ST.PERFECT]];
  const online = driver.mode === "online";
  closeTo = () => { leaveOnline(); showDesktop(); };
  const root = screen("post", win("POST-MORTEM", `
    <p class="winner">${esc(head)}</p>
    <p class="muted">${s.wins[0]} – ${s.wins[1]} · ${esc(ARENAS[s.cfg.arena].name)}${s.tiebreak ? " · decided by a Production Incident" : ""}</p>
    <table class="pm"><thead><tr><th></th><th>${esc(names[0])} (${JOB_CODES[s.f[0].job]})</th><th>${esc(names[1])} (${JOB_CODES[s.f[1].job]})</th></tr></thead>
    <tbody>${rows.map(([label, k]) => `<tr><td>${label}</td><td>${s.stats[0][k]}</td><td>${s.stats[1][k]}</td></tr>`).join("")}</tbody></table>
    <div class="row">
      <button class="btn primary" id="pm-again">REMATCH</button>
      <button class="btn" id="pm-change">CHANGE EMPLOYEE</button>
      <button class="btn" id="pm-desk">DESKTOP</button>
    </div>
    <p class="status" id="pm-st">${online ? "Rematch needs both of you to accept." : ""}</p>`));
  $("#pm-desk", root).addEventListener("click", () => closeTo());
  $("#pm-again", root).addEventListener("click", () => {
    if (!online) { if (lastPractice) startPractice(lastPractice); return; }
    if (!net) return;
    net.wantRematch = true; net.link.sendCtrl({ t: "rematch" });
    ($("#pm-again", root) as HTMLButtonElement).disabled = true;
    $("#pm-st", root).textContent = net.theyRematch ? "Starting…" : "Waiting for your opponent to accept…";
    tryRematch();
  });
  $("#pm-change", root).addEventListener("click", () => {
    if (!online) { openDirectory("practice"); return; }
    if (!net) return;
    net.link.sendCtrl({ t: "repick" });
    repickOnline();
  });
}

// ---------- online ----------
interface Net { link: PeerLink; role: 0 | 1; them: string; mine?: Pick; theirs?: Pick; started: boolean; wantRematch: boolean; theyRematch: boolean }
let net: Net | null = null;
let abort: AbortController | null = null;
let connectTimer = 0;
function abortPending() { abort?.abort(); abort = null; clearTimeout(connectTimer); }
function leaveOnline() {
  abortPending();
  if (net) { try { net.link.close(); } catch { /* ignore */ } }
  net = null;
  driver.stopOnline();
}
function applyLag() { const l = net?.link; if (l) l.lag = { delayMs: settings.lag, jitterMs: settings.jitter, lossPct: settings.loss }; }

function showMeetingRoom() {
  closeTo = () => { leaveOnline(); showDesktop(); };
  const root = screen("meeting", win("MEETING ROOM", `
    <div class="cols">
      <div style="display:grid;gap:10px;align-content:start">
        <h3 class="sec">HOST A MEETING</h3>
        <p class="label">Meeting ID</p><p class="code" id="m-code">······</p>
        <div class="row"><button class="btn primary" id="m-create">CREATE MEETING</button><button class="btn" id="m-copy" hidden>COPY LINK</button><button class="btn" id="m-share" hidden>SHARE</button></div>
        <p class="status" id="m-st" aria-live="polite"></p>
      </div>
      <div style="display:grid;gap:10px;align-content:start">
        <h3 class="sec">JOIN A MEETING</h3>
        <label class="label" for="j-code">Meeting ID or link</label>
        <input id="j-code" class="codein" maxlength="80" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="K7QX2M">
        <div class="row"><button class="btn primary" id="j-go">JOIN</button></div>
        <p class="status" id="j-st" aria-live="polite"></p>
      </div>
    </div>
    <p class="muted">Both players need to be online at the same time. Codes expire after 10 minutes. Netcode test settings are in Control Panel → Online.</p>`, true));
  $("#m-create", root).addEventListener("click", () => host(root));
  $("#j-go", root).addEventListener("click", () => join(($("#j-code", root) as HTMLInputElement).value, root));
  $("#j-code", root).addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") join((e.target as HTMLInputElement).value, root); });
  return root;
}
function setSt(root: HTMLElement, id: string, text: string, err = false) { const el = $(id, root); if (el) { el.textContent = text; el.classList.toggle("err", err); } }

function makeLink(ice: RTCIceServer[], role: 0 | 1, onStatus: (t: string, err?: boolean) => void): PeerLink {
  const link: PeerLink = new PeerLink(ice, settings.relay, {
    onOpen: () => { clearTimeout(connectTimer); onStatus("Connected."); link.sendCtrl({ t: "hello", v: PROTOCOL_VERSION, delay: settings.delay, name: settings.name }); },
    onCtrl: (m: CtrlMsg) => {
      if (!net || net.link !== link) return;
      switch (m.t) {
        case "hello":
          if (m.v !== PROTOCOL_VERSION) { leaveOnline(); message("VERSION MISMATCH", "You and your opponent are on different versions. Both refresh the page and try again."); return; }
          net.them = String(m.name || "opponent").slice(0, 16);
          if (net.them === settings.name) net.them += role === 0 ? " #2" : " #1";
          openOnlinePick();
          break;
        case "pick":
          if (JOBS[m.job] && (m.set === 0 || m.set === 1)) net.theirs = { job: m.job, set: m.set, palette: m.palette === 1 ? 1 : 0 };
          { const el = document.getElementById("opp-st"); if (el) el.textContent = "READY"; }
          tryStart();
          break;
        case "start":
          if (role === 1) beginMatch(m.cfg, m.palettes);
          break;
        case "rematch":
          net.theyRematch = true;
          if (!net.wantRematch) toast(`${net.them} wants a rematch.`);
          tryRematch();
          break;
        case "repick":
          toast(`${net.them} is changing employee.`);
          repickOnline();
          break;
        case "bye":
          leaveOnline(); message("OPPONENT LEFT", "Your opponent left the meeting.");
          break;
      }
    },
    onGame: (m) => { if (driver.link === link && m.e === driver.epoch) driver.session?.onMessage(m); },
    onClose: (reason) => {
      clearTimeout(connectTimer);
      if (!net || net.link !== link) return;
      if (driver.link === link || net.started) { leaveOnline(); message("DISCONNECTED", `${reason} Your opponent's connection dropped.`); }
      else onStatus(`${reason} If one of you is on mobile data or office Wi-Fi, the TURN relay is needed.`, true);
    },
  });
  net = { link, role, them: "", started: false, wantRematch: false, theyRematch: false };
  return link;
}

function openOnlinePick() {
  if (!net) return;
  net.mine = undefined; net.started = false; net.wantRematch = false; net.theyRematch = false;
  openDirectory(net.role === 0 ? "host" : "guest", (p) => { if (!net) return; net.mine = p; net.link.sendCtrl({ t: "pick", ...p }); tryStart(); });
}
function repickOnline() {
  if (!net) return;
  const l = driver.keepLink(); void l;
  driver.startAttract();
  net.theirs = undefined;
  openOnlinePick();
}
function hostConfig(): { cfg: MatchConfig; palettes: [number, number] } | null {
  if (!net || !net.mine || !net.theirs) return null;
  const a = net.mine, b = net.theirs;
  const cfg: MatchConfig = { ...DEFAULT_CONFIG, jobs: [a.job, b.job], sets: [a.set, b.set], arena: settings.arena, items: settings.items, hazards: settings.hazards, seed: (Math.random() * 2 ** 31) | 0 };
  const pals: [number, number] = [a.palette, a.job === b.job && a.palette === b.palette ? (b.palette + 1) % 2 : b.palette]; // mirror match
  return { cfg, palettes: pals };
}
function tryStart() {
  if (!net || net.role !== 0 || net.started) return;
  const hc = hostConfig();
  if (!hc) return;
  net.link.sendCtrl({ t: "start", cfg: hc.cfg, palettes: hc.palettes });
  beginMatch(hc.cfg, hc.palettes);
}
function tryRematch() {
  if (!net || !net.wantRematch || !net.theyRematch) return;
  driver.keepLink();
  net.started = false; net.wantRematch = false; net.theyRematch = false;
  if (net.role === 0) tryStart();
}
function beginMatch(cfg: MatchConfig, palettes: [number, number]) {
  if (!net) return;
  net.started = true;
  const role = net.role, link = net.link;
  const names: [string, string] = role === 0 ? [settings.name, net.them] : [net.them, settings.name];
  history.replaceState(null, "", location.pathname);
  showVS(cfg, names, palettes, () => {
    if (!net || net.link !== link) return;
    driver.startOnline(link, role, settings.delay, cfg);
    driver.view = { names, palettes };
    applyLag();
    playing();
  });
}

function watchConnect(onStatus: (t: string, err?: boolean) => void) {
  clearTimeout(connectTimer);
  connectTimer = window.setTimeout(() => onStatus("Still can't connect. Check your network, or turn on Force TURN relay (Control Panel → Online) if TURN is set up.", true), 15000);
}

async function host(root: HTMLElement) {
  leaveOnline();
  ($("#m-create", root) as HTMLButtonElement).disabled = true;
  const st = (t: string, err = false) => setSt(root, "#m-st", t, err);
  st("Creating meeting…");
  abort = new AbortController();
  const signal = abort.signal;
  try {
    const ice = await getIceServers();
    const link = makeLink(ice, 0, st);
    const offer = await link.createOffer();
    if (signal.aborted) return;
    const code = await createLobby(offer);
    const url = `${location.origin}${location.pathname}?code=${code}`;
    $("#m-code", root).textContent = code;
    try { new BroadcastChannel("techken-dev").postMessage({ code }); } catch { /* dev harness only */ }
    const copy = $("#m-copy", root) as HTMLButtonElement;
    copy.hidden = false;
    copy.onclick = async () => { try { await navigator.clipboard.writeText(url); st("Link copied. Send it to your opponent."); } catch { st(url); } };
    if (navigator.share) { const sh = $("#m-share", root); sh.hidden = false; sh.onclick = () => navigator.share({ title: "Techken", text: `Join my Techken meeting: ${code}`, url }).catch(() => {}); }
    st("Waiting for someone to join…");
    const answer = await waitForAnswer(code, signal);
    st("Opponent found. Connecting…");
    await link.acceptAnswer(answer);
    watchConnect(st);
  } catch (e) {
    if (signal.aborted) return;
    st(e instanceof LobbyError ? e.message : "Couldn't create the meeting.", true);
    ($("#m-create", root) as HTMLButtonElement).disabled = false;
  }
}

async function join(raw: string, root: HTMLElement) {
  leaveOnline();
  const code = normalizeCode(raw);
  ($("#j-code", root) as HTMLInputElement).value = code;
  const st = (t: string, err = false) => setSt(root, "#j-st", t, err);
  if (code.length !== 6) { st("That code isn't valid. Codes are 6 letters and numbers.", true); return; }
  abort = new AbortController();
  const signal = abort.signal;
  st(`Joining ${code}…`);
  try {
    const ice = await getIceServers();
    const offer = await fetchOffer(code);
    const link = makeLink(ice, 1, st);
    const answer = await link.acceptOffer(offer);
    if (signal.aborted) return;
    await postAnswer(code, answer);
    st("Connecting…");
    watchConnect(st);
  } catch (e) {
    if (signal.aborted) return;
    st(e instanceof LobbyError ? e.message : "Couldn't join the meeting.", true);
  }
}

// ---------- Control Panel ----------
type CpTab = "audio" | "controls" | "gameplay" | "display" | "access" | "online" | "data";
function showControlPanel(tab: CpTab = "controls", back?: () => void) {
  closeTo = back ?? (() => showDesktop());
  const tabs: [CpTab, string][] = [["audio", "AUDIO"], ["controls", "CONTROLS"], ["gameplay", "GAMEPLAY"], ["display", "DISPLAY"], ["access", "ACCESSIBILITY"], ["online", "ONLINE"], ["data", "DATA"]];
  const chk = (id: string, on: boolean, label: string) => `<label><span>${label}</span><input type="checkbox" id="${id}" ${on ? "checked" : ""}></label>`;
  const rng = (id: string, v: number, label: string, min = 0, max = 100) => `<label><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" value="${v}"></label>`;
  const sel = (id: string, v: string | number, label: string, opts: [string | number, string][]) => `<label><span>${label}</span><select id="${id}">${opts.map(([k, t]) => `<option value="${k}" ${String(k) === String(v) ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  let body = "";
  switch (tab) {
    case "audio": body = `${rng("v-master", settings.vol.master, "Master")}${rng("v-music", settings.vol.music, "Music")}${rng("v-sfx", settings.vol.sfx, "SFX")}${rng("v-ann", settings.vol.announcer, "Announcer")}
      ${chk("c-mono", settings.mono, "Mono audio")}${chk("c-muffle", settings.muffle, "Muffle music during my Burnout")}<p class="muted">Sound arrives in phase 7; these are saved now.</p>`; break;
    case "controls": body = `<h3 class="sec">KEYBOARD</h3><div class="binds">${ACTIONS.map((a) => `<span>${a.label}</span><button data-bind="${a.id}" data-n="0">${esc(keyLabel(settings.keys[a.id][0] ?? "—"))}</button><button data-bind="${a.id}" data-n="1">${esc(keyLabel(settings.keys[a.id][1] ?? "—"))}</button>`).join("")}</div>
      <div class="row"><button class="btn" id="k-reset">RESET KEYS</button></div>
      <h3 class="sec">TOUCH</h3>${chk("t-lefty", settings.touch.leftHanded, "Left-handed (mirror)")}${rng("t-size", settings.touch.size, "Button size %", 70, 140)}${rng("t-op", settings.touch.opacity, "Button opacity %", 30, 100)}
      <div class="row"><button class="btn" id="t-edit">EDIT TOUCH LAYOUT</button><button class="btn" id="t-reset">RESET LAYOUT</button></div>`; break;
    case "gameplay": body = `${chk("g-dmg", settings.dmgNumbers, "Damage numbers")}${chk("g-shake", settings.shake, "Screen shake")}${chk("g-tips", settings.tips, "Contextual tips (Career)")}`; break;
    case "display": body = `${sel("d-scale", settings.scaling, "Scaling", [["fit", "Fill screen"], ["integer", "Whole-number (sharpest)"]])}${chk("d-crt", settings.crt, "CRT scanline filter")}
      <div class="row"><button class="btn" id="d-full">FULLSCREEN</button></div><p class="muted">Whole-number scaling applies after a reload.</p>`; break;
    case "access": body = `${chk("a-flash", settings.reduceFlash, "Reduce flashing")}${chk("a-big", settings.bigText, "Larger UI text")}${chk("a-cb", settings.colorblind, "Colorblind-safe HP colors")}`; break;
    case "online": body = `<label><span>Name</span><input type="text" id="o-name" maxlength="16" value="${esc(settings.name)}"></label><p class="status" id="o-name-st"></p>
      ${sel("o-delay", settings.delay, "Input delay", [0, 1, 2, 3, 4].map((n) => [n, `${n} frame${n === 1 ? "" : "s"}`]))}
      ${chk("o-debug", settings.debug, "Show netcode stats")}
      <h3 class="sec">TEST SETTINGS</h3>
      ${sel("o-lag", settings.lag, "Simulated lag (one way)", [[0, "Off"], [25, "25 ms"], [50, "50 ms"], [75, "75 ms"], [100, "100 ms"], [150, "150 ms"]])}
      ${sel("o-jit", settings.jitter, "Jitter", [[0, "Off"], [10, "±10 ms"], [25, "±25 ms"], [50, "±50 ms"]])}
      ${sel("o-loss", settings.loss, "Packet loss", [[0, "0 %"], [2, "2 %"], [5, "5 %"], [10, "10 %"], [20, "20 %"]])}
      ${chk("o-relay", settings.relay, "Force TURN relay")}${chk("o-auto", settings.auto, "Autoplay (random inputs)")}`; break;
    case "data": body = `<p class="muted">Your progress lives in this browser. Transfer by code or QR arrives in phase 9.</p>
      <div class="row"><button class="btn" disabled>TRANSFER PROGRESS (PHASE 9)</button><button class="btn" id="x-reset">RESET SETTINGS</button></div><p class="status" id="x-st"></p>`; break;
  }
  const root = screen("cp", win("CONTROL PANEL", `<div class="tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${t}</button>`).join("")}</div><div class="form">${body}</div>`, true));
  root.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.addEventListener("click", () => showControlPanel(b.dataset.tab as CpTab, back)));
  const on = (id: string, ev: string, fn: (el: HTMLInputElement) => void) => { const el = root.querySelector<HTMLInputElement>(id); if (el) el.addEventListener(ev, () => { fn(el); save(); applyLook(); }); };
  on("#v-master", "input", (e) => (settings.vol.master = +e.value)); on("#v-music", "input", (e) => (settings.vol.music = +e.value));
  on("#v-sfx", "input", (e) => (settings.vol.sfx = +e.value)); on("#v-ann", "input", (e) => (settings.vol.announcer = +e.value));
  on("#c-mono", "change", (e) => (settings.mono = e.checked)); on("#c-muffle", "change", (e) => (settings.muffle = e.checked));
  on("#t-lefty", "change", (e) => (settings.touch.leftHanded = e.checked)); on("#t-size", "input", (e) => (settings.touch.size = +e.value)); on("#t-op", "input", (e) => (settings.touch.opacity = +e.value));
  on("#g-dmg", "change", (e) => (settings.dmgNumbers = e.checked)); on("#g-shake", "change", (e) => (settings.shake = e.checked)); on("#g-tips", "change", (e) => (settings.tips = e.checked));
  on("#d-scale", "change", (e) => (settings.scaling = e.value as "fit" | "integer")); on("#d-crt", "change", (e) => (settings.crt = e.checked));
  on("#a-flash", "change", (e) => (settings.reduceFlash = e.checked)); on("#a-big", "change", (e) => (settings.bigText = e.checked)); on("#a-cb", "change", (e) => (settings.colorblind = e.checked));
  on("#o-delay", "change", (e) => (settings.delay = +e.value)); on("#o-debug", "change", (e) => (settings.debug = e.checked));
  on("#o-lag", "change", (e) => { settings.lag = +e.value; applyLag(); }); on("#o-jit", "change", (e) => { settings.jitter = +e.value; applyLag(); });
  on("#o-loss", "change", (e) => { settings.loss = +e.value; applyLag(); }); on("#o-relay", "change", (e) => (settings.relay = e.checked));
  on("#o-auto", "change", (e) => { settings.auto = e.checked; auto.enabled = e.checked; });
  on("#o-name", "change", (e) => { const err = validName(e.value.trim()); const st = $("#o-name-st", root); if (err) { st.textContent = err; st.classList.add("err"); e.value = settings.name; } else { settings.name = e.value.trim(); st.textContent = "Saved."; st.classList.remove("err"); } });
  root.querySelector("#d-full")?.addEventListener("click", () => document.documentElement.requestFullscreen?.().catch(() => toast("This browser doesn't allow fullscreen here. On iPhone, use Add to Home Screen.")));
  root.querySelector("#k-reset")?.addEventListener("click", () => { settings.keys = Object.fromEntries(ACTIONS.map((a) => [a.id, [...a.keys]])) as Record<ActionId, string[]>; save(); kb.rebuild(); showControlPanel("controls", back); });
  root.querySelector("#t-reset")?.addEventListener("click", () => { Object.assign(settings.touch, { lx: 0, ly: 0, rx: 0, ry: 0, size: 100, opacity: 100 }); save(); applyLook(); showControlPanel("controls", back); });
  root.querySelector("#t-edit")?.addEventListener("click", () => editTouch(() => showControlPanel("controls", back)));
  root.querySelector("#x-reset")?.addEventListener("click", (ev) => {
    const b = ev.target as HTMLButtonElement;
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "SURE? CLICK AGAIN"; return; }
    settings = resetSettings(settings.name); kb.rebuild(); applyLook(); setSt(root, "#x-st", "Settings reset.");
  });
  // key rebinding
  root.querySelectorAll<HTMLButtonElement>("[data-bind]").forEach((b) => b.addEventListener("click", () => {
    b.classList.add("wait"); b.textContent = "PRESS…";
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const id = b.dataset.bind as ActionId, n = Number(b.dataset.n);
      if (e.code !== "Escape") {
        for (const a of ACTIONS) settings.keys[a.id] = settings.keys[a.id].filter((k) => k !== e.code); // one action per key
        const list = settings.keys[id];
        list[n] = e.code;
        settings.keys[id] = list.filter(Boolean);
        save(); kb.rebuild();
      }
      showControlPanel("controls", back);
    };
    addEventListener("keydown", handler, { once: true, capture: true });
  }));
}

function editTouch(done: () => void) {
  ui.innerHTML = ""; onScreen = "touch-edit";
  const tp = $("#touch");
  tp.hidden = false; tp.classList.add("editing"); touch.editing = true; $("#touch-edit").hidden = false;
  const drag = (pad: HTMLElement, kx: "lx" | "rx", ky: "ly" | "ry") => {
    pad.onpointerdown = (e) => {
      const sx = e.clientX - settings.touch[kx], sy = e.clientY - settings.touch[ky];
      pad.setPointerCapture(e.pointerId);
      pad.onpointermove = (m) => { settings.touch[kx] = Math.round(m.clientX - sx); settings.touch[ky] = Math.round(m.clientY - sy); applyLook(); };
      pad.onpointerup = () => { pad.onpointermove = null; save(); };
    };
  };
  drag($("#pad-move"), "lx", "ly"); drag($("#pad-act"), "rx", "ry");
  $("#touch-done").onclick = () => {
    tp.classList.remove("editing"); touch.editing = false; $("#touch-edit").hidden = true; tp.hidden = true;
    $("#pad-move").onpointerdown = null; $("#pad-act").onpointerdown = null;
    done();
  };
}

// ---------- Swag Drawer ----------
function showSwag(tab: "profiles" | "titles" | "scores" = "profiles") {
  closeTo = () => showDesktop();
  let body = "";
  if (tab === "profiles") {
    body = `<div class="profiles">${JOB_NAMES.map((n, k) => {
      const m = META[k], j = JOBS[k]!;
      const skills = j.sets.flatMap((s) => s.skills.map((x) => x.name)).slice(0, 4).join(", ");
      return `<article class="profile"><header><img class="av" src="${faceIcon(k, 0, hex(j.color))}" alt=""><div><b>${esc(n)}</b><div class="muted">"${esc(m.tag)}" · ${esc(m.arch)}</div></div></header>
        <span>${esc(m.persona)} · ${esc(m.hair)}. ${esc(m.outfit)}.</span>
        <span class="muted">Skills: ${esc(skills)}…</span>
        <span class="endorse">Endorsed by ${2 + ((k * 7) % 9)} ${esc(JOB_NAMES[(k + 5) % 17])}s</span>
        <span class="muted">Signature: ${esc(m.emote)}</span></article>`;
    }).join("")}</div>`;
  } else body = `<p class="muted">${tab === "titles" ? "Titles unlock by clearing Career (phases 8–9)." : "High scores arrive with Career (phase 8)."}</p>`;
  const root = screen("swag", win("SWAG DRAWER", `<div class="tabs">${[["profiles", "EMPLOYEE PROFILES"], ["titles", "TITLES"], ["scores", "HIGH SCORES"]].map(([k, t]) => `<button data-tab="${k}" aria-selected="${k === tab}">${t}</button>`).join("")}</div>${body}`, true));
  root.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.addEventListener("click", () => showSwag(b.dataset.tab as "profiles")));
}

// ---------- netcode stats overlay + disconnect watchdog ----------
let route = "?";
setInterval(async () => {
  const s = driver.session;
  if (driver.mode !== "online" || !s) return;
  const quiet = performance.now() - s.stats.lastHeard;
  if (quiet > 10000 && s.state.phase !== PHASE_MATCH_END) { leaveOnline(); message("DISCONNECTED", "Your opponent's connection dropped for 10 seconds. You win this match."); return; }
  if (driver.link && s.frame % 120 < 20) route = await driver.link.route();
  const el = $("#debug");
  el.hidden = !settings.debug || onScreen !== "";
  if (!settings.debug) return;
  const st = s.stats;
  const avg = st.rollbacks ? (st.rolledFrames / st.rollbacks).toFixed(1) : "0";
  el.textContent = [
    `you P${s.me + 1} · route ${route}`, `ping ${Math.round(st.pingMs)} ms · delay ${s.delay}f`,
    `frame ${s.frame} · confirmed ${st.confirmed}`, `advantage ${st.advantage}f`,
    `rollbacks ${st.rollbacks} · avg ${avg}f · max ${st.maxRollback}f`, `stalls ${st.stalls} · sync waits ${st.syncStalls}`,
    st.desync ? `DESYNC at frame ${st.desyncFrame}!` : `checksums OK ${st.checksOk}`,
    settings.lag || settings.loss ? `lag sim ${settings.lag}±${settings.jitter} ms · ${settings.loss}% loss` : "lag sim off",
    quiet > 1500 ? `no data for ${(quiet / 1000).toFixed(1)} s…` : "",
  ].filter(Boolean).join("\n");
  el.style.color = st.desync ? "var(--danger)" : "";
}, 250);

// Vs CPU pauses while the tab is hidden (online can't pause; see the watchdog)
document.addEventListener("visibilitychange", () => { if (driver.mode === "practice") driver.paused = document.hidden || onScreen === "pause"; });

// ---------- start ----------
if (DEV) (window as unknown as { techken: unknown }).techken = { driver, game: () => game, settings: () => settings };
driver.startAttract();
const boot = () => {
  const qp = params.get("code");
  if (qp) { const root = showMeetingRoom(); join(qp, root); }
  else if (params.has("host")) { const root = showMeetingRoom(); host(root); }
  else showDesktop();
};
if (!settings.name) {
  if (params.has("autopick")) { settings.name = randomGuest(); save(); boot(); }
  else showName(boot);
} else boot();
