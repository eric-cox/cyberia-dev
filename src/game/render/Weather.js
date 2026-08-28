// ============================================================
//  render/Weather — пурга: падающие пиксели снега.
//  Чисто визуальный слой поверх мира (экранные координаты).
// ============================================================
export class Weather {
  constructor(count = 130) {
    this.w = 1280;
    this.h = 720;
    this.flakes = [];
    for (let i = 0; i < count; i++)
      this.flakes.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        s: 26 + Math.random() * 70,
        drift: 8 + Math.random() * 26,
        size: Math.random() < 0.3 ? 2 : 1,
        ph: Math.random() * 10,
      });
  }

  setSize(w, h) {
    this.w = w;
    this.h = h;
  }

  update(dt) {
    for (const f of this.flakes) {
      f.y += f.s * dt * (0.7 + f.size * 0.5);
      f.x += f.drift * dt + Math.sin(f.y * 0.02 + f.ph) * 14 * dt;
      if (f.y > this.h + 4) {
        f.y = -4;
        f.x = Math.random() * this.w;
      }
      if (f.x > this.w + 4) f.x = -4;
    }
  }

  draw(ctx) {
    for (const f of this.flakes) {
      ctx.globalAlpha = f.size === 2 ? 0.75 : 0.45;
      ctx.fillStyle = "#e8f2ff";
      ctx.fillRect(f.x | 0, f.y | 0, f.size, f.size);
    }
    ctx.globalAlpha = 1;
  }
}
