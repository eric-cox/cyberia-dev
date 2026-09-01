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
import { steer } from "../Movement.js";

export class Enemy extends Entity {
  // Враг одного типа ВСЕГДА одного размера и силы (масштаб к краям
  // не растёт). Разные типы различаются габаритами за счёт размера
  // арт-сетки при едином масштабе пикселя (scale = 1).
  constructor(x, y, def, rng) {
    super(x, y);
    this.type = def.type;
    this.def = def;
    this.r = def.r;
    this.maxHp = def.hp;
    this.hp = this.maxHp;
    this.dmg = def.dmg;

    this.state = "wander";
    this.animT = rng() * 10; // сдвиг фазы анимации, чтобы звери не шагали синхронно
    this.flash = 0;
    this.flip = rng() < 0.5;
    this.wanderTimer = 0;
    this.wx = x; // цель блуждания
    this.wy = y;
    this.attackCooldown = 1 + rng() * 1.5;
    this.windupTimer = 0;
    this.strikeTimer = 0;
    this.ramCooldown = 0; // пауза между повторными ударами тарана (носорог)
    this.knockX = 0; // импульс отдачи от удара игрока
    this.knockY = 0;
    this.growled = false;
    this.voiceCooldown = 2 + rng() * 3; // периодический голос в погоне
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
  // рыкнуть при замахе (телеграф сильных атак)? по умолчанию нет
  windupVoice() {
    return false;
  }

  // ---------- голос ----------
  // У каждого класса свой голос (def.voice): чем меньше и слабее
  // зверь, тем выше частота писка. soft — тихий фоновый рык в погоне.
  speak(sim, soft = false) {
    if (!this.def.voice) return;
    sim.bus.emit("growl", {
      x: this.x,
      y: this.y,
      voice: this.def.voice,
      name: this.def.name,
      soft,
    });
  }

  // ---------- основной цикл: автомат wander→chase→windup→strike ----------
  update(dt, sim) {
    const p = sim.player;
    this.flash = Math.max(0, this.flash - dt);
    this.attackCooldown -= dt;
    const d = Math.hypot(p.x - this.x, p.y - this.y);

    // Отдача от удара игрока: разовый импульс вливается в скорость.
    // Дальше её гасит инерция (на льду зверя уносит далеко).
    if (this.knockX || this.knockY) {
      this.vx += this.knockX;
      this.vy += this.knockY;
      this.knockX = 0;
      this.knockY = 0;
    }

    switch (this.state) {
      // Блуждание: раз в пару секунд выбирает случайную точку рядом.
      case "wander": {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = 1.5 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2;
          this.wx = this.x + Math.cos(a) * 40;
          this.wy = this.y + Math.sin(a) * 40;
        }
        this.moveToward(this.wx, this.wy, this.wanderSpeed(), dt, sim);
        if (d < this.def.aggro) {
          this.state = "chase";
          if (!this.growled) {
            this.growled = true; // рычит один раз при обнаружении
            if (d < 220) this.speak(sim);
          }
        }
        break;
      }
      // Погоня: преследует, пока игрок не оторвался (гистерезис ×1.5).
      case "chase": {
        if (d > this.def.aggro * 1.5) {
          this.state = "wander";
          break;
        }
        this.voiceCooldown -= dt;
        if (this.voiceCooldown <= 0) {
          this.voiceCooldown =
            (this.def.voice ? this.def.voice.every : 4) + Math.random() * 2;
          if (d < 300) this.speak(sim, true);
        }
        if (d <= this.def.range + p.r + 2 && this.attackCooldown <= 0) {
          this.state = "windup";
          this.windupTimer = this.windupTime();
          if (this.windupVoice()) this.speak(sim);
          break;
        }
        this.moveToward(p.x, p.y, this.chaseSpeed(), dt, sim);
        break;
      }
      // Замах (телеграф): стоит на месте, потом бьёт с рывком.
      case "windup": {
        this.windupTimer -= dt;
        this.flip = p.x < this.x;
        if (this.windupTimer <= 0) {
          this.state = "strike";
          this.strikeTimer = this.strikeDuration();
          this.ramCooldown = 0;
          const ang = Math.atan2(p.y - this.y, p.x - this.x);
          this.knockX = Math.cos(ang) * this.strikeLunge();
          this.knockY = Math.sin(ang) * this.strikeLunge();
          if (d <= this.def.range + p.r + this.strikeReach())
            sim.damagePlayer(this.dmg, this);
        }
        break;
      }
      // Удар: рывок уже задан импульсом; длится strikeDuration.
      case "strike": {
        this.strikeTimer -= dt;
        this.duringStrike(dt, sim);
        if (this.strikeTimer <= 0) {
          this.state = "chase";
          this.attackCooldown = this.def.cd;
        }
        break;
      }
    }
    this.animT += dt;
  }

  // Движение с инерцией: на снегу зверь послушен, на льду —
  // проскальзывает мимо и с трудом поворачивает.
  moveToward(tx, ty, speed, dt, sim) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const l = Math.hypot(dx, dy);
    let dvx = 0;
    let dvy = 0;
    if (l > 3) {
      const cell = sim.map.cellAt(this.x, this.y);
      const s = speed * cell.speed;
      dvx = (dx / l) * s;
      dvy = (dy / l) * s;
      if (Math.abs(dx) > 2) this.flip = dx < 0;
    }
    steer(this, dvx, dvy, sim.map, dt);
    const blocked = sim.moveEntity(this, this.vx * dt, this.vy * dt);
    if (blocked.x) this.vx *= -0.25;
    if (blocked.y) this.vy *= -0.25;
  }
}
