/**
 * Web Audio engine for generated tones and lightweight procedural ambience.
 * The ambience in this prototype is synthesized, not recorded field audio.
 */
export class AudioEngine {
  constructor() {
    this.context = null;
    this.nodes = [];
    this.oscillators = [];
    this.gains = [];
    this.isPaused = false;
    this.activeConfig = null;
    this.generation = 0;
    this.leftToneGain = null;
    this.rightToneGain = null;
  }

  async ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio API is not supported in this browser.");
      this.context = new AudioContextClass();
    }
    if (this.context.state === "suspended") await this.context.resume();
  }

  createNoiseBuffer() {
    const ctx = this.context;
    const length = Math.max(1, ctx.sampleRate * 3);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) channel[i] = Math.random() * 2 - 1;
    return buffer;
  }

  track(node) { this.nodes.push(node); return node; }
  trackOscillator(node) { this.oscillators.push(node); this.track(node); return node; }

  makeNoise(destination, { type = "lowpass", frequency = 1000, q = 0.7, gain = 0.1 } = {}) {
    const ctx = this.context;
    const source = this.track(ctx.createBufferSource());
    source.buffer = this.createNoiseBuffer();
    source.loop = true;
    const filter = this.track(ctx.createBiquadFilter());
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const level = this.track(ctx.createGain());
    level.gain.value = gain;
    source.connect(filter); filter.connect(level); level.connect(destination);
    source.start();
    return { source, filter, level };
  }

  makeOsc(destination, frequency, wave = "sine", gain = 0.04) {
    const ctx = this.context;
    const osc = this.trackOscillator(ctx.createOscillator());
    osc.type = wave;
    osc.frequency.value = frequency;
    const level = this.track(ctx.createGain());
    level.gain.value = gain;
    osc.connect(level); level.connect(destination); osc.start();
    return { osc, level };
  }

  addAmbient(name, bus) {
    const ctx = this.context;
    const generation = this.generation;
    if (name === "rain") {
      const rain = this.makeNoise(bus, { type: "highpass", frequency: 750, q: 0.3, gain: 0.16 });
      this.makeNoise(bus, { type: "bandpass", frequency: 2600, q: 0.6, gain: 0.035 });
      // Gentle, slow swells keep the rain from sounding completely static.
      const lfo = this.trackOscillator(ctx.createOscillator());
      const lfoGain = this.track(ctx.createGain());
      lfo.frequency.value = 0.13; lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain); lfoGain.connect(rain.level.gain); lfo.start();
    } else if (name === "waves") {
      const wave = this.makeNoise(bus, { type: "lowpass", frequency: 500, q: 0.5, gain: 0.22 });
      const lfo = this.trackOscillator(ctx.createOscillator());
      const lfoGain = this.track(ctx.createGain());
      lfo.frequency.value = 0.08; lfoGain.gain.value = 0.13;
      lfo.connect(lfoGain); lfoGain.connect(wave.level.gain); lfo.start();
      this.makeNoise(bus, { type: "highpass", frequency: 1400, q: 0.5, gain: 0.025 });
    } else if (name === "fire") {
      this.makeNoise(bus, { type: "lowpass", frequency: 900, q: 0.7, gain: 0.12 });
      // Sparse synthetic crackles, randomly scheduled at low level.
      for (let i = 0; i < 7; i++) {
        const crackle = this.trackOscillator(ctx.createOscillator());
        const gain = this.track(ctx.createGain());
        crackle.type = "triangle";
        crackle.frequency.value = 700 + Math.random() * 2200;
        gain.gain.value = 0;
        crackle.connect(gain); gain.connect(bus); crackle.start();
        const pulse = () => {
          if (!this.context || this.isPaused || generation !== this.generation) return;
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.012 + Math.random() * 0.018, now + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04 + Math.random() * 0.09);
          setTimeout(pulse, 180 + Math.random() * 1300);
        };
        setTimeout(pulse, 100 + Math.random() * 1200);
      }
    } else if (name === "nebula") {
      const pad = this.track(ctx.createGain()); pad.gain.value = 0.15; pad.connect(bus);
      this.makeOsc(pad, 55, "sine", 0.36);
      this.makeOsc(pad, 82.41, "sine", 0.18);
      this.makeOsc(pad, 110, "triangle", 0.07);
      const lfo = this.trackOscillator(ctx.createOscillator());
      const lfoGain = this.track(ctx.createGain()); lfo.frequency.value = 0.09; lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain); lfoGain.connect(pad.gain); lfo.start();
    } else if (name === "jungle") {
      this.makeNoise(bus, { type: "lowpass", frequency: 1200, q: 0.5, gain: 0.045 });
      for (let i = 0; i < 3; i++) {
        const bird = this.trackOscillator(ctx.createOscillator());
        const gain = this.track(ctx.createGain());
        bird.type = "sine"; bird.frequency.value = 1500 + i * 480; gain.gain.value = 0;
        bird.connect(gain); gain.connect(bus); bird.start();
        const chirp = () => {
          if (!this.context || this.isPaused || generation !== this.generation) return;
          const now = ctx.currentTime;
          bird.frequency.setValueAtTime(1100 + Math.random() * 1500, now);
          bird.frequency.exponentialRampToValueAtTime(1800 + Math.random() * 1700, now + 0.07);
          gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.018, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
          setTimeout(chirp, 1200 + Math.random() * 4500);
        };
        setTimeout(chirp, 300 + Math.random() * 2500);
      }
    } else if (name === "night") {
      this.makeNoise(bus, { type: "lowpass", frequency: 650, q: 0.5, gain: 0.035 });
      for (let i = 0; i < 4; i++) {
        const insect = this.trackOscillator(ctx.createOscillator());
        const gain = this.track(ctx.createGain());
        insect.type = "sine"; insect.frequency.value = 2600 + i * 330; gain.gain.value = 0;
        insect.connect(gain); gain.connect(bus); insect.start();
        const pulse = () => {
          if (!this.context || this.isPaused || generation !== this.generation) return;
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now); gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(0.009, now + 0.025);
          gain.gain.setValueAtTime(0.009, now + 0.10);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
          setTimeout(pulse, 500 + Math.random() * 1100);
        };
        setTimeout(pulse, 100 + Math.random() * 900);
      }
    }
  }

  async start(config) {
    await this.ensureContext();
    this.stopNodes();
    const ctx = this.context;
    const master = this.track(ctx.createGain());
    master.gain.value = 0.85;
    master.connect(ctx.destination);

    const toneBus = this.track(ctx.createGain());
    toneBus.gain.value = 1;
    toneBus.connect(master);
    const leftOsc = this.trackOscillator(ctx.createOscillator());
    this.leftToneGain = null; this.rightToneGain = null;
    leftOsc.type = "sine"; leftOsc.__isTone = true; leftOsc.frequency.value = config.leftFrequency;
    const leftGain = this.track(ctx.createGain()); this.leftToneGain = leftGain; leftGain.gain.value = config.volume;
    leftOsc.connect(leftGain);
    if (config.mode === "mono") {
      const merger = this.track(ctx.createChannelMerger(2));
      leftGain.connect(merger, 0, 0); leftGain.connect(merger, 0, 1); merger.connect(toneBus);
    } else {
      const rightOsc = this.trackOscillator(ctx.createOscillator());
      rightOsc.type = "sine"; rightOsc.__isTone = true; rightOsc.frequency.value = config.rightFrequency;
      const rightGain = this.track(ctx.createGain()); this.rightToneGain = rightGain; rightGain.gain.value = config.volume;
      const merger = this.track(ctx.createChannelMerger(2));
      leftGain.connect(merger, 0, 0); rightOsc.connect(rightGain); rightGain.connect(merger, 0, 1); merger.connect(toneBus); rightOsc.start();
    }
    leftOsc.start();

    const ambienceBus = this.track(ctx.createGain());
    this.ambientBus = ambienceBus;
    ambienceBus.gain.value = Math.max(0, Math.min(0.7, config.ambientVolume ?? 0.35));
    ambienceBus.connect(master);
    for (const name of (config.ambients || [])) this.addAmbient(name, ambienceBus);
    this.activeConfig = { ...config, ambients: [...(config.ambients || [])] };
    this.isPaused = false;
  }

  update(config) {
    if (!this.context || this.isPaused || !this.activeConfig) return;
    const needsRestart = config.mode !== this.activeConfig.mode ||
      JSON.stringify(config.ambients || []) !== JSON.stringify(this.activeConfig.ambients || []);
    if (needsRestart) { this.start(config).catch((error) => console.error(error)); return; }
    // The first oscillator is always the left/main tone; the second, when present, is right.
    const tones = this.oscillators.filter((node) => node.__isTone);
    if (tones[0]) tones[0].frequency.setTargetAtTime(config.leftFrequency, this.context.currentTime, 0.03);
    if (this.leftToneGain) this.leftToneGain.gain.setTargetAtTime(config.volume, this.context.currentTime, 0.03);
    if (this.rightToneGain && config.mode !== "mono") this.rightToneGain.gain.setTargetAtTime(config.volume, this.context.currentTime, 0.03);
    if (tones[1] && config.mode !== "mono") tones[1].frequency.setTargetAtTime(config.rightFrequency, this.context.currentTime, 0.03);
    this.activeConfig = { ...this.activeConfig, ...config };
  }

  setAmbientVolume(value) {
    if (!this.context || !this.activeConfig) return;
    // Find the ambience bus by its stored reference.
    if (this.ambientBus) this.ambientBus.gain.setTargetAtTime(value, this.context.currentTime, 0.04);
    this.activeConfig.ambientVolume = value;
  }

  pause() {
    if (!this.context || this.context.state !== "running") return;
    this.context.suspend(); this.isPaused = true;
  }
  async resume() { if (this.context) { await this.context.resume(); this.isPaused = false; } }
  stop() { this.stopNodes(); this.isPaused = false; this.activeConfig = null; }

  stopNodes() {
    this.generation += 1;
    for (const node of this.nodes) {
      try { if (typeof node.stop === "function") node.stop(); } catch (_) {}
      try { node.disconnect(); } catch (_) {}
    }
    this.nodes = []; this.oscillators = []; this.gains = []; this.ambientBus = null;
  }
}
