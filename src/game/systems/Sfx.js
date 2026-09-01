// ============================================================
//  systems/Sfx — крошечный WebAudio-синтезатор.
//  Без внешних файлов: тон + шум + фильтры.
//  Вызывается ТОЛЬКО из Game (подписчик событий симуляции) —
//  сама симуляция о звуке не знает.
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

  // фоновый вой пурги: интенсивность растёт с замерзанием
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
  setWind(i) {
    if (!this.windGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(i * 0.22, t, 0.4);
    this.windFilter.frequency.setTargetAtTime(200 + i * 420, t, 0.5);
  }
  // серо-чёрная пурга: тревожный низкий гул (вход/выход из фазы)
  darkWind(on) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(on ? 90 : 130, t0);
    o.frequency.exponentialRampToValueAtTime(on ? 40 : 70, t0 + 1.2);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(on ? 0.12 : 0.06, t0 + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.3);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + 1.4);
  }
  // метель: нарастающий (или стихающий) шумовой порыв
  blizzard(on) {
    if (!this.ctx || this.muted || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = "bandpass";
    flt.frequency.value = on ? 500 : 300;
    flt.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(on ? 0.16 : 0.05, t0 + (on ? 1.6 : 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (on ? 2.6 : 1.6));
    src.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    src.start(t0, Math.random());
    src.stop(t0 + (on ? 2.8 : 1.8));
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

  // --- игровые события ---
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
  levelup() {
    [523, 659, 784].forEach((f, i) =>
      this.tone({ f, t: 0.12, type: "square", v: 0.12, delay: i * 0.08 })
    );
  }
  // ---------- ГОЛОСА ВРАГОВ ----------
  // voice = { freq, wave, v, dur }.
  // Высокие freq (≥4000) — тонкий писк с быстрым вибрато
  // (мыши, мелкие твари); низкие — утробный рык с суб-грохотом
  // (големы, носороги). Чем меньше и слабее зверь, тем выше писк.
  growl(voice, soft = false) {
    if (!this.ctx || this.muted || !voice) return;
    const v = soft ? voice.v * 0.4 : voice.v;
    if (voice.freq >= 4000) this.squeak(voice, v);
    else this.lowGrowl(voice, v);
  }

  // Голос при попадании: тот же тембр и частота, что и обычный
  // писк/рык, но чуть длиннее — со случайным отклонением ±200мс.
  hurtVoice(voice) {
    if (!voice) return;
    // защита от хора писков, если один взмах задел стаю
    const now = performance.now();
    if (now - (this._hurtVoiceAt || 0) < 50) return;
    this._hurtVoiceAt = now;
    const baseMs = (voice.dur || 0.2) * 1000;
    const extra = (Math.random() * 2 - 1) * 200; // ±200мс
    const dur = Math.max(90, baseMs + extra) / 1000;
    this.growl({ ...voice, dur }, false);
  }

  // Предсмертный вопль: та же частота, длиннее на 500мс,
  // тон скатывается вниз (glide).
  deathVoice(voice) {
    if (!voice) return;
    const dur = (voice.dur || 0.2) + 0.5;
    this.growl({ ...voice, dur, glide: true }, false);
  }

  squeak(voice, v) {
    const t0 = this.ctx.currentTime;
    const { freq, dur } = voice;
    // основной высокий тон
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t0);
    // предсмертный вопль: тон скатывается вниз
    if (voice.glide)
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t0 + dur);
    // быстрое вибрато — живое "пи-пи"
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 34;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = freq * 0.09;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    lfo.start(t0);
    o.stop(t0 + dur + 0.02);
    lfo.stop(t0 + dur + 0.02);
    // тихая нижняя гармоника, чтобы писк был слышен на ноутбуке
    this.tone({ f: freq / 2, t: dur * 0.7, type: "sine", v: v * 0.5 });
  }

  lowGrowl(voice, v) {
    const t0 = this.ctx.currentTime;
    const { freq, dur } = voice;
    const o = this.ctx.createOscillator();
    o.type = voice.wave || "sawtooth";
    o.frequency.setValueAtTime(freq * 1.25, t0);
    // предсмертный рык уходит глубже обычного
    const glideTo = voice.glide ? freq * 0.35 : freq * 0.66;
    o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    const flt = this.ctx.createBiquadFilter();
    flt.type = "lowpass";
    flt.frequency.value = Math.min(900, freq * 7);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
    // суб-грохот для самых низких (голем)
    if (freq < 100 && this.noiseBuf) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.playbackRate.value = 0.35;
      const nf = this.ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.value = 130;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(v * 0.8, t0);
      ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 1.1);
      src.connect(nf);
      nf.connect(ng);
      ng.connect(this.master);
      src.start(t0, Math.random());
      src.stop(t0 + dur * 1.1 + 0.02);
    }
  }
  crackle() {
    this.noise({ t: 0.1, v: 0.05, f: 2000, type: "highpass" });
  }
  heartbeat() {
    this.tone({ f: 72, f2: 48, t: 0.1, type: "sine", v: 0.22 });
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
