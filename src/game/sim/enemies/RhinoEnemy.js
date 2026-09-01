// ============================================================
//  Ледяной носорог — гигант окраин. Вдвое крупнее остальных,
//  атакует ТАРАНОМ: долгий замах → разгон, давит массой,
//  пока несётся (duringStrike). С него падает 2 орба тепла.
// ============================================================
import { Enemy } from "./Enemy.js";

export const def = {
  type: "rhino",
  art: "rhino",
  name: "Ледяной носорог",
  hp: 230,
  speed: 40,
  aggro: 180,
  range: 27,
  dmg: 26,
  cd: 3.2,
  scale: 2,
  r: 12,
  h: 20,
  xp: 70,
  voice: { freq: 120, wave: "sawtooth", v: 0.14, dur: 0.5, every: 4.4 },
};

export class RhinoEnemy extends Enemy {
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
