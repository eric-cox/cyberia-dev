// ============================================================
//  sim/Orbs — тепловые орбы, падающие с мутантов.
//  Летят к игроку, когда близко. update() возвращает список
//  собранных за кадр — Simulation начисляет за них тепло/жизнь.
// ============================================================
export class Orbs {
  constructor() {
    this.list = [];
  }

  spawn(x, y) {
    const a = Math.random() * Math.PI * 2;
    this.list.push({
      x,
      y,
      vx: Math.cos(a) * 40,
      vy: Math.sin(a) * 40,
      life: 9,
      t: Math.random() * 5,
    });
  }

  update(dt, target) {
    const got = [];
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i];
      o.t += dt;
      o.life -= dt;
      if (o.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      const dx = target.x - o.x;
      const dy = target.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < 46) {
        // притяжение
        o.vx += (dx / d) * 420 * dt;
        o.vy += (dy / d) * 420 * dt;
      } else {
        o.vx *= Math.pow(0.2, dt);
        o.vy *= Math.pow(0.2, dt);
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (d < 8) {
        got.push(o);
        this.list.splice(i, 1);
      }
    }
    return got;
  }
}
