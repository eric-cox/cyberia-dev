// ============================================================
//  sim/Player — состояние игрока и его таймеры.
//  Движение и бой ведёт Simulation (см. sim/Simulation.js),
//  инерция — sim/Movement.js.
// ============================================================
import { Entity } from "./Entity.js";

export class Player extends Entity {
  constructor(x, y, speed) {
    super(x, y);
    this.r = 5;
    this.speed = speed;
    this.face = Math.PI / 2; // направление взгляда/удара
    this.moving = false;
    this.animT = 0;
    this.attackCooldown = 0; // перезарядка удара
    this.attackAnimTime = 0; // сколько ещё идёт анимация замаха
    this.flash = 0; // белая вспышка при уроне
    this.lunge = 0; // рывок при ударе
  }
}
