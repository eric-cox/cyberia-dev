// ============================================================
//  sim/Pellet — дробинка, летящая прямолинейно.
//  update() возвращает true, когда дробинка отжила своё.
//  Столкновения с врагами и стенами разбирает Simulation
//  (см. Simulation.updatePellets).
// ============================================================
import { Entity } from "./Entity.js";

export class Pellet extends Entity {
  // angle — направление выстрела, spread — полный разлёт пучка (рад).
  // Каждая дробинка получает свой случайный угол и скорость,
  // поэтому пучок «раскрывается» конусом.
  constructor(x, y, angle, speed, dmg, spread) {
    super(x, y);
    const a = angle + (Math.random() - 0.5) * spread;
    const s = speed * (0.8 + Math.random() * 0.4);
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.dmg = dmg;
    this.life = 0.32;
    this.r = 1.6;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    return this.life <= 0;
  }
}
