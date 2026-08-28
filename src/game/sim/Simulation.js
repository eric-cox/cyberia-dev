// ============================================================
//  sim/Simulation — вся игровая логика забега.
//
//  ЧИСТАЯ СИМУЛЯЦИЯ: ни canvas, ни звука, ни React. Знает
//  только: карту (WorldMap), сущности, команды игрока,
//  Difficulty и Equipment. Обо всём происходящем сообщает
//  событиями в EventBus (список — в ARCHITECTURE.md).
//
//  Это «серверная» часть для будущего мультиплеера:
// Simulation можно вынести в воркер/на сервер, а клиенту
//  оставить Renderer + проигрывание команд.
// ============================================================
import { T } from "../core/Constants.js";
import { clamp } from "../core/Utils.js";
import { mulberry32 } from "../core/Rng.js";
import { generateWorld } from "../world/WorldGen.js";
import { placeRunLoot, collectArtifact, itemStatText, itemColor } from "../loot/RunLoot.js";
import { Player } from "./Player.js";
import { Orbs } from "./Orbs.js";
import { populateEnemies } from "./enemies/EnemyFactory.js";

export class Simulation {
  // bus — шина событий; store/equipment — схрон и экипировка;
  // diff — балансировочный профиль (systems/Difficulty)
  constructor(bus, store, equipment, diff) {
    this.bus = bus;
    this.store = store;
    this.equipment = equipment;
    this.diff = diff;

    this.state = "menu"; // menu | playing | dead (victory — флаг)
    this.map = null;
    this.player = null;
    this.enemies = [];
    this.pickups = [];
    this.orbs = new Orbs();

    this.resetRunFields();
  }

  resetRunFields() {
    this.heat = this.diff.player.maxHeat;
    this.hp = this.diff.player.maxHp;
    this.hpRate = 0;
    this.time = 0;
    this.kills = 0;
    this.foundThisRun = 0;
    this.total = 0;
    this.victoryShown = false;
    this.deathCause = "cold";
    this.coldTickT = 0;
    this.hbTimer = 0;
  }

  // Построить мир без старта забега (фон главного меню)
  generate(seed) {
    this.map = generateWorld(seed);
    this.enemies = [];
    this.pickups = [];
    this.orbs = new Orbs();
    this.player = null;
    this.state = "menu";
  }

  // Полный старт забега
  startRun(seed) {
    this.map = generateWorld(seed);
    const rng = mulberry32((seed ^ 0xa11ce) >>> 0);
    const c = this.map.center;

    this.player = new Player(c.x, c.y, this.diff.player.speed);
    this.pickups = placeRunLoot(this.map, rng, this.diff);
    this.enemies = populateEnemies(this.map, rng, this.diff);
    this.orbs = new Orbs();

    this.resetRunFields();
    this.total = this.pickups.length;
    this.state = "playing";
    this.bus.emit("run-start", { map: this.map });
  }

  // ---------- главный шаг (команда → состояние) ----------
  update(dt, cmd) {
    if (this.state !== "playing") return;
    const p = this.player;
    this.time += dt;

    // --- движение ---
    const slowMul = p.slowT > 0 ? 0.5 : 1;
    const spd = p.speed * this.map.speedFactor(p.x, p.y) * slowMul;
    this.moveEntity(p, cmd.mx * spd * dt, cmd.my * spd * dt);
    p.moving = cmd.mx !== 0 || cmd.my !== 0;
    if (p.moving) {
      p.face = Math.atan2(cmd.my, cmd.mx);
      p.animT += dt;
    }

    // --- атака: SPACE — по направлению движения,
    //            ЛКМ — в курсор (угол кладёт Game в cmd.aimAngle)
    if (cmd.attackMelee) this.doAttack(p.face);
    if (cmd.attackAim && cmd.aimAngle != null) this.doAttack(cmd.aimAngle);

    // таймеры игрока
    p.attackT = Math.max(0, p.attackT - dt);
    p.attackAnimT = Math.max(0, p.attackAnimT - dt);
    p.slowT = Math.max(0, p.slowT - dt);
    p.holeCd = Math.max(0, p.holeCd - dt);
    p.lunge = Math.max(0, p.lunge - dt * 6);
    p.flash = Math.max(0, p.flash - dt);

    this.updateColdAndHoles(dt, p);
    if (this.state !== "playing") return;

    this.updateEnemies(dt, p);
    this.updateOrbs(dt, p);
    this.updatePickups(dt, p);
  }

