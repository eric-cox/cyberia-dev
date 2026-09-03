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
import { clamp } from "../core/Utils.js";
import { mulberry32 } from "../core/Rng.js";
import { generateWorld } from "../world/WorldGen.js";
import {
  placeUpgrades,
  placeAmmo,
  collectArtifact,
  itemStatText,
  itemColor,
} from "../loot/RunLoot.js";
import { steer } from "./Movement.js";
import { Player } from "./Player.js";
import { Experience } from "./Experience.js";
import { Pellet } from "./Pellet.js";
import { populateEnemies, spawnLootGuards } from "./enemies/EnemyFactory.js";

// дробовик: время перезарядки и ёмкость ствола
export const SHOTGUN_RELOAD = 2;
export const SHOTGUN_TUBE = 2;

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
    this.pellets = []; // летящая дробь
    this.ammoPickups = []; // россыпи патронов
    this.xp = new Experience(this.diff.xp, this.diff.player.maxHp);

    this.resetRunFields();
  }

  resetRunFields() {
    this.heat = this.diff.player.maxHeat;
    this.xp.reset(); // опыт — прогрессия внутри забега
    this.hp = this.xp.maxHp;
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
    this.pellets = [];
    this.ammoPickups = [];
    this.player = null;
    this.state = "menu";
  }

  // Полный старт забега
  startRun(seed) {
    this.map = generateWorld(seed);
    const rng = mulberry32((seed ^ 0xa11ce) >>> 0);
    const c = this.map.center;

    this.player = new Player(c.x, c.y, this.diff.player.speed);
    // на карте — только улучшения надетого (0–2 шт.)
    this.pickups = placeUpgrades(this.map, rng, this.diff, this.equipment);
    this.ammoPickups = placeAmmo(this.map, rng, this.diff);
    this.enemies = populateEnemies(this.map, rng, this.diff);
    // вокруг каждого артефакта — скопление врагов-охранников
    this.enemies.push(...spawnLootGuards(this.map, rng, this.diff, this.pickups));
    this.pellets = [];

    this.resetRunFields();
    // если вышел с дробовиком в руке — стартовый запас патронов
    if (this.equipment.weapon().kind === "shotgun") {
      this.player.tube = SHOTGUN_TUBE;
      this.player.ammo = 2;
    }
    this.total = this.pickups.length;
    this.state = "playing";
    this.bus.emit("run-start", { map: this.map });
  }

  // ---------- главный шаг (команда → состояние) ----------
  update(dt, cmd) {
    if (this.state !== "playing") return;
    const p = this.player;
    this.time += dt;

    // --- движение: скорость с инерцией ячейки (см. Movement.js) ---
    const cell = this.map.cellAt(p.x, p.y);
    const spd = p.speed * cell.speed;
    steer(p, cmd.moveX * spd, cmd.moveY * spd, this.map, dt);
    const blocked = this.moveEntity(p, p.vx * dt, p.vy * dt);
    if (blocked.x) p.vx *= -0.25; // лёгкий отскок от препятствия
    if (blocked.y) p.vy *= -0.25;
    const speedNow = Math.hypot(p.vx, p.vy);
    p.moving = speedNow > 14;
    if (cmd.moveX !== 0 || cmd.moveY !== 0) p.face = Math.atan2(cmd.moveY, cmd.moveX);
    else if (p.moving) p.face = Math.atan2(p.vy, p.vx); // доворачивает по заносу на льду
    if (p.moving) p.animT += dt;

    // --- атака: SPACE — по направлению движения,
    //            ЛКМ — в курсор (угол кладёт Game в cmd.aimAngle)
    if (cmd.attackMelee) this.doAttack(p.face);
    if (cmd.attackAim && cmd.aimAngle != null) this.doAttack(cmd.aimAngle);

    // --- перезарядка дробовика (ручная — KeyR) ---
    if (cmd.reload) this.startReload();
    if (p.reloadT > 0) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) {
        p.reloadT = 0;
        const load = Math.min(SHOTGUN_TUBE - p.tube, p.ammo);
        p.tube += load;
        p.ammo -= load;
        this.bus.emit("reload-done", { tube: p.tube, ammo: p.ammo });
      }
    }

    // таймеры игрока
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.attackAnimTime = Math.max(0, p.attackAnimTime - dt);
    p.lunge = Math.max(0, p.lunge - dt * 6);
    p.flash = Math.max(0, p.flash - dt);

    this.updateCold(dt, p);
    if (this.state !== "playing") return;

    this.updateEnemies(dt, p);
    this.updatePickups(dt, p);
    this.updatePellets(dt);
    this.updateAmmoPickups(dt, p);
  }

  // ---------- холод и жизнь ----------
  updateCold(dt, p) {
    const heatCfg = this.diff.heat;
    const insulation = this.equipment.insulation();

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
    } else if (this.heat > heatCfg.regenAbove && this.hp < this.xp.maxHp) {
      hpDelta = heatCfg.regen;
    }

    if (hpDelta !== 0) {
      this.hp = clamp(this.hp + hpDelta * dt, 0, this.xp.maxHp);
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

  // Подбор кладёт артефакт в схрон; базовый лут надевается сразу,
  // продвинутый — нет (см. loot/RunLoot.collectArtifact).
  collect(pk) {
    this.foundThisRun++;
    const item = pk.item;
    const { isNew, equipped } = collectArtifact(
      this.store,
      this.equipment,
      item,
      this.diff
    );
    this.bus.emit("pickup", {
      x: pk.x,
      y: pk.y,
      item,
      isNew,
      equipped,
      color: itemColor(item),
      statText: itemStatText(item),
    });

    // победа по луту — когда он на карте есть и весь собран
    if (this.total > 0 && this.foundThisRun >= this.total && !this.victoryShown) {
      this.victoryShown = true;
      this.bus.emit("victory", { time: this.time, kills: this.kills });
    }
  }

  // ---------- бой ----------
  doAttack(angle) {
    const weapon = this.equipment.weapon();
    if (weapon.kind === "shotgun") {
      this.fireShotgun(angle);
      return;
    }
    this.meleeAttack(angle);
  }

  // Выстрел дробовиком: 2 патрона в стволе можно отстрелять подряд,
  // затем перезарядка. Пучок дроби (см. Pellet.js).
  fireShotgun(angle) {
    const p = this.player;
    if (p.reloadT > 0) return; // перезаряжается
    if (p.attackCooldown > 0) return;
    if (p.tube <= 0) {
      this.startReload(); // пусто: заряжаем или щёлкаем впустую
      return;
    }
    const w = this.equipment.weapon();
    p.tube--;
    p.attackCooldown = 1 / w.rate;
    p.attackAnimTime = 0.22;
    p.face = angle;
    p.lunge = 1.3;
    // отдача толкает игрока назад (на льду — ощутимо)
    p.vx -= Math.cos(angle) * 70;
    p.vy -= Math.sin(angle) * 70;
    const ox = p.x + Math.cos(angle) * 14;
    const oy = p.y - 6 + Math.sin(angle) * 14;
    this.bus.emit("shot", { x: ox, y: oy, angle, range: w.range, tube: p.tube });
    for (let i = 0; i < w.pellets; i++)
      this.pellets.push(new Pellet(ox, oy, angle, w.pelletSpeed, w.pelletDmg, w.spread));
    // ствол пуст — автоматически заряжаем, если есть патроны
    if (p.tube <= 0) this.startReload();
  }

  // Перезарядка: 2 секунды, берёт до 2 патронов из запаса.
  startReload() {
    const p = this.player;
    const w = this.equipment.weapon();
    if (!w || w.kind !== "shotgun") return;
    if (p.reloadT > 0 || p.tube >= SHOTGUN_TUBE) return;
    if (p.ammo <= 0) {
      this.bus.emit("dryfire"); // патроны кончились — пустой щелчок
      return;
    }
    p.reloadT = SHOTGUN_RELOAD;
    this.bus.emit("reload-start");
  }

  // Полёт дроби: столкновения с врагами (кровь) и стенами (искры)
  updatePellets(dt) {
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const pl = this.pellets[i];
      const expired = pl.update(dt);
      let gone = expired;
      if (!gone) {
        const impactAngle = Math.atan2(pl.vy, pl.vx);
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - pl.x, e.y - (pl.y + 4));
          if (d < e.r + pl.r) {
            this.hitEnemy(e, pl.dmg, impactAngle);
            this.bus.emit("blood", { x: pl.x, y: pl.y, angle: impactAngle });
            gone = true;
            break;
          }
        }
        if (!gone && this.map.cellAt(pl.x, pl.y).solid) {
          this.bus.emit("spark", { x: pl.x, y: pl.y });
          gone = true;
        }
      }
      if (gone) this.pellets.splice(i, 1);
    }
  }

  // Подбор россыпей патронов (пополняют запас, не схрон)
  updateAmmoPickups(dt, p) {
    for (let i = this.ammoPickups.length - 1; i >= 0; i--) {
      const ap = this.ammoPickups[i];
      if (ap.update(dt, p)) {
        p.ammo += ap.amount;
        this.bus.emit("ammo", { x: ap.x, y: ap.y, amount: ap.amount, total: p.ammo });
        this.ammoPickups.splice(i, 1);
      }
    }
  }

  // Удар веером: задевает врагов в радиусе оружия и в секторе
  // ±1.25 рад (~±72°) вокруг направления удара.
  meleeAttack(angle) {
    const p = this.player;
    if (p.attackCooldown > 0) return; // идёт перезарядка
    const weapon = this.equipment.weapon();
    p.attackCooldown = 1 / weapon.rate;
    p.attackAnimTime = 0.16;
    p.face = angle;
    p.lunge = 1;

    const ox = p.x + Math.cos(angle) * 7;
    const oy = p.y - 3 + Math.sin(angle) * 7;
    this.bus.emit("attack", { x: ox, y: oy, angle, range: weapon.range });

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > weapon.range + e.r) continue;
      // Разность углов, нормализованная в [-π, π]:
      // atan2(sin, cos) «схлопывает» переход через ±180°,
      // иначе угол 359° и 1° считались бы далёкими.
      const angleToEnemy = Math.atan2(dy, dx) - angle;
      const angleDiff = Math.atan2(Math.sin(angleToEnemy), Math.cos(angleToEnemy));
      if (Math.abs(angleDiff) > 1.25) continue;
      // Разброс урона ±~12%, минимум 1
      const dmg = Math.max(1, Math.round(weapon.dmg * (0.9 + Math.random() * 0.25)));
      this.hitEnemy(e, dmg, angle);
    }
  }

  hitEnemy(e, dmg, angle) {
    e.hp -= dmg;
    e.flash = 0.13;
    e.knockX = Math.cos(angle) * 150; // отдача в сторону удара
    e.knockY = Math.sin(angle) * 150;
    if (e.state === "wander") e.state = "chase";
    this.bus.emit("hit", { x: e.x, y: e.y, dmg, voice: e.def.voice, name: e.def.name });
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true;
    this.kills++;
    this.bus.emit("kill", { x: e.x, y: e.y, name: e.def.name, type: e.type, voice: e.def.voice });
    this.awardXp(e);
  }

  // Опыт — единственная награда за убийство (см. Experience.js).
  awardXp(e) {
    const amount = e.def.xp || 0;
    if (amount <= 0) return;
    const levels = this.xp.addXp(amount);
    this.bus.emit("xp", { x: e.x, y: e.y, amount });
    for (const level of levels) {
      // с уровнем растёт максимум жизни, и шкала сразу наполняется
      this.hp = Math.min(this.xp.maxHp, this.hp + this.diff.xp.hpPerLevel);
      this.bus.emit("levelup", { level, maxHp: this.xp.maxHp, x: e.x, y: e.y });
    }
    // Запасной путь к победе: если улучшений на карте нет (total === 0),
    // победа даётся за достижение уровня victoryLevel.
    if (
      this.total === 0 &&
      !this.victoryShown &&
      this.xp.level >= this.diff.loot.victoryLevel
    ) {
      this.victoryShown = true;
      this.bus.emit("victory", { time: this.time, kills: this.kills });
    }
  }

  // Урон игроку (удары мутантов) — бьёт по жизни.
  damagePlayer(dmg, src) {
    if (this.state !== "playing") return;
    const p = this.player;
    this.hp = clamp(this.hp - dmg, 0, this.xp.maxHp);
    this.deathCause = "beast";
    p.flash = 0.16;
    this.bus.emit("hurt", { x: p.x, y: p.y, dmg });
    if (src) {
      // отдача — импульс в скорость: на льду игрока уносит дальше
      const a = Math.atan2(p.y - src.y, p.x - src.x);
      p.vx += Math.cos(a) * 150;
      p.vy += Math.sin(a) * 150;
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
  // Возвращает, по каким осям движение уткнулось в препятствие —
  // вызывающий гасит/отражает скорость (см. update, Movement).
  moveEntity(e, dx, dy) {
    const res = { x: false, y: false };
    const nx = clamp(e.x + dx, 10, this.map.widthPx - 10);
    if (!this.map.collidesCircle(nx, e.y, e.r)) e.x = nx;
    else res.x = true;
    const ny = clamp(e.y + dy, 10, this.map.heightPx - 10);
    if (!this.map.collidesCircle(e.x, ny, e.r)) e.y = ny;
    else res.y = true;
    return res;
  }
}
