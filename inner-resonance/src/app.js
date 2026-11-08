import { loadFrequencyLibrary } from "./library.js";
import { AudioEngine } from "./audio-engine.js";

const $ = (id) => document.getElementById(id);
const engine = new AudioEngine();
const leftFrequency = $("left-frequency");
const rightFrequency = $("right-frequency");
const leftSlider = $("left-slider");
const rightSlider = $("right-slider");
const rightRow = $("right-channel-row");
const playButton = $("play-button");
const stopButton = $("stop-button");
const volume = $("volume");
const durationSlider = $("duration-slider");
const durationMinutes = $("duration-minutes");
const timerDisplay = $("timer");
const playerStatus = $("player-status");
const statusDot = $("status-dot"); // Optional decorative status indicator; controls must work without it.
const modeNote = $("mode-note");
const guidanceTitle = $("guidance-title");
const guidanceCopy = $("guidance-copy");
const presetSelect = $("preset-select");
const customizeButton = $("customize-button");
const frequencyPanel = document.querySelector(".frequency-panel");
const ambientVolume = $("ambient-volume");

let mode = "mono";
let selectedPreset = null;
let remainingSeconds = 120;
let timerInterval = null;
let playing = false;
let paused = false;
let library = [];
let selectedAmbients = new Set();
let ambientAudioTracks = new Map();
let ambientContext = null;
let pendingAmbientStarts = new Set();

const ambientNames = { rain: "Rain", waves: "Sea Waves", fire: "Campfire", nebula: "Nebula", jungle: "Jungle", night: "Jungle at Night" };


