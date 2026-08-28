// ============================================================
//  sim/enemies/Enemy — базовый мутант: конечный автомат
//  wander → chase → windup → strike.
//
//  НОВЫЕ КЛАССЫ ВРАГОВ (механические, подземные…) создаются
//  так: файл-сосед наследует Enemy и переопределяет хуки:
//    windupTime() / strikeDuration() / strikeLunge() /
//    strikeReach() / duringStrike() / wanderSpeed() /
//    chaseSpeed() — или полностью update() для своего
//  поведения (рытьё, телепорт, стрельба). Числа — в def.
// ============================================================
import { Entity } from "../Entity.js";

export class Enemy extends Entity {
  // mul — «полярный множитель» силы (см. EnemyFactory)
  constructor(x, y, def, rng, mul = 1) {
    super(x, y);
    this.type = def.type;
    this.def = def;
    this.mul = mul;
    this.r = def.r * Math.min(mul, 1.3);
    this.maxHp = Math.round(def.hp * mul);
    this.hp = this.maxHp;
    this.dmg = Math.round(def.dmg * mul);

    this.state = "wander";
    this.animT = rng() * 10;
    this.flash = 0;
    this.flip = rng() < 0.5;
    this.wanderT = 0;
    this.wx = x;
    this.wy = y;
    this.attackCd = 1 + rng() * 1.5;
    this.windT = 0;
    this.strikeT = 0;
    this.ramCd = 0;
    this.kx = 0;
    this.ky = 0;
    this.growled = false;
  }

  // ---------- хуки для подклассов ----------
  windupTime() {
    return 0.42;
  }
  strikeDuration() {
    return 0.16;
  }
  strikeLunge() {
    return 150;
  }
  strikeReach() {
    return 9;
  }
  duringStrike(dt, sim) {}
  wanderSpeed() {
    return this.def.speed * 0.32;
  }
  chaseSpeed() {
    return this.def.speed;
  }

  // ---------- основной цикл ----------
  update(dt, sim) {
    const p = sim.player;
    this.flash = Math.max(0, this.flash - dt);
    this.attackCd -= dt;
    const d = Math.hypot(p.x - this.x, p.y - this.y);

    // отдача от ударов игрока
    if (this.kx || this.ky) {
      sim.moveEntity(this, this.kx * dt, this.ky * dt);
      this.kx *= Math.pow(0.0005, dt);
      this.ky *= Math.pow(0.0005, dt);
      if (Math.abs(this.kx) < 2) this.kx = 0;
      if (Math.abs(this.ky) < 2) this.ky = 0;
    }

    switch (this.state) {
      case "wander": {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = 1.5 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2;
          this.wx = this.x + Math.cos(a) * 40;
          this.wy = this.y + Math.sin(a) * 40;
        }
        this.moveToward(this.wx, this.wy, this.wanderSpeed(), dt, sim);
        if (d < this.def.aggro) {
          this.state = "chase";
          if (!this.growled) {
            this.growled = true;
            if (d < 180) sim.bus.emit("growl", { x: this.x, y: this.y });
          }
        }
        break;
      }
      case "chase": {
        if (d > this.def.aggro * 1.5) {
          this.state = "wander";
          break;
        }
        if (d <= this.def.range + p.r + 2 && this.attackCd <= 0) {
          this.state = "windup";
          this.windT = this.windupTime();
          break;
        }
        this.moveToward(p.x, p.y, this.chaseSpeed(), dt, sim);
        break;
      }
      case "windup": {
        this.windT -= dt;
        this.flip = p.x < this.x;
        if (this.windT <= 0) {
          this.state = "strike";
          this.strikeT = this.strikeDuration();
          this.ramCd = 0;
          const ang = Math.atan2(p.y - this.y, p.x - this.x);
          this.kx = Math.cos(ang) * this.strikeLunge();
          this.ky = Math.sin(ang) * this.strikeLunge();
          if (d <= this.def.range + p.r + this.strikeReach())
            sim.damagePlayer(this.dmg, this);
        }
        break;
      }
      case "strike": {
        this.strikeT -= dt;
        this.duringStrike(dt, sim);
        if (this.strikeT <= 0) {
          this.state = "chase";
          this.attackCd = this.def.cd;
        }
        break;
      }
    }
    this.animT += dt;
  }

  moveToward(tx, ty, speed, dt, sim) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const l = Math.hypot(dx, dy);
    if (l < 3) return;
    if (Math.abs(dx) > 2) this.flip = dx < 0;
    const slow = sim.map.speedFactor(this.x, this.y);
    sim.moveEntity(this, (dx / l) * speed * slow * dt, (dy / l) * speed * slow * dt);
  }
}
