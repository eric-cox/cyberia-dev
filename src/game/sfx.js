// ============================================================
//  ЗВУК — крошечный WebAudio-синтезатор (без внешних файлов)
// ============================================================
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.noiseBuf = null;
    this.windGain = null;
    this.windFilter = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startWind();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  startWind() {
    if (!this.ctx || this.windGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "lowpass";
    this.windFilter.frequency.value = 240;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    src.start();
  }
  // интенсивность пурги растёт, когда игрок замерзает
  setWind(i) {
    if (!this.windGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(i * 0.22, t, 0.4);
    this.windFilter.frequency.setTargetAtTime(200 + i * 420, t, 0.5);
  }

  tone({ f = 440, f2 = null, t = 0.12, type = "square", v = 0.18, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + t);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + t + 0.02);
  }

  noise({ t = 0.1, v = 0.2, f = 1200, q = 1, type = "bandpass", delay = 0 }) {
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + t);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    src.start(t0, Math.random());
    src.stop(t0 + t + 0.02);
  }

  swing() {
    this.noise({ t: 0.09, v: 0.16, f: 2400, q: 2, type: "highpass" });
  }
  hit() {
    this.tone({ f: 190, f2: 70, t: 0.09, type: "square", v: 0.2 });
    this.noise({ t: 0.06, v: 0.14, f: 900 });
  }
  hurt() {
    this.tone({ f: 130, f2: 55, t: 0.28, type: "sawtooth", v: 0.22 });
  }
  kill() {
    this.tone({ f: 320, f2: 40, t: 0.22, type: "square", v: 0.16 });
    this.noise({ t: 0.18, v: 0.12, f: 500, type: "lowpass" });
  }
  splash() {
    this.noise({ t: 0.32, v: 0.3, f: 420, type: "lowpass" });
    this.tone({ f: 220, f2: 80, t: 0.2, type: "sine", v: 0.12 });
  }
  pickup(tier) {
    const base = [520, 620, 740][Math.min(2, Math.max(0, tier - 1))];
    for (let i = 0; i < tier + 1; i++)
      this.tone({
        f: base * Math.pow(1.26, i),
        t: 0.09,
        type: "triangle",
        v: 0.16,
        delay: i * 0.07,
      });
  }
  orb() {
    this.tone({ f: 700, f2: 1050, t: 0.1, type: "triangle", v: 0.12 });
  }
  growl() {
    this.tone({ f: 90, f2: 60, t: 0.3, type: "sawtooth", v: 0.08 });
  }
  ui() {
    this.tone({ f: 660, t: 0.05, type: "square", v: 0.08 });
  }
  death() {
    [392, 311, 233, 155].forEach((f, i) =>
      this.tone({ f, f2: f * 0.8, t: 0.34, type: "triangle", v: 0.16, delay: i * 0.22 })
    );
    this.noise({ t: 1.2, v: 0.2, f: 300, type: "lowpass", delay: 0.1 });
  }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone({ f, t: 0.16, type: "square", v: 0.12, delay: i * 0.12 })
    );
  }
}