function clampFrequency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 432;
  return Math.min(20000, Math.max(20, Math.round(number)));
}
function syncFrequencyInputs(source) {
  if (selectedPreset) return;
  const left = clampFrequency(source.value);
  leftFrequency.value = left;
  leftSlider.value = Math.min(2000, left);
  if (mode === "mono") { rightFrequency.value = left; rightSlider.value = Math.min(2000, left); }
  if (mode !== "mono" && source === leftFrequency) {
    const right = clampFrequency(left + 10); rightFrequency.value = right; rightSlider.value = Math.min(2000, right);
  }
  updateAudioIfPlaying();
}
function syncRightInputs(source) {
  if (selectedPreset) return;
  const right = clampFrequency(source.value);
  rightFrequency.value = right; rightSlider.value = Math.min(2000, right);
  $("right-output").textContent = `${right} Hz`;
  updateAudioIfPlaying();
}
function getDurationSeconds() {
  const minutes = Math.min(60, Math.max(2, Math.round(Number(durationMinutes.value) || 2)));
  durationMinutes.value = minutes; durationSlider.value = minutes;
  return minutes * 60;
}
function syncDuration(source) {
  const raw = Number(source.value);
  if (source === durationMinutes && source.value.trim() === "") return;
  const minutes = Math.min(60, Math.max(2, Math.round(Number.isFinite(raw) ? raw : 2)));
  durationMinutes.value = minutes; durationSlider.value = minutes;
  if (!playing && !paused) { remainingSeconds = minutes * 60; updateTimer(); }
}
function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function updateTimer() { timerDisplay.textContent = formatTime(remainingSeconds); }
function updateGuidance() {
  if (mode === "binaural") {
    guidanceTitle.textContent = "For a separate left-and-right experience";
    guidanceCopy.textContent = "Earphones are recommended when each ear receives a different tone, so the left and right signals remain separate. Keep the volume comfortable and stop if you feel discomfort.";
  } else {
    guidanceTitle.textContent = "Let comfort lead";
    guidanceCopy.textContent = "Listen through your phone, speakers, or earphones—whichever feels comfortable. Begin at a low volume and take a break or change the mix if anything feels unpleasant.";
  }
}
function updateModeUI() {
  rightRow.hidden = mode === "mono";
  if (mode === "mono") { rightFrequency.value = leftFrequency.value; rightSlider.value = leftSlider.value; }
  else if (mode === "binaural") { rightFrequency.value = clampFrequency(Number(leftFrequency.value) + 10); rightSlider.value = Math.min(2000, Number(rightFrequency.value)); }
  updateGuidance(); updateAudioIfPlaying();
}
function currentConfig() {
  const left = clampFrequency(leftFrequency.value);
  return {
    mode,
    leftFrequency: left,
    rightFrequency: mode === "mono" ? left : clampFrequency(rightFrequency.value),
    volume: Number(volume.value) / 100,
    // Frequency playback is intentionally separate from ambient playback.
    ambients: [],
    ambientVolume: 0
  };
}
function setPresetLock(locked) {
  [leftFrequency, leftSlider, rightFrequency, rightSlider].forEach((element) => { element.disabled = locked; });
  frequencyPanel.classList.toggle("locked-panel", locked);
  $("edit-badge").textContent = locked ? "Guided preset" : "Custom mode";
  $("preset-lock-note").hidden = !locked;
  customizeButton.textContent = locked ? "Switch to custom frequency" : "Back to guided sessions";
}
function setCustomMode() {
  selectedPreset = null;
  presetSelect.value = "";
  setPresetLock(false);
  $("preset-name").textContent = "A sound for your moment";
  $("preset-overview").textContent = "Choose a guided session above or explore your own tone here. There is no single frequency that works the same way for everyone.";
  $("preset-purpose").textContent = "Quiet reflection, relaxation, or a gentle pause.";
  $("preset-duration").textContent = "Begin with a few comfortable minutes and follow your own pace.";
  $("preset-device").textContent = "Earphones are recommended for a more personal, immersive experience.";
  $("preset-tradition").textContent = "Let the sound be an invitation to pause, breathe, and notice how you feel.";
  playerStatus.textContent = "Custom frequency mode";
}
function renderPreset(preset) {
  $("preset-name").textContent = `${preset.frequency_hz} Hz · ${preset.name}`;
  $("preset-overview").textContent = preset.overview || preset.traditional_association;
  $("preset-purpose").textContent = preset.try_for || "Quiet reflection or mindful listening.";
  $("preset-duration").textContent = preset.suggested_duration || `Start with ${Math.round((preset.default_duration_seconds || 300) / 60)} minutes as a personal listening suggestion.`;
  $("preset-device").textContent = mode === "binaural"
    ? "Earphones are recommended so each ear can receive its own separate tone."
    : "For a single tone, use your phone, speakers, or earphones—whichever feels comfortable.";
  $("preset-tradition").textContent = "A mindful invitation: take a breath, settle in, and notice your own experience. Traditional meanings are personal and are not promises of a particular outcome.";
}
function applyPreset(preset) {
  if (playing || paused) stopPlayback("Preset selected · ready when you are");
  selectedPreset = preset;
  mode = "mono"; updateModeUI();
  leftFrequency.value = preset.frequency_hz; leftSlider.value = Math.min(2000, preset.frequency_hz);
  rightFrequency.value = preset.frequency_hz; rightSlider.value = Math.min(2000, preset.frequency_hz);
  setPresetLock(true); renderPreset(preset);
  playerStatus.textContent = `${preset.frequency_hz} Hz guided session selected`;
  updateAudioIfPlaying();
}
// All ambience is generated locally with the Web Audio API. This avoids fragile
// third-party URLs and means ambient cards still work offline after the page loads.
function createNoiseBuffer(context, seconds = 4) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}
function addTracked(track, node) { track.nodes.push(node); return node; }
function makeAmbientNoise(track, { filter = "lowpass", cutoff = 1000, q = 0.7, level = 0.08 } = {}) {
  const ctx = track.context;
  const source = addTracked(track, ctx.createBufferSource());
  source.buffer = createNoiseBuffer(ctx); source.loop = true;
  const filterNode = addTracked(track, ctx.createBiquadFilter());
  filterNode.type = filter; filterNode.frequency.value = cutoff; filterNode.Q.value = q;
  const gain = addTracked(track, ctx.createGain()); gain.gain.value = level;
  source.connect(filterNode); filterNode.connect(gain); gain.connect(track.master); source.start();
  return { source, filter: filterNode, gain };
}
function makeAmbientOsc(track, frequency, wave = "sine", level = 0.02) {
  const osc = addTracked(track, track.context.createOscillator());
  const gain = addTracked(track, track.context.createGain());
  osc.type = wave; osc.frequency.value = frequency; gain.gain.value = level;
  osc.connect(gain); gain.connect(track.master); osc.start();
  return { osc, gain };
}
function scheduleRandom(track, callback, minMs, maxMs) {
  if (!track.timers) track.timers = new Set();
  const timer = setTimeout(() => {
    track.timers.delete(timer);
    if (!track.stopped) { callback(); scheduleRandom(track, callback, minMs, maxMs); }
  }, minMs + Math.random() * (maxMs - minMs));
  track.timers.add(timer);
}
async function getAmbientContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) throw new Error("This browser does not support audio playback.");
  // Reuse one context for all ambient layers. This is more reliable on mobile browsers,
  // which can limit the number of simultaneous AudioContext instances.
  if (!ambientContext || ambientContext.state === "closed") ambientContext = new AudioContextClass();
  if (ambientContext.state !== "running") await ambientContext.resume();
  return ambientContext;
}
async function startAmbientTrack(name) {
  const context = await getAmbientContext();
  const master = context.createGain();
  master.gain.value = Math.max(0, Math.min(0.7, Number(ambientVolume.value) / 100));
  master.connect(context.destination);
  const track = { context, master, nodes: [master], timers: new Set(), stopped: false };

  if (name === "rain") {
    makeAmbientNoise(track, { filter: "highpass", cutoff: 650, q: 0.25, level: 0.13 });
    makeAmbientNoise(track, { filter: "bandpass", cutoff: 2300, q: 0.55, level: 0.035 });
    const swell = addTracked(track, context.createOscillator());
    const swellDepth = addTracked(track, context.createGain());
    swell.frequency.value = 0.12; swellDepth.gain.value = 0.035;
    swell.connect(swellDepth); swellDepth.connect(master.gain); swell.start();
  } else if (name === "waves") {
    const wash = makeAmbientNoise(track, { filter: "lowpass", cutoff: 430, q: 0.45, level: 0.16 });
    const swell = addTracked(track, context.createOscillator());
    const swellDepth = addTracked(track, context.createGain());
    swell.frequency.value = 0.075; swellDepth.gain.value = 0.13;
    swell.connect(swellDepth); swellDepth.connect(wash.gain.gain); swell.start();
    makeAmbientNoise(track, { filter: "highpass", cutoff: 1200, q: 0.45, level: 0.025 });
  } else if (name === "fire") {
    makeAmbientNoise(track, { filter: "lowpass", cutoff: 780, q: 0.75, level: 0.07 });
    const crackle = () => {
      const osc = addTracked(track, context.createOscillator());
      const gain = addTracked(track, context.createGain());
      osc.type = "triangle"; osc.frequency.value = 650 + Math.random() * 2600;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.012 + Math.random() * 0.025, context.currentTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.04 + Math.random() * 0.08);
      osc.connect(gain); gain.connect(master); osc.start(); osc.stop(context.currentTime + 0.15);
    };
    scheduleRandom(track, crackle, 120, 850);
  } else if (name === "nebula") {
    const pad = addTracked(track, context.createGain()); pad.gain.value = 0.13; pad.connect(master);
    const low = makeAmbientOsc(track, 55, "sine", 0.28);
    const upper = makeAmbientOsc(track, 82.41, "sine", 0.12);
    const high = makeAmbientOsc(track, 110, "triangle", 0.045);
    // Soft, slowly breathing cosmic pad.
    const lfo = addTracked(track, context.createOscillator());
    const depth = addTracked(track, context.createGain());
    lfo.frequency.value = 0.07; depth.gain.value = 0.035;
    lfo.connect(depth); depth.connect(pad.gain); lfo.start();
    // Route the three tones through the soft pad bus.
    [low, upper, high].forEach(({ osc, gain }) => { try { gain.disconnect(); osc.disconnect(); osc.connect(gain); gain.connect(pad); } catch {} });
  } else if (name === "jungle") {
    makeAmbientNoise(track, { filter: "lowpass", cutoff: 1250, q: 0.55, level: 0.04 });
    const birdCall = () => {
      const osc = addTracked(track, context.createOscillator());
      const gain = addTracked(track, context.createGain());
      const now = context.currentTime;
      osc.type = "sine"; osc.frequency.setValueAtTime(900 + Math.random() * 900, now);
      osc.frequency.exponentialRampToValueAtTime(1800 + Math.random() * 1800, now + 0.11);
      gain.gain.setValueAtTime(0.0001, now); gain.gain.linearRampToValueAtTime(0.012, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(gain); gain.connect(master); osc.start(); osc.stop(now + 0.2);
    };
    scheduleRandom(track, birdCall, 900, 3800);
  } else if (name === "night") {
    makeAmbientNoise(track, { filter: "lowpass", cutoff: 520, q: 0.5, level: 0.025 });
    const insectCall = () => {
      const osc = addTracked(track, context.createOscillator());
      const gain = addTracked(track, context.createGain());
      const now = context.currentTime;
      osc.type = "sine"; osc.frequency.value = 2500 + Math.random() * 1100;
      gain.gain.setValueAtTime(0.0001, now); gain.gain.linearRampToValueAtTime(0.006, now + 0.03);
      gain.gain.setValueAtTime(0.006, now + 0.12); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      osc.connect(gain); gain.connect(master); osc.start(); osc.stop(now + 0.22);
    };
    scheduleRandom(track, insectCall, 450, 1400);
  }
  // If the user toggled this card off while the context was resuming, don't leave audio running.
  if (!selectedAmbients.has(name)) {
    track.stopped = true;
    for (const timer of track.timers) clearTimeout(timer);
    for (const node of track.nodes) { try { if (typeof node.stop === "function") node.stop(); } catch {} try { node.disconnect(); } catch {} }
    return;
  }
  ambientAudioTracks.set(name, track);
}
function stopAmbientTrack(name) {
  const track = ambientAudioTracks.get(name);
  if (!track) return;
  track.stopped = true;
  for (const timer of track.timers || []) clearTimeout(timer);
  for (const node of track.nodes || []) {
    try { if (typeof node.stop === "function") node.stop(); } catch (_) {}
    try { node.disconnect(); } catch (_) {}
  }
  try { track.master?.disconnect(); } catch (_) {}
  ambientAudioTracks.delete(name);
}
function stopAllAmbients() { [...ambientAudioTracks.keys()].forEach(stopAmbientTrack); }
function updateAmbientUI() {
  document.querySelectorAll(".ambient-card").forEach((card) => {
    const active = selectedAmbients.has(card.dataset.ambient);
    card.setAttribute("aria-pressed", String(active));
    card.classList.toggle("is-selected", active);
  });
  $("ambient-summary").textContent = selectedAmbients.size
    ? `Playing: ${[...selectedAmbients].map((name) => ambientNames[name]).join(" + ")}`
    : "No ambient sounds selected.";
}
async function toggleAmbient(name) {
  // Ambient mode and frequency mode never play together.
  stopPlayback("Frequency paused · ambient sound only");
  if (selectedAmbients.has(name)) {
    selectedAmbients.delete(name);
    stopAmbientTrack(name);
    updateAmbientUI();
    $("ambient-status").textContent = selectedAmbients.size
      ? `Stopped ${ambientNames[name]}. Other selected ambience continues.`
      : "Ambient playback stopped.";
    return;
  }
  selectedAmbients.add(name);
  pendingAmbientStarts.add(name);
  updateAmbientUI();
  $("ambient-status").textContent = `Starting ${ambientNames[name]}…`;
  try {
    await startAmbientTrack(name);
    if (!selectedAmbients.has(name)) return;
    $("ambient-status").textContent = `Playing ${[...selectedAmbients].map((item) => ambientNames[item]).join(" + ")}. Frequency tones are off.`;
  } catch (error) {
    selectedAmbients.delete(name);
    stopAmbientTrack(name);
    updateAmbientUI();
    $("ambient-status").textContent = `Could not play ${ambientNames[name]}. Check that your browser allows audio playback and try again.`;
    console.error("Ambient playback failed:", error);
  } finally {
    pendingAmbientStarts.delete(name);
  }
}
async function startPlayback() {
  try {
    stopAllAmbients();
    selectedAmbients.clear();
    updateAmbientUI();
    if (paused) { await engine.resume(); paused = false; }
    else { remainingSeconds = getDurationSeconds(); updateTimer(); await engine.start(currentConfig()); }
    playing = true;
    playButton.textContent = "Ⅱ Pause";
    $("preset-play-button").textContent = "Ⅱ Pause listening";
    stopButton.disabled = false;
    if (statusDot) { statusDot.classList.add("playing"); statusDot.setAttribute("aria-label", "Playback active"); }
    playerStatus.textContent = selectedPreset ? `Listening to ${selectedPreset.frequency_hz} Hz · ${selectedPreset.name}` : "Your frequency tone is playing";
    clearInterval(timerInterval);
    timerInterval = setInterval(() => { if (!playing) return; remainingSeconds -= 1; updateTimer(); if (remainingSeconds <= 0) stopPlayback("Session complete · take a moment before continuing"); }, 1000);
  } catch (error) {
    playing = false;
    playButton.textContent = "▶ Play";
    $("preset-play-button").textContent = "▶ Play this frequency";
    stopButton.disabled = true;
    playerStatus.textContent = `Audio could not start: ${error?.message || "browser audio unavailable"}. Try again after clicking the page.`;
    console.error("Frequency playback failed:", error);
  }
}
function pausePlayback() {
  if (!playing) return;
  engine.pause(); playing = false; paused = true; clearInterval(timerInterval);
  playButton.textContent = "▶ Resume"; $("preset-play-button").textContent = "▶ Resume listening";
  if (statusDot) { statusDot.classList.remove("playing"); statusDot.setAttribute("aria-label", "Playback paused"); }
  playerStatus.textContent = "Session paused";
}
function stopPlayback(message = "Session stopped") {
  engine.stop(); playing = false; paused = false; clearInterval(timerInterval);
  playButton.textContent = "▶ Play"; $("preset-play-button").textContent = "▶ Play this frequency"; stopButton.disabled = true;
  if (statusDot) { statusDot.classList.remove("playing"); statusDot.setAttribute("aria-label", "Playback stopped"); }
  playerStatus.textContent = message; remainingSeconds = getDurationSeconds(); updateTimer();
}

