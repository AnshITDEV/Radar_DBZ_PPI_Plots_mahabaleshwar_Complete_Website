/**
 * AEROSCOPE Atmospheric Sound Engine
 * Procedural Web Audio API ambient rainfall and atmospheric weather synthesizer.
 * 100% royalty-free, zero external dependencies, zero network latency.
 */

class RainAudioEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.rainGain = null;
    this.windGain = null;
    this.thunderGain = null;
    this.rainSource = null;
    this.isPlaying = false;
    this.volume = parseFloat(localStorage.getItem("aeroscope_audio_volume") || "0.4");
    this.isMuted = localStorage.getItem("aeroscope_audio_enabled") !== "true";
  }

  init() {
    if (this.audioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn("Web Audio API not supported in this browser.");
      return;
    }

    this.audioCtx = new AudioContextClass();

    // Master volume control
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    this.masterGain.connect(this.audioCtx.destination);
  }

  // Create a 5-second seamless pink/brown noise buffer for natural rain droplet texture
  createRainBuffer() {
    const bufferSize = this.audioCtx.sampleRate * 5;
    const buffer = this.audioCtx.createBuffer(2, bufferSize, this.audioCtx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const output = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink noise filtering
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }
    }
    return buffer;
  }

  start() {
    this.init();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    if (this.isPlaying) return;

    try {
      const buffer = this.createRainBuffer();

      // Rain looping source
      this.rainSource = this.audioCtx.createBufferSource();
      this.rainSource.buffer = buffer;
      this.rainSource.loop = true;

      // Bandpass filter to shape the rain frequency (droplets hitting ground/leaves)
      const rainFilter = this.audioCtx.createBiquadFilter();
      rainFilter.type = "bandpass";
      rainFilter.frequency.setValueAtTime(1100, this.audioCtx.currentTime);
      rainFilter.Q.setValueAtTime(0.7, this.audioCtx.currentTime);

      // Lowpass filter for smooth atmospheric softness
      const lowpass = this.audioCtx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(2800, this.audioCtx.currentTime);

      // Rain gain node with gentle fade-in
      this.rainGain = this.audioCtx.createGain();
      this.rainGain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
      this.rainGain.gain.exponentialRampToValueAtTime(0.85, this.audioCtx.currentTime + 1.5);

      // Natural atmospheric wind drift via LFO
      const lfo = this.audioCtx.createOscillator();
      lfo.frequency.setValueAtTime(0.15, this.audioCtx.currentTime); // slow swell
      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.setValueAtTime(300, this.audioCtx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(rainFilter.frequency);
      lfo.start();

      // Connect graph
      this.rainSource.connect(rainFilter);
      rainFilter.connect(lowpass);
      lowpass.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);

      this.rainSource.start(0);
      this.isPlaying = true;
      this.isMuted = false;
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      localStorage.setItem("aeroscope_audio_enabled", "true");
    } catch (e) {
      console.error("Failed to start rain audio engine:", e);
    }
  }

  stop() {
    if (!this.isPlaying || !this.audioCtx) return;

    try {
      // Smooth fade-out before stopping
      if (this.rainGain) {
        this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, this.audioCtx.currentTime);
        this.rainGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.8);
      }
      setTimeout(() => {
        if (this.rainSource) {
          try {
            this.rainSource.stop();
            this.rainSource.disconnect();
          } catch {
            // Already stopped
          }
          this.rainSource = null;
        }
        this.isPlaying = false;
      }, 850);
    } catch {
      this.isPlaying = false;
    }
    this.isMuted = true;
    localStorage.setItem("aeroscope_audio_enabled", "false");
  }

  toggle() {
    if (this.isPlaying && !this.isMuted) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem("aeroscope_audio_volume", this.volume.toString());
    if (this.masterGain && this.audioCtx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  getStatus() {
    return {
      isPlaying: this.isPlaying && !this.isMuted,
      volume: this.volume,
    };
  }

  // Futuristic radar UI tactile chirp on clicks/tab switches
  playChirp(freq = 880, type = "sine", duration = 0.05) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.04 * this.volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Audio autoplay policy or inactive
    }
  }
}

export const rainAudio = new RainAudioEngine();

