// ============================================================
//  СУЩНОСТИ: игрок, мутанты, артефакты на земле, деревья.
//  Отрисовка — через микро модули арт-системы (artSystem).
// ============================================================
import { artSystem } from "./art/pixel.js";
import { TIER_COLORS } from "./data/items.js";

let UID = 1;

export class Entity {
  constructor(x, y) {
    this.id = UID++;
    this.x = x;
    this.y = y;
    this.r = 5;
    this.dead = false;
  }
}

// ---------- ИГРОК ----------
export class Player extends Entity {
  constructor(x, y) {
    super(x, y);
    this.r = 5;
    this.speed = 96;
    this.face = Math.PI / 2;
    this.moving = false;
    this.animT = 0;
    this.attackT = 0;
    this.attackAnimT = 0;
    this.slowT = 0;
    this.inHole = false;
    this.holeCd = 0;
    this.flash = 0;
    this.lunge = 0;
  }
  draw(ctx) {
    const anim =
      this.attackAnimT > 0 ? "attack" : this.moving ? "walk" : "idle";
    const idx = artSystem.animIndex("player", anim, this.animT);
    const lx = Math.cos(this.face) * this.lunge * 4;
    const ly = Math.sin(this.face) * this.lunge * 4;
    // тень
    ctx.fillStyle = "rgba(10,15,30,0.35)";
    ctx.fillRect(Math.round(this.x - 5), Math.round(this.y - 1), 10, 3);
    artSystem.draw(ctx, "player", anim, idx, this.x + lx, this.y + 1, {
      flip: Math.cos(this.face) < 0,
      white: this.flash > 0,
    });
  }
}

// ---------- МУТАНТЫ ----------
export const ENEMY_TYPES = {
  wolf: {
    art: "wolf",
    name: "Волк-мутант",
    hp: 30,
    speed: 74,
    aggro: 132,
    range: 15,
    dmg: 8,
    cd: 1.5,
    scale: 1,
  },
  boar: {
    art: "boar",
    name: "Секач",
    hp: 55,
    speed: 58,
    aggro: 112,
    range: 17,
    dmg: 12,
    cd: 2.0,
    scale: 1.15,
  },
  brute: {
    art: "brute",
    name: "Отродье",
    hp: 110,
    speed: 43,
    aggro: 155,
    range: 21,
    dmg: 20,
    cd: 2.6,
    scale: 1.25,
  },
};

export class Enemy extends Entity {
  constructor(x, y, type, rng) {
    super(x, y);
    this.type = type;
    this.def = ENEMY_TYPES[type];
    this.r = type === "brute" ? 8 : 6;
    this.hp = this.def.hp;
    this.maxHp = this.def.hp;
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
    this.kx = 0;
    this.ky = 0;
    this.growled = false;
  }

  update(dt, game) {
    const p = game.player;
    this.flash = Math.max(0, this.flash - dt);
    this.attackCd -= dt;
    const d = Math.hypot(p.x - this.x, p.y - this.y);

    // отдача от ударов
    if (this.kx || this.ky) {
      game.moveEntity(this, this.kx * dt, this.ky * dt);
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
        this.moveToward(this.wx, this.wy, this.def.speed * 0.32, dt, game);
        if (d < this.def.aggro) {
          this.state = "chase";
          if (!this.growled) {
            this.growled = true;
            if (d < 180) game.sfx.growl();
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
          this.windT = this.type === "brute" ? 0.6 : 0.42;
          break;
        }
        this.moveToward(p.x, p.y, this.def.speed, dt, game);
        break;
      }
      case "windup": {
        this.windT -= dt;
        this.flip = p.x < this.x;
        if (this.windT <= 0) {
          this.state = "strike";
          this.strikeT = 0.16;
          const ang = Math.atan2(p.y - this.y, p.x - this.x);
          this.kx = Math.cos(ang) * 150;
          this.ky = Math.sin(ang) * 150;
          if (d <= this.def.range + p.r + 9) game.damagePlayer(this.def.dmg, this);
        }
        break;
      }
      case "strike": {
        this.strikeT -= dt;
        if (this.strikeT <= 0) {
          this.state = "chase";
          this.attackCd = this.def.cd;
        }
        break;
      }
    }
    this.animT += dt;
  }

  moveToward(tx, ty, speed, dt, game) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const l = Math.hypot(dx, dy);
    if (l < 3) return;
    if (Math.abs(dx) > 2) this.flip = dx < 0;
    const slow = game.speedFactor(this.x, this.y);
    game.moveEntity(this, (dx / l) * speed * slow * dt, (dy / l) * speed * slow * dt);
  }

  draw(ctx) {
    const art = this.def.art;
    let anim = "walk";
    if (this.state === "windup") anim = "windup";
    else if (this.state === "strike") anim = "attack";
    else if (this.state === "wander") anim = Math.hypot(this.wx - this.x, this.wy - this.y) < 4 ? "idle" : "walk";
    const idx = artSystem.animIndex(art, anim, this.animT);
    const shake = this.state === "windup" ? (Math.random() - 0.5) * 1.6 : 0;
    ctx.fillStyle = "rgba(10,15,30,0.35)";
    const sw = this.type === "brute" ? 14 : 10;
    ctx.fillRect(Math.round(this.x - sw / 2), Math.round(this.y - 1), sw, 3);
    artSystem.draw(ctx, art, anim, idx, this.x + shake, this.y + 1, {
      flip: this.flip,
      scale: this.def.scale,
      white: this.flash > 0,
    });
    // полоса HP при уроне
    if (this.hp < this.maxHp) {
      const w = 14;
      ctx.fillStyle = "#0a0f1e";
      ctx.fillRect(this.x - w / 2 - 1, this.y - 18, w + 2, 3);
      ctx.fillStyle = "#ff4757";
      ctx.fillRect(this.x - w / 2, this.y - 17, (w * this.hp) / this.maxHp, 1);
    }
  }
}

// ---------- АРТЕФАКТ НА КАРТЕ ----------
export class Pickup extends Entity {
  constructor(x, y, item) {
    super(x, y);
    this.item = item;
    this.t = Math.random() * 10;
    this.r = 7;
  }
  draw(ctx) {
    this.t += 0.016;
    const col = TIER_COLORS[this.item.tier] || "#9fb6cc";
    const pulse = 0.5 + Math.sin(this.t * 3.2) * 0.5;
    // сигнальное кольцо
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.25 + pulse * 0.35;
    ctx.strokeRect(
      Math.round(this.x - 8 - pulse * 2),
      Math.round(this.y - 10 - pulse * 2),
      16 + pulse * 4,
      16 + pulse * 4
    );
    ctx.globalAlpha = 1;
    // подложка-сугроб
    ctx.fillStyle = "rgba(10,15,30,0.25)";
    ctx.fillRect(Math.round(this.x - 5), Math.round(this.y - 2), 10, 3);
    const bob = Math.sin(this.t * 2.6) * 1.5;
    artSystem.draw(ctx, this.item.art, "idle", 0, this.x, this.y - 2 + bob, {});
  }
}

// ---------- ДЕРЕВО (проп с y-сортировкой) ----------
export class TreeProp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.sway = Math.random() * 10;
  }
  draw(ctx, time) {
    const sway = Math.sin(time * 1.3 + this.sway) * 0.6;
    artSystem.draw(ctx, "tree", "idle", 0, this.x + sway, this.y, {});
  }
}