  // ---------- холод, жизнь, провалы ----------
  updateColdAndHoles(dt, p) {
    const heatCfg = this.diff.heat;
    const insulation = this.equipment.insulation();

    // провалы: разовый урон теплу + замедление, постоянный отток
    if (this.map.tileAt(p.x, p.y) === T.HOLE) {
      if (p.holeCd <= 0) {
        p.holeCd = 1.1;
        p.slowT = 1.6;
        this.heat -= heatCfg.holeDamage;
        this.bus.emit("hole", { x: p.x, y: p.y });
      }
      this.heat -= heatCfg.holeDrain * dt;
    }

    // тепло тает; скорость снижает защита одежды
    const exposure = 100 / (100 + insulation);
    this.heat -= heatCfg.baseDrain * exposure * dt;

    // когда тепло на исходе — мороз выедает жизнь
    let hpDelta = 0;
    if (this.heat <= 0) {
      this.heat = 0;
      hpDelta = -heatCfg.coldDrain * exposure;
      this.deathCause = "cold";
      this.coldTickT -= dt;
      if (this.coldTickT <= 0) {
        this.coldTickT = 0.7;
        this.bus.emit("cold-tick", {
          x: p.x + (Math.random() * 12 - 6),
          y: p.y,
          amount: Math.max(1, Math.round(-hpDelta * 0.7)),
          critical: true,
        });
      }
    } else if (this.heat < heatCfg.chillBelow) {
      hpDelta = -heatCfg.chillDrain * exposure;
      this.deathCause = "cold";
      this.coldTickT -= dt;
      if (this.coldTickT <= 0) {
        this.coldTickT = 1.4;
        this.bus.emit("cold-tick", { x: p.x, y: p.y, amount: 1, critical: false });
      }
    } else if (this.heat > heatCfg.regenAbove && this.hp < this.diff.player.maxHp) {
      hpDelta = heatCfg.regen;
    }

    if (hpDelta !== 0) {
      this.hp = clamp(this.hp + hpDelta * dt, 0, this.diff.player.maxHp);
      this.hpRate = hpDelta;
      if (this.hp <= 0) {
        this.die(this.deathCause);
        return;
      }
    } else {
      this.hpRate = 0;
    }

    // сердцебиение на низких значениях
    if (this.hp < 35 || this.heat < 20) {
      this.hbTimer -= dt;
      if (this.hbTimer <= 0) {
        this.hbTimer = 0.4 + (clamp(this.hp, 0, 35) / 35) * 0.55;
        this.bus.emit("heartbeat");
      }
    }
  }

