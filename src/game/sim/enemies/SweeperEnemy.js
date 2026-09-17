// ============================================================
//  Робот-уборщик — уличный андроид, взломанный хакерами.
//  Массивный корпус, щётки-манипуляторы, один глаз-камера.
//  Движется медленно, но неотвратимо. Атакует тараном.
// ============================================================
import { Enemy } from "./Enemy.js";

export const def = {
  type: "sweeper",
  art: "sweeper",
  name: "Робот-уборщик",
  hp: 230,
  speed: 40,
  aggro: 180,
  range: 27,
  dmg: 26,
  cd: 3.2,
  r: 14,
  h: 40, // сетка 40×40, scale=1
  xp: 70,
  // низкий гул сервоприводов
  voice: { freq: 120, wave: "sawtooth", v: 0.14, dur: 0.5, every: 4.4 },
};

export class SweeperEnemy extends Enemy {
  windupTime() {
    return 0.7;
  }
  strikeDuration() {
    return 0.34;
  }
  strikeLunge() {
    return 300;
  }
  strikeReach() {
    return 24;
  }
  // таран: пока несётся, бьёт повторно (раз в ramCooldown)
  duringStrike(dt, sim) {
    this.ramCooldown -= dt;
    const p = sim.player;
    const d = Math.hypot(p.x - this.x, p.y - this.y);
    if (this.ramCooldown <= 0 && d < this.def.range + p.r + 6) {
      sim.damagePlayer(this.dmg, this);
      this.ramCooldown = 0.45;
    }
  }
}
