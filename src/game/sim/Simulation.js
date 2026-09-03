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
    this.coldTickTimer = 0; // таймер «тика» обморожения
    this.heartbeatTimer = 0; // таймер сердцебиения
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
    const player = this.player;
    this.time += dt;

    // --- движение: желаемая скорость от ввода, инерция от ячейки ---
    const cell = this.map.cellAt(player.x, player.y);
    const targetSpeed = player.speed * cell.speed;
    steer(player, cmd.moveX * targetSpeed, cmd.moveY * targetSpeed, this.map, dt);
    const blocked = this.moveEntity(player, player.vx * dt, player.vy * dt);
    if (blocked.x) player.vx *= -0.25; // лёгкий отскок от препятствия
    if (blocked.y) player.vy *= -0.25;
    const speedNow = Math.hypot(player.vx, player.vy);
    player.moving = speedNow > 14;
    if (cmd.moveX !== 0 || cmd.moveY !== 0) player.face = Math.atan2(cmd.moveY, cmd.moveX);
    else if (player.moving) player.face = Math.atan2(player.vy, player.vx); // взгляд по заносу на льду
    if (player.moving) player.animT += dt;

    // --- атака: SPACE — по направлению движения,
    //            ЛКМ — в курсор (угол кладёт Game в cmd.aimAngle)
    if (cmd.attackMelee) this.doAttack(player.face);
    if (cmd.attackAim && cmd.aimAngle != null) this.doAttack(cmd.aimAngle);

    // --- перезарядка дробовика (ручная — KeyR) ---
    if (cmd.reload) this.startReload();
    if (player.reloadT > 0) {
      player.reloadT -= dt;
      if (player.reloadT <= 0) {
        // время вышло — перекладываем патроны из кармана в ствол
        player.reloadT = 0;
        const load = Math.min(SHOTGUN_TUBE - player.tube, player.ammo);
        player.tube += load;
        player.ammo -= load;
        this.bus.emit("reload-done", { tube: player.tube, ammo: player.ammo });
      }
    }

    // таймеры игрока
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackAnimTime = Math.max(0, player.attackAnimTime - dt);
    player.lunge = Math.max(0, player.lunge - dt * 6);
    player.flash = Math.max(0, player.flash - dt);

    this.updateCold(dt, player);
    if (this.state !== "playing") return;

    this.updateEnemies(dt);
    this.updatePickups(dt, player);
    this.updatePellets(dt);
    this.updateAmmoPickups(dt, player);
  }

  // ---------- холод и жизнь ----------
  // Тепло тает всегда; когда его нет — мороз выедает жизнь (hp).
  // Скорость и того и другого снижает защита одежды (exposure).
  updateCold(dt, player) {
    const heatCfg = this.diff.heat;
    const insulation = this.equipment.insulation();
    // exposure: 1 голышом, ~0.5 в полном обвесе. Множитель всех потерь.
    const exposure = 100 / (100 + insulation);
    this.heat -= heatCfg.baseDrain * exposure * dt;

    let hpDelta = 0; // скорость изменения жизни в этот кадр
    if (this.heat <= 0) {
      this.heat = 0;
      hpDelta = -heatCfg.coldDrain * exposure; // сильное обморожение
      this.deathCause = "cold";
      this.coldTickTimer -= dt;
      if (this.coldTickTimer <= 0) {
        this.coldTickTimer = 0.7; // периодичность «тика» обморожения
        this.bus.emit("cold-tick", {
          x: player.x + (Math.random() * 12 - 6),
          y: player.y,
          amount: Math.max(1, Math.round(-hpDelta * 0.7)),
          critical: true,
        });
      }
    } else if (this.heat < heatCfg.chillBelow) {
      hpDelta = -heatCfg.chillDrain * exposure; // лёгкое подмерзание
      this.deathCause = "cold";
      this.coldTickTimer -= dt;
      if (this.coldTickTimer <= 0) {
        this.coldTickTimer = 1.4;
        this.bus.emit("cold-tick", { x: player.x, y: player.y, amount: 1, critical: false });
      }
    } else if (this.heat > heatCfg.regenAbove && this.hp < this.xp.maxHp) {
      hpDelta = heatCfg.regen; // в тепле жизнь восстанавливается
    }

    if (hpDelta !== 0) {
      this.hp = clamp(this.hp + hpDelta * dt, 0, this.xp.maxHp);
      this.hpRate = hpDelta; // для индикатора скорости в HUD
      if (this.hp <= 0) {
        this.die(this.deathCause);
        return;
      }
    } else {
      this.hpRate = 0;
    }

    // сердцебиение учащается, когда жизнь или тепло на исходе
    if (this.hp < 35 || this.heat < 20) {
      this.heartbeatTimer -= dt;
      if (this.heartbeatTimer <= 0) {
        this.heartbeatTimer = 0.4 + (clamp(this.hp, 0, 35) / 35) * 0.55;
        this.bus.emit("heartbeat");
      }
    }
  }

  // ---------- мутанты ----------
  updateEnemies(dt) {
    for (const enemy of this.enemies) if (!enemy.dead) enemy.update(dt, this);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);

    // расталкивание пар, чтобы звери не слипались в одну точку
    for (let i = 0; i < this.enemies.length; i++)
      for (let j = i + 1; j < this.enemies.length; j++) {
        const first = this.enemies[i];
        const second = this.enemies[j];
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const dist = Math.hypot(dx, dy);
        const minDist = first.r + second.r;
        if (dist > 0.01 && dist < minDist) {
          // раздвигаем каждого на половину пересечения
          const push = ((minDist - dist) / 2) * 0.8;
          const pushX = (dx / dist) * push;
          const pushY = (dy / dist) * push;
          this.moveEntity(first, -pushX, -pushY);
          this.moveEntity(second, pushX, pushY);
        }
      }
  }

  // ---------- артефакты ----------
  updatePickups(dt, player) {
    for (const pickup of this.pickups) {
      if (pickup.dead) continue;
      if (pickup.update(dt, player)) {
        pickup.dead = true;
        this.collect(pickup);
      }
    }
    this.pickups = this.pickups.filter((pickup) => !pickup.dead);
  }

  // Подбор кладёт артефакт в схрон; базовый лут надевается сразу,
  // продвинутый — нет (см. loot/RunLoot.collectArtifact).
  collect(pickup) {
    this.foundThisRun++;
    const item = pickup.item;
    const { isNew, equipped } = collectArtifact(this.store, this.equipment, item, this.diff);
    this.bus.emit("pickup", {
      x: pickup.x,
      y: pickup.y,
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
  // Диспетчер атаки: дробовик стреляет, остальное оружие бьёт в упор.
  doAttack(angle) {
    const weapon = this.equipment.weapon();
    if (weapon.kind === "shotgun") {
      this.fireShotgun(angle);
      return;
    }
    this.meleeAttack(angle);
  }

  // Выстрел дробовиком: 2 патрона в стволе можно отстрелять подряд,
  // затем — перезарядка. Пучок дроби см. Pellet.js.
  fireShotgun(angle) {
    const player = this.player;
    if (player.reloadT > 0) return; // идёт перезарядка
    if (player.attackCooldown > 0) return; // темп стрельбы
    if (player.tube <= 0) {
      this.startReload(); // ствол пуст: зарядим или щёлкнем впустую
      return;
    }

    const weapon = this.equipment.weapon();
    player.tube--;
    player.attackCooldown = 1 / weapon.rate;
    player.attackAnimTime = 0.22;
    player.face = angle;
    player.lunge = 1.3;
    // отдача толкает игрока назад — на льду это ощутимо
    player.vx -= Math.cos(angle) * 70;
    player.vy -= Math.sin(angle) * 70;

    // точка у дула: чуть впереди и выше центра (ствол на уровне груди)
    const muzzleX = player.x + Math.cos(angle) * 14;
    const muzzleY = player.y - 6 + Math.sin(angle) * 14;
    this.bus.emit("shot", { x: muzzleX, y: muzzleY, angle, range: weapon.range, tube: player.tube });
    for (let i = 0; i < weapon.pellets; i++)
      this.pellets.push(new Pellet(muzzleX, muzzleY, angle, weapon.pelletSpeed, weapon.pelletDmg, weapon.spread));

    // ствол опустел — сразу начинаем перезарядку, если есть патроны
    if (player.tube <= 0) this.startReload();
  }

  // Перезарядка дробовика: 2 секунды, добирает патроны из запаса.
  startReload() {
    const player = this.player;
    const weapon = this.equipment.weapon();
    if (!weapon || weapon.kind !== "shotgun") return;
    if (player.reloadT > 0 || player.tube >= SHOTGUN_TUBE) return; // уже идёт / полон
    if (player.ammo <= 0) {
      this.bus.emit("dryfire"); // патроны кончились — пустой щелчок
      return;
    }
    player.reloadT = SHOTGUN_RELOAD;
    this.bus.emit("reload-start");
  }

  // Полёт дроби: проверка попаданий во врагов (кровь) и стены (искры).
  // Идём с конца, чтобы безопасно удалять элементы из массива.
  updatePellets(dt) {
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const pellet = this.pellets[i];
      let gone = pellet.update(dt); // true = долетела до предела дальности

      if (!gone) {
        const impactAngle = Math.atan2(pellet.vy, pellet.vx);
        for (const enemy of this.enemies) {
          if (enemy.dead) continue;
          // +4 по Y: дробь летит на уровне груди, а не по земле
          const dist = Math.hypot(enemy.x - pellet.x, enemy.y - (pellet.y + 4));
          if (dist < enemy.r + pellet.r) {
            this.hitEnemy(enemy, pellet.dmg, impactAngle);
            this.bus.emit("blood", { x: pellet.x, y: pellet.y, angle: impactAngle });
            gone = true; // дробинка потрачена
            break;
          }
        }
        if (!gone && this.map.cellAt(pellet.x, pellet.y).solid) {
          this.bus.emit("spark", { x: pellet.x, y: pellet.y });
          gone = true; // упёрлась в скалу
        }
      }

      if (gone) this.pellets.splice(i, 1);
    }
  }

  // Подбор россыпей патронов: пополняют карманный запас, в схрон не идут
  updateAmmoPickups(dt, player) {
    for (let i = this.ammoPickups.length - 1; i >= 0; i--) {
      const ammo = this.ammoPickups[i];
      if (ammo.update(dt, player)) {
        player.ammo += ammo.amount;
        this.bus.emit("ammo", { x: ammo.x, y: ammo.y, amount: ammo.amount, total: player.ammo });
        this.ammoPickups.splice(i, 1);
      }
    }
  }

  // Удар веером: задевает врагов в радиусе оружия и в секторе
  // ±1.25 рад (~±72°) вокруг направления удара.
  meleeAttack(angle) {
    const player = this.player;
    if (player.attackCooldown > 0) return; // идёт перезарядка
    const weapon = this.equipment.weapon();
    player.attackCooldown = 1 / weapon.rate;
    player.attackAnimTime = 0.16;
    player.face = angle;
    player.lunge = 1;

    // точка перед игроком, откуда «растёт» дуга взмаха
    const originX = player.x + Math.cos(angle) * 7;
    const originY = player.y - 3 + Math.sin(angle) * 7;
    this.bus.emit("attack", { x: originX, y: originY, angle, range: weapon.range });

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > weapon.range + enemy.r) continue; // слишком далеко
      // Разность углов, нормализованная в [-π, π]:
      // atan2(sin, cos) «схлопывает» переход через ±180°,
      // иначе 359° и 1° считались бы далёкими углами.
      const angleToEnemy = Math.atan2(dy, dx) - angle;
      const angleDiff = Math.atan2(Math.sin(angleToEnemy), Math.cos(angleToEnemy));
      if (Math.abs(angleDiff) > 1.25) continue; // вне сектора удара
      // Разброс урона ±~12%, минимум 1
      const dmg = Math.max(1, Math.round(weapon.dmg * (0.9 + Math.random() * 0.25)));
      this.hitEnemy(enemy, dmg, angle);
    }
  }

  // Попадание по врагу: урон, вспышка, отдача, пробуждение
  hitEnemy(enemy, dmg, angle) {
    enemy.hp -= dmg;
    enemy.flash = 0.13;
    enemy.knockX = Math.cos(angle) * 150; // отдача в сторону удара
    enemy.knockY = Math.sin(angle) * 150;
    if (enemy.state === "wander") enemy.state = "chase";
    this.bus.emit("hit", { x: enemy.x, y: enemy.y, dmg, voice: enemy.def.voice, name: enemy.def.name });
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    enemy.dead = true;
    this.kills++;
    this.bus.emit("kill", { x: enemy.x, y: enemy.y, name: enemy.def.name, type: enemy.type, voice: enemy.def.voice });
    this.awardXp(enemy);
  }

  // Опыт — единственная награда за убийство (см. Experience.js).
  awardXp(enemy) {
    const amount = enemy.def.xp || 0;
    if (amount <= 0) return;
    const levels = this.xp.addXp(amount);
    this.bus.emit("xp", { x: enemy.x, y: enemy.y, amount });
    for (const level of levels) {
      // с уровнем растёт максимум жизни, и шкала сразу наполняется
      this.hp = Math.min(this.xp.maxHp, this.hp + this.diff.xp.hpPerLevel);
      this.bus.emit("levelup", { level, maxHp: this.xp.maxHp, x: enemy.x, y: enemy.y });
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
  damagePlayer(dmg, attacker) {
    if (this.state !== "playing") return;
    const player = this.player;
    this.hp = clamp(this.hp - dmg, 0, this.xp.maxHp);
    this.deathCause = "beast";
    player.flash = 0.16;
    this.bus.emit("hurt", { x: player.x, y: player.y, dmg });
    if (attacker) {
      // отдача — импульс от атакующего: на льду игрока уносит дальше
      const knockAngle = Math.atan2(player.y - attacker.y, player.x - attacker.x);
      player.vx += Math.cos(knockAngle) * 150;
      player.vy += Math.sin(knockAngle) * 150;
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
  // Двигает сущность по осям раздельно (чтобы скользить вдоль стен).
  // Возвращает, по каким осям движение уткнулось в препятствие —
  // вызывающий сам гасит/отражает скорость (см. update, Movement).
  moveEntity(entity, dx, dy) {
    const blocked = { x: false, y: false };
    const newX = clamp(entity.x + dx, 10, this.map.widthPx - 10);
    if (!this.map.collidesCircle(newX, entity.y, entity.r)) entity.x = newX;
    else blocked.x = true;
    const newY = clamp(entity.y + dy, 10, this.map.heightPx - 10);
    if (!this.map.collidesCircle(entity.x, newY, entity.r)) entity.y = newY;
    else blocked.y = true;
    return blocked;
  }
}