  // ---------- мутанты ----------
  updateEnemies(dt, p) {
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    this.enemies = this.enemies.filter((e) => !e.dead);

    // расталкивание, чтобы не слипались
    for (let i = 0; i < this.enemies.length; i++)
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (d > 0.01 && d < min) {
          const push = ((min - d) / 2) * 0.8;
          const nx = (dx / d) * push;
          const ny = (dy / d) * push;
          this.moveEntity(a, -nx, -ny);
          this.moveEntity(b, nx, ny);
        }
      }
  }

  // ---------- орбы тепла ----------
  updateOrbs(dt, p) {
    const heatCfg = this.diff.heat;
    for (const o of this.orbs.update(dt, p)) {
      this.heat = Math.min(this.diff.player.maxHeat, this.heat + heatCfg.orbHeat);
      this.hp = Math.min(this.diff.player.maxHp, this.hp + heatCfg.orbHp);
      this.bus.emit("orb", {
        x: p.x,
        y: p.y,
        heat: heatCfg.orbHeat,
        hp: heatCfg.orbHp,
      });
    }
  }

  // ---------- артефакты ----------
  updatePickups(dt, p) {
    for (const pk of this.pickups) {
      if (pk.dead) continue;
      if (pk.update(dt, p)) {
        pk.dead = true;
        this.collect(pk);
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.dead);
  }

  collect(pk) {
    this.foundThisRun++;
    const item = pk.item;
    const { isNew, equipped } = collectArtifact(this.store, this.equipment, item);
    this.bus.emit("pickup", {
      x: pk.x,
      y: pk.y,
      item,
      isNew,
      equipped,
      color: itemColor(item),
      statText: itemStatText(item),
    });

    if (this.foundThisRun >= this.total && !this.victoryShown) {
      this.victoryShown = true;
      this.bus.emit("victory", { time: this.time, kills: this.kills });
    }
  }

  // ---------- бой ----------
  doAttack(angle) {
    const p = this.player;
    if (p.attackT > 0) return;
    const w = this.equipment.weapon();
    p.attackT = 1 / w.rate;
    p.attackAnimT = 0.16;
    p.face = angle;
    p.lunge = 1;

    const ox = p.x + Math.cos(angle) * 7;
    const oy = p.y - 3 + Math.sin(angle) * 7;
    this.bus.emit("attack", { x: ox, y: oy, angle, range: w.range });

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > w.range + e.r) continue;
      const ea = Math.atan2(dy, dx) - angle;
      const diff = Math.atan2(Math.sin(ea), Math.cos(ea));
      if (Math.abs(diff) > 1.25) continue;
      const dmg = Math.max(1, Math.round(w.dmg * (0.9 + Math.random() * 0.25)));
      this.hitEnemy(e, dmg, angle);
    }
  }

  hitEnemy(e, dmg, angle) {
    e.hp -= dmg;
    e.flash = 0.13;
    e.kx = Math.cos(angle) * 150;
    e.ky = Math.sin(angle) * 150;
    if (e.state === "wander") e.state = "chase";
    this.bus.emit("hit", { x: e.x, y: e.y, dmg });
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true;
    this.kills++;
    for (let i = 0; i < e.def.orbs; i++) this.orbs.spawn(e.x, e.y - 4);
    this.bus.emit("kill", { x: e.x, y: e.y, name: e.def.name, type: e.type });
  }

  // Урон игроку (удары мутантов). Провалы бьют по теплу напрямую.
  damagePlayer(dmg, src) {
    if (this.state !== "playing") return;
    const p = this.player;
    this.hp = clamp(this.hp - dmg, 0, this.diff.player.maxHp);
    this.deathCause = "beast";
    p.flash = 0.16;
    this.bus.emit("hurt", { x: p.x, y: p.y, dmg });
    if (src) {
      const a = Math.atan2(p.y - src.y, p.x - src.x);
      this.moveEntity(p, Math.cos(a) * 7, Math.sin(a) * 7);
    }
    if (this.hp <= 0) this.die("beast");
  }

  die(cause = "cold") {
    this.deathCause = cause;
    this.hp = 0;
    this.state = "dead";
    this.bus.emit("death", { cause, time: this.time, kills: this.kills });
  }

  // ---------- физика ----------
  moveEntity(e, dx, dy) {
    const nx = clamp(e.x + dx, 10, this.map.widthPx - 10);
    if (!this.map.collidesCircle(nx, e.y, e.r)) e.x = nx;
    const ny = clamp(e.y + dy, 10, this.map.heightPx - 10);
    if (!this.map.collidesCircle(e.x, ny, e.r)) e.y = ny;
  }
}