function toggleFrequencyPlayback() {
  if (playing) pausePlayback();
  else startPlayback();
}
playButton.addEventListener("click", toggleFrequencyPlayback);
$("preset-play-button").addEventListener("click", toggleFrequencyPlayback);
stopButton.addEventListener("click", () => stopPlayback("Session stopped · ready when you are"));

function updateAudioIfPlaying() {
  if (playing) {
    engine.update(currentConfig());
  }
}

leftFrequency.addEventListener("change", () => syncFrequencyInputs(leftFrequency));
leftSlider.addEventListener("input", () => syncFrequencyInputs(leftSlider));
rightFrequency.addEventListener("change", () => syncRightInputs(rightFrequency));
rightSlider.addEventListener("input", () => syncRightInputs(rightSlider));
volume.addEventListener("input", () => { $("volume-output").textContent = `${volume.value}%`; updateAudioIfPlaying(); });
durationSlider.addEventListener("input", () => syncDuration(durationSlider));
durationMinutes.addEventListener("change", () => syncDuration(durationMinutes));
durationMinutes.addEventListener("keydown", (event) => { if (event.key === "Enter") { syncDuration(durationMinutes); durationMinutes.blur(); } });
ambientVolume.addEventListener("input", () => {
  const level = Math.max(0, Math.min(0.7, Number(ambientVolume.value) / 100));
  $("ambient-volume-output").textContent = `${ambientVolume.value}%`;
  for (const track of ambientAudioTracks.values()) {
    if (track.master && track.context && track.context.state !== "closed") {
      track.master.gain.setTargetAtTime(level, track.context.currentTime, 0.08);
    }
  }
});
document.querySelectorAll(".ambient-card").forEach((card) => {
  card.addEventListener("click", () => { toggleAmbient(card.dataset.ambient); });
});
$("clear-ambients").addEventListener("click", () => {
  selectedAmbients.clear();
  stopAllAmbients();
  updateAmbientUI();
  $("ambient-status").textContent = "All ambient sounds stopped.";
});
document.addEventListener("visibilitychange", () => {
  // Mobile browsers may suspend Web Audio when the tab returns from the background.
  if (document.visibilityState === "visible" && selectedAmbients.size && ambientContext && ambientContext.state === "suspended") {
    ambientContext.resume().catch((error) => console.warn("Ambient audio needs a tap to resume:", error));
  }
});
presetSelect.addEventListener("change", (event) => { const preset = library.find((item) => item.id === event.target.value); if (preset) applyPreset(preset); else setCustomMode(); });
customizeButton.addEventListener("click", () => {
  if (selectedPreset) { setCustomMode(); leftFrequency.focus(); }
  else { presetSelect.focus(); document.querySelector(".preset-feature").scrollIntoView({ behavior: "smooth", block: "center" }); }
});

async function init() {
  library = await loadFrequencyLibrary();
  for (const item of library) { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.frequency_hz} Hz — ${item.name}`; presetSelect.append(option); }
  updateModeUI(); setPresetLock(false); updateAmbientUI();
  remainingSeconds = getDurationSeconds(); updateTimer();
}
init().catch((error) => { console.error(error); playerStatus.textContent = "The frequency library did not load. Please restart the local server."; });
