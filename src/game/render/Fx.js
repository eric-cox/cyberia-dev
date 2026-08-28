// ============================================================
//  render/Fx — чисто визуальные эффекты: частицы и
//  всплывающие числа. Наполняются событиями симуляции
//  (подписки — в Renderer), ничего не знают о логике.
// ============================================================

export class Particles {
  constructor() {
    this.list = [];
  }
  add(p) {
    if (this.list.length < 420) this.list.push(p);
  }
  burst(x, y, { n = 8, colors = ["#ff4757"], speed = 60, life = 0.5, size = 1, grav = 0 }) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: life * (0.6 + Math.random() * 0.7),
        max: life,
        size,
        grav,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }
  // сноп искр вдоль дуги взмаха
  slashArc(x, y, angle, range, color = "#eaf6ff") {
    for (let i = 0; i <= 12; i++) {
      const a = angle - 1.15 + (2.3 * i) / 12;
      const r = range * (0.55 + Math.random() * 0.5);
      this.add({
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r,
        vx: Math.cos(a) * 26,
        vy: Math.sin(a) * 26,
        life: 0.1 + Math.random() * 0.1,
        max: 0.2,
        size: Math.random() < 0.3 ? 2 : 1,
        grav: 0,
        color: Math.random() < 0.6 ? color : "#9fd8ff",
      });
    }
  }
  // ледяные брызги провала
  iceSplash(x, y) {
    this.burst(x, y, {
      n: 16,
      colors: ["#7fd7ff", "#bfe3ff", "#e8f2ff"],
      speed: 90,
      life: 0.6,
      size: 1,
      grav: 160,
    });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.02, dt);
      p.vy *= Math.pow(0.02, dt);
    }
  }
  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.5));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

export class FloatTexts {
  constructor() {
    this.list = [];
  }
  add(x, y, txt, color = "#e8f2ff") {
    this.list.push({ x, y, txt, color, life: 0.95 });
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.life -= dt;
      t.y -= 17 * dt;
      if (t.life <= 0) this.list.splice(i, 1);
    }
  }
  draw(ctx) {
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    for (const t of this.list) {
      ctx.globalAlpha = Math.min(1, t.life / 0.35);
      ctx.strokeStyle = "#05080f";
      ctx.strokeText(t.txt, t.x | 0, t.y | 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.txt, t.x | 0, t.y | 0);
    }
    ctx.globalAlpha = 1;
  }
}

// Удобная связка
export class Fx {
  constructor() {
    this.particles = new Particles();
    this.texts = new FloatTexts();
  }
  update(dt) {
    this.particles.update(dt);
    this.texts.update(dt);
  }
  draw(ctx) {
    this.particles.draw(ctx);
    this.texts.draw(ctx);
  }
}
