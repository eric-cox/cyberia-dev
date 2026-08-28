// ============================================================
//  GAME — оркестратор симуляции «МЕРЗЛОТЫ»
//  Архитектура рассчитана на расширение:
//   • команды ввода изолированы (Input.readCommand) — в сетевой
//     игре сюда подключатся команды удалённых клиентов;
//   • EventBus для слабосвязанных модулей/модов;
//   • SaveSystem заменяется серверным адаптером.
// ============================================================
import {
  EventBus,
  Input,
  Camera,
  mulberry32,
  clamp,
  TILE,
  T,
  SOLID_TILES,
  SNOW_SPEED,
  MAP_TILES,
  WORLD_PX,
} from "./core.js";
import { artSystem } from "./art/pixel.js";
import { ART_MODULES } from "./art/modules.js";
import { generateWorld, renderTerrain, renderMinimapBase } from "./world.js";
import { ITEMS, RUN_LOOT, TIER_COLORS, FISTS, itemOf } from "./data/items.js";
import { SaveSystem } from "./save.js";
import { Sfx } from "./sfx.js";
import { Player, Enemy, Pickup, TreeProp } from "./entities.js";
import { Particles, FloatTexts, Orbs } from "./effects.js";

const HEAT_MAX = 100;
const HP_MAX = 100;
const BASE_DRAIN = 1.7; // тепло/сек без одежды
const COLD_HP_DRAIN = 8.5; // жизнь/сек при нулевом тепле (без одежды)
const CHILL_HP_DRAIN = 2.4; // жизнь/сек, когда тепло почти кончилось
const HP_REGEN = 2; // жизнь/сек, когда тепло в достатке
const HOLE_DMG = 12;
const ZOOM = 2;

export default class Game {
  constructor(canvas, hooks = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.hooks = hooks;
    this.events = new EventBus();

    this.input = new Input(canvas);
    this.sfx = new Sfx();
    this.save = new SaveSystem();
    this.camera = new Camera();
    this.particles = new Particles();
    this.texts = new FloatTexts();
    this.orbs = new Orbs();

    artSystem.registerAll(ART_MODULES);

    this.state = "menu";
    this.dpr = 1;
    this.viewW = 800;
    this.viewH = 600;
    this.menuT = 0;
    this.time = 0;
    this.kills = 0;
    this.foundThisRun = 0;
    this.victoryShown = false;
    this.heat = HEAT_MAX;
    this.hp = HP_MAX;
    this.hpRate = 0;
    this.coldTickT = 0;
    this.deathCause = "cold";
    this.insulation = 0;
    this.hitstop = 0;
    this.hbTimer = 0;
    this.snapTimer = 0;

    this.pickups = [];
    this.enemies = [];
    this.trees = [];

    this.flakes = [];
    for (let i = 0; i < 130; i++)
      this.flakes.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        s: 26 + Math.random() * 70,
        drift: 8 + Math.random() * 26,
        size: Math.random() < 0.3 ? 2 : 1,
        ph: Math.random() * 10,
      });

    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
    this.resize();

    // мир для фона главного меню
    this.buildWorld((Math.random() * 1e9) | 0);

    this._raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    this.input.destroy();
  }

  attachMinimap(el) {
    this.mm = el;
    this.mctx = el ? el.getContext("2d") : null;
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.viewW = this.cv.clientWidth || window.innerWidth;
    this.viewH = this.cv.clientHeight || window.innerHeight;
    this.cv.width = Math.round(this.viewW * this.dpr);
    this.cv.height = Math.round(this.viewH * this.dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---------- генерация забега ----------
  buildWorld(seed) {
    this.world = generateWorld(seed);
    this.terrainCv = renderTerrain(this.world);
    this.mmBase = renderMinimapBase(this.world);
    this.trees = [];
    for (let ty = 0; ty < MAP_TILES; ty++)
      for (let tx = 0; tx < MAP_TILES; tx++)
        if (this.world.get(tx, ty) === T.TREE)
          this.trees.push(new TreeProp(tx * TILE + TILE / 2, ty * TILE + TILE));
  }

  startRun() {
    this.sfx.unlock();
    this.buildWorld((Math.random() * 0x7fffffff) | 0);
    const rng = mulberry32((this.world.seed ^ 0xa11ce) >>> 0);
    const C = (MAP_TILES / 2) * TILE + TILE / 2;

    this.player = new Player(C, C);
    this.camera.set(C, C);

    // артефакты по кольцам: tier1 ближе, tier3 — на краю карты
    this.pickups = [];
    for (const id of RUN_LOOT) {
      const it = ITEMS[id];
      const ring =
        it.tier === 1 ? [9, 18] : it.tier === 2 ? [16, 34] : [30, 55];
      const pos = this.world.freeSpot(ring[0], ring[1], rng);
      this.pickups.push(new Pickup(pos.x, pos.y, it));
    }

    // мутанты: к краю карты — плотнее, крупнее и злее;
    // на самых окраинах бродят Ледяные носороги
    this.enemies = [];
    for (let i = 0; i < 34; i++) {
      // pow(0.5) смещает распределение к внешним кольцам
      const r = 12 + 44 * Math.pow(rng(), 0.5);
      let type = "wolf";
      if (r > 20) type = rng() < 0.55 ? "boar" : "wolf";
      if (r > 32) type = rng() < 0.5 ? "brute" : "boar";
      if (r > 46) type = rng() < 0.3 ? "rhino" : "brute";
      const pos = this.world.freeSpot(Math.min(r, 54), Math.min(r + 5, 57), rng);
      // полярный множитель размера/свирепости (носорог уже огромен сам)
      const mul =
        type === "rhino" ? 1 : 1 + clamp((r - 16) / 42, 0, 1) * 0.6;
      this.enemies.push(new Enemy(pos.x, pos.y, type, rng, mul));
    }

    this.particles.list.length = 0;
    this.texts.list.length = 0;
    this.orbs.list.length = 0;

    this.state = "playing";
    this.time = 0;
    this.kills = 0;
    this.foundThisRun = 0;
    this.victoryShown = false;
    this.heat = HEAT_MAX;
    this.hp = HP_MAX;
    this.hpRate = 0;
    this.coldTickT = 0;
    this.deathCause = "cold";
    this.refreshLoadout();
    this.hooks.onState && this.hooks.onState("playing");
    this.pushSnapshot();
  }

  // Экипировка берётся из схрона (Diablo-модель: по предмету на слот,
  // одно оружие в руке). Меняется на экране между играми.
  refreshLoadout() {
    this.insulation = this.save.insulation();
  }

  get weapon() {
    return this.save.weapon();
  }

  // ---------- управление экипировкой (из UI между играми) ----------
  equipItem(id) {
    const it = itemOf(id);
    if (!it) return;
    if (this.save.equip(id)) {
      this.refreshLoadout();
      this.sfx.ui();
      this.pushSnapshot();
    }
  }

  unequipSlot(slot) {
    if (this.save.unequip(slot)) {
      this.refreshLoadout();
      this.sfx.ui();
      this.pushSnapshot();
    }
  }

  discardItem(id) {
    const it = itemOf(id);
    if (!it) return;
    if (this.save.discard(id)) {
      this.refreshLoadout();
      this.sfx.noise({ t: 0.12, v: 0.14, f: 500, type: "lowpass" });
      this.toast({ kind: "sys", text: `${it.name} — выброшено в пургу` });
      this.pushSnapshot();
    }
  }

  // ---------- главный цикл ----------
  frame = () => {
    const now = performance.now();
    let dt = (now - (this._last || now)) / 1000;
    this._last = now;
    dt = clamp(dt, 0, 0.05);

    const cmd = this.input.readCommand();
    this.update(dt, cmd);
    this.input.endFrame();
    this.render(now / 1000);

    this._raf = requestAnimationFrame(this.frame);
  };

  update(dt, cmd) {
    // пурга живёт всегда
    this.updateWeather(dt);

    if (this.state === "menu") {
      this.menuT += dt;
      const C = (MAP_TILES / 2) * TILE;
      this.camera.set(
        C + Math.cos(this.menuT * 0.11) * 110,
        C + Math.sin(this.menuT * 0.09) * 110
      );
      if (cmd.enter) this.startRun();
    } else if (this.state === "dead") {
      if (cmd.restart || cmd.enter) this.startRun();
    } else if (this.state === "playing") {
      if (this.player)
        this.camera.follow(
          this.player.x,
          this.player.y,
          dt,
          WORLD_PX,
          WORLD_PX,
          this.viewW / ZOOM,
          this.viewH / ZOOM
        );
      if (cmd.toggleMute) {
        this.sfx.unlock();
        const m = this.sfx.toggleMute();
        this.toast({ kind: "sys", text: m ? "ЗВУК ВЫКЛ" : "ЗВУК ВКЛ" });
        this.pushSnapshot();
      }
      if (this.hitstop > 0) {
        this.hitstop -= dt;
      } else {
        this.simUpdate(dt, cmd);
      }
    }

    this.camera.update(dt);
    this.particles.update(dt);
    this.texts.update(dt);
    this.player && (this.player.flash = Math.max(0, this.player.flash - dt));

    this.snapTimer -= dt;
    if (this.snapTimer <= 0) {
      this.snapTimer = 0.12;
      this.pushSnapshot();
    }
  }

  // ---------- симуляция ----------
  simUpdate(dt, cmd) {
    this.time += dt;
    const p = this.player;

    if (cmd.toggleInventory) this.hooks.onToggleInventory && this.hooks.onToggleInventory();

    // --- движение (команда → симуляция; готово к сети) ---
    const slowMul = p.slowT > 0 ? 0.5 : 1;
    const spd = p.speed * this.speedFactor(p.x, p.y) * slowMul;
    this.moveEntity(p, cmd.mx * spd * dt, cmd.my * spd * dt);
    p.moving = cmd.mx !== 0 || cmd.my !== 0;
    if (p.moving) {
      p.face = Math.atan2(cmd.my, cmd.mx);
      p.animT += dt;
    }

    // --- атака: SPACE — по направлению движения, ЛКМ — в курсор ---
    if (cmd.attackMelee) this.doAttack(p.face);
    if (cmd.attackAim) {
      const m = this.mouseWorld(cmd.mouseX, cmd.mouseY);
      this.doAttack(Math.atan2(m.y - p.y, m.x - p.x));
    }

    // таймеры игрока
    p.attackT = Math.max(0, p.attackT - dt);
    p.attackAnimT = Math.max(0, p.attackAnimT - dt);
    p.slowT = Math.max(0, p.slowT - dt);
    p.holeCd = Math.max(0, p.holeCd - dt);
    p.lunge = Math.max(0, p.lunge - dt * 6);

    // --- провалы ---
    const tile = this.world.tileAt(p.x, p.y);
    if (tile === T.HOLE) {
      if (p.holeCd <= 0) {
        p.holeCd = 1.1;
        p.slowT = 1.6;
        this.loseHeat(HOLE_DMG, "ПРОВАЛ!");
        this.sfx.splash();
        this.particles.iceSplash(p.x, p.y);
        this.camera.addTrauma(0.45);
        this.events.emit("hole", { x: p.x, y: p.y });
      }
      this.heat -= 2.2 * dt;
    }

    // --- холод: тепло тает; когда его нет — мороз выедает жизнь ---
    const drain = BASE_DRAIN * (100 / (100 + this.insulation));
    this.heat -= drain * dt;
    this.sfx.setWind(clamp(1 - this.heat / HEAT_MAX, 0, 1));

    // скорость обморожения зависит от защиты одежды:
    // exposure = 1 голышом, ~0.5 в полном обвесе
    const exposure = 100 / (100 + this.insulation);
    let hpDelta = 0;
    if (this.heat <= 0) {
      this.heat = 0;
      hpDelta = -COLD_HP_DRAIN * exposure;
      this.deathCause = "cold";
      this.coldTickT -= dt;
      if (this.coldTickT <= 0) {
        this.coldTickT = 0.7;
        const tick = Math.max(1, Math.round(-hpDelta * 0.7));
        this.texts.add(
          p.x + (Math.random() * 12 - 6),
          p.y - 18,
          "-" + tick,
          "#ff4757"
        );
        this.particles.burst(p.x, p.y - 8, {
          n: 4,
          colors: ["#7fd7ff", "#bfe3ff", "#e8f2ff"],
          speed: 26,
          life: 0.5,
        });
        this.sfx.noise({ t: 0.1, v: 0.05, f: 2000, type: "highpass" });
      }
    } else if (this.heat < 25) {
      hpDelta = -CHILL_HP_DRAIN * exposure;
      this.deathCause = "cold";
      this.coldTickT -= dt;
      if (this.coldTickT <= 0) {
        this.coldTickT = 1.4;
        this.texts.add(p.x, p.y - 18, "-1", "#ff8a94");
      }
    } else if (this.heat > 55 && this.hp < HP_MAX) {
      hpDelta = HP_REGEN;
    }
    if (hpDelta !== 0) {
      this.hp = clamp(this.hp + hpDelta * dt, 0, HP_MAX);
      this.hpRate = hpDelta;
      if (this.hp <= 0) {
        this.die(this.deathCause);
        return;
      }
    } else {
      this.hpRate = 0;
    }

    // сердцебиение, когда жизнь или тепло на исходе
    if (this.hp < 35 || this.heat < 20) {
      this.hbTimer -= dt;
      if (this.hbTimer <= 0) {
        this.hbTimer = 0.4 + (clamp(this.hp, 0, 35) / 35) * 0.55;
        this.sfx.tone({ f: 72, f2: 48, t: 0.1, type: "sine", v: 0.22 });
      }
    }

    // --- мутанты ---
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    this.enemies = this.enemies.filter((e) => !e.dead);
    // расталкивание
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

    // --- орбы тепла ---
    const got = this.orbs.update(dt, p);
    for (const o of got) {
      this.heat = Math.min(HEAT_MAX, this.heat + 6);
      this.hp = Math.min(HP_MAX, this.hp + 5);
      this.texts.add(p.x, p.y - 16, "+6 ТЕПЛА", "#ffb347");
      this.texts.add(p.x, p.y - 26, "+5 ЖИЗНИ", "#7dff8a");
      this.sfx.orb();
      this.particles.burst(p.x, p.y - 6, {
        n: 6,
        colors: ["#ffb347", "#ff8c42", "#fff1c9"],
        speed: 50,
        life: 0.4,
      });
    }

    // --- подбор артефактов ---
    for (const pk of this.pickups) {
      if (pk.dead) continue;
      const dx = p.x - pk.x;
      const dy = p.y - pk.y;
      const d = Math.hypot(dx, dy);
      if (d < 42 && d > 0.1) {
        pk.x += (dx / d) * 60 * dt;
        pk.y += (dy / d) * 60 * dt;
      }
      if (d < 11) this.collect(pk);
    }
    this.pickups = this.pickups.filter((pk) => !pk.dead);
  }

  // ---------- бой ----------
  doAttack(angle) {
    const p = this.player;
    if (p.attackT > 0) return;
    const w = this.weapon;
    p.attackT = 1 / w.rate;
    p.attackAnimT = 0.16;
    p.face = angle;
    p.lunge = 1;
    this.sfx.swing();
    const ox = p.x + Math.cos(angle) * 7;
    const oy = p.y - 3 + Math.sin(angle) * 7;
    this.particles.slashArc(ox, oy, angle, w.range, "#eaf6ff");

    let hitAny = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > w.range + e.r) continue;
      const ea = Math.atan2(dy, dx) - angle;
      const diff = Math.atan2(Math.sin(ea), Math.cos(ea));
      if (Math.abs(diff) > 1.25) continue;
      hitAny = true;
      const dmg = Math.max(1, Math.round(w.dmg * (0.9 + Math.random() * 0.25)));
      this.hitEnemy(e, dmg, angle);
    }
    if (hitAny) {
      this.hitstop = 0.045;
      this.camera.addTrauma(0.22);
    }
    this.events.emit("attack", { x: p.x, y: p.y, angle, dmg: w.dmg });
  }

  hitEnemy(e, dmg, angle) {
    e.hp -= dmg;
    e.flash = 0.13;
    e.kx = Math.cos(angle) * 150;
    e.ky = Math.sin(angle) * 150;
    if (e.state === "wander") e.state = "chase";
    this.texts.add(e.x, e.y - 16, "-" + dmg, "#ffd9ac");
    this.particles.burst(e.x, e.y - 6, {
      n: 7,
      colors: ["#c23b3b", "#8a2a2a", "#ff6b7a"],
      speed: 70,
      life: 0.45,
    });
    this.sfx.hit();
    this.events.emit("damage", { target: e.id, dmg });
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true;
    this.kills++;
    this.sfx.kill();
    this.particles.burst(e.x, e.y - 6, {
      n: 16,
      colors: ["#c23b3b", "#8a2a2a", "#e8f2ff", "#7d8f82"],
      speed: 100,
      life: 0.6,
    });
    // крупная тварь — больше тепла
    const orbCount = e.type === "rhino" ? 2 : 1;
    for (let i = 0; i < orbCount; i++) this.orbs.spawn(e.x, e.y - 4);
    this.texts.add(e.x, e.y - 24, e.def.name.toUpperCase() + " ПАЛ", "#9fd8ff");
    this.events.emit("kill", { type: e.type, x: e.x, y: e.y });
  }

  damagePlayer(dmg, src) {
    if (this.state !== "playing") return;
    const p = this.player;
    this.hp = clamp(this.hp - dmg, 0, HP_MAX);
    this.deathCause = "beast";
    p.flash = 0.16;
    this.camera.addTrauma(0.5);
    this.sfx.hurt();
    this.texts.add(p.x, p.y - 18, "-" + dmg, "#ff4757");
    this.particles.burst(p.x, p.y - 6, {
      n: 8,
      colors: ["#ff4757", "#c23b3b", "#e8f2ff"],
      speed: 80,
      life: 0.4,
    });
    if (src) {
      const a = Math.atan2(p.y - src.y, p.x - src.x);
      this.moveEntity(p, Math.cos(a) * 7, Math.sin(a) * 7);
    }
    this.hooks.onHurt && this.hooks.onHurt();
    this.events.emit("player-damage", { dmg });
    if (this.hp <= 0) this.die("beast");
  }

  loseHeat(v, label) {
    this.heat -= v;
    if (label) this.texts.add(this.player.x, this.player.y - 26, label, "#7fd7ff");
  }

  die(cause = "cold") {
    this.deathCause = cause;
    this.hp = 0;
    this.state = "dead";
    this.sfx.death();
    this.sfx.setWind(1);
    this.camera.addTrauma(0.9);
    this.save.recordRun({ time: this.time, kills: this.kills, victory: false });
    this.hooks.onState && this.hooks.onState("dead");
    this.pushSnapshot();
  }

  // ---------- артефакты ----------
  // Подбор кладёт предмет в схрон. Автонадевание: одежда — если слот
  // пуст или новинка теплее; оружие — только если в руке кулаки
  // (в руке всегда одно оружие, менять — на экране между играми).
  collect(pk) {
    pk.dead = true;
    this.foundThisRun++;
    const it = pk.item;
    const isNew = this.save.addItem(it.id);

    let equippedNow = false;
    if (it.slot === "weapon") {
      if (!this.save.equipped.weapon) equippedNow = this.save.equip(it.id);
    } else {
      const cur = itemOf(this.save.equipped[it.slot]);
      if (!cur || (it.cold || 0) > (cur.cold || 0)) equippedNow = this.save.equip(it.id);
    }
    this.refreshLoadout();
    this.sfx.pickup(it.tier);
    const col = TIER_COLORS[it.tier] || "#e8f2ff";
    this.particles.burst(pk.x, pk.y - 6, {
      n: 14,
      colors: [col, "#e8f2ff", "#ffffff"],
      speed: 80,
      life: 0.55,
    });

    const stat =
      it.slot === "weapon" ? `урон ${it.dmg}` : `+${it.cold} к теплу`;
    this.toast({
      kind: "item",
      text: !isNew
        ? `${it.name} — уже в схроне`
        : equippedNow
        ? `${it.name} · надето · ${stat}`
        : `${it.name} · в схрон · ${stat}`,
      tier: it.tier,
    });
    this.events.emit("pickup", { item: it.id, equipped: equippedNow });

    if (this.foundThisRun >= RUN_LOOT.length && !this.victoryShown) {
      this.victoryShown = true;
      this.save.recordRun({ time: this.time, kills: this.kills, victory: true });
      this.sfx.victory();
      this.hooks.onState && this.hooks.onState("victory");
    }
    this.pushSnapshot();
  }

  toast(t) {
    this.hooks.onToast && this.hooks.onToast(t);
  }

  // ---------- физика/тайлы ----------
  moveEntity(e, dx, dy) {
    const nx = clamp(e.x + dx, 10, WORLD_PX - 10);
    if (!this.collides(nx, e.y, e.r)) e.x = nx;
    const ny = clamp(e.y + dy, 10, WORLD_PX - 10);
    if (!this.collides(e.x, ny, e.r)) e.y = ny;
  }

  collides(x, y, r) {
    const x0 = Math.floor((x - r) / TILE);
    const x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE);
    const y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        if (!SOLID_TILES.has(this.world.get(tx, ty))) continue;
        const cx = clamp(x, tx * TILE, tx * TILE + TILE);
        const cy = clamp(y, ty * TILE, ty * TILE + TILE);
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
      }
    return false;
  }

  speedFactor(x, y) {
    const t = this.world.tileAt(x, y);
    if (t <= T.SNOW3) return SNOW_SPEED[t];
    if (t === T.HOLE) return 0.5;
    return 0.8;
  }

  mouseWorld(mx, my) {
    return {
      x: this.camera.x + (mx - this.viewW / 2) / ZOOM,
      y: this.camera.y + (my - this.viewH / 2) / ZOOM,
    };
  }

  // ---------- погода ----------
  updateWeather(dt) {
    for (const f of this.flakes) {
      f.y += f.s * dt * (0.7 + f.size * 0.5);
      f.x += f.drift * dt + Math.sin(f.y * 0.02 + f.ph) * 14 * dt;
      if (f.y > this.viewH + 4) {
        f.y = -4;
        f.x = Math.random() * this.viewW;
      }
      if (f.x > this.viewW + 4) f.x = -4;
    }
  }

  // ---------- отрисовка ----------
  render(t) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#05080f";
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    if (this.terrainCv) {
      ctx.save();
      ctx.translate(
        Math.round(this.viewW / 2 + this.camera.ox),
        Math.round(this.viewH / 2 + this.camera.oy)
      );
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-this.camera.x, -this.camera.y);

      ctx.drawImage(this.terrainCv, 0, 0);

      // проход сущностей с y-сортировкой
      const drawList = [];
      for (const tr of this.trees) drawList.push({ y: tr.y, d: () => tr.draw(ctx, t) });
      for (const pk of this.pickups) drawList.push({ y: pk.y, d: () => pk.draw(ctx) });
      for (const e of this.enemies) drawList.push({ y: e.y, d: () => e.draw(ctx) });
      if (this.player && this.state !== "menu") {
        const p = this.player;
        drawList.push({
          y: p.y,
          d: () => {
            if (this.state === "dead") {
              // замёрз: повален и припорошен
              ctx.save();
              ctx.translate(p.x, p.y - 6);
              ctx.rotate(Math.PI / 2);
              artSystem.draw(ctx, "player", "idle", 0, 0, 0, { white: false });
              ctx.restore();
              ctx.fillStyle = "rgba(223,233,245,0.75)";
              ctx.fillRect(p.x - 7, p.y - 4, 14, 5);
            } else p.draw(ctx);
          },
        });
      }
      drawList.sort((a, b) => a.y - b.y);
      for (const d of drawList) d.d();

      this.orbs.draw(ctx);
      this.particles.draw(ctx);
      this.texts.draw(ctx);
      ctx.restore();
    }

    // пурга (экранные координаты)
    for (const f of this.flakes) {
      ctx.globalAlpha = f.size === 2 ? 0.75 : 0.45;
      ctx.fillStyle = "#e8f2ff";
      ctx.fillRect(f.x | 0, f.y | 0, f.size, f.size);
    }
    ctx.globalAlpha = 1;

    this.renderMinimap();
  }

  renderMinimap() {
    if (!this.mctx || !this.mmBase || this.state === "menu") return;
    const m = this.mctx;
    const S = this.mm.width;
    const k = S / MAP_TILES;
    m.imageSmoothingEnabled = false;
    m.clearRect(0, 0, S, S);
    m.drawImage(this.mmBase, 0, 0, S, S);

    // артефакты
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    for (const pk of this.pickups) {
      if (!blink) continue;
      m.fillStyle = "#6fd6ff";
      m.fillRect((pk.x / TILE) * k - 1, (pk.y / TILE) * k - 1, 3, 3);
    }
    // мутанты (носорог — крупная метка)
    for (const e of this.enemies) {
      if (e.type === "rhino") {
        m.fillStyle = "#d6f6ff";
        m.fillRect((e.x / TILE) * k - 1, (e.y / TILE) * k - 1, 4, 4);
      } else {
        m.fillStyle = "#ff4757";
        m.fillRect((e.x / TILE) * k, (e.y / TILE) * k, 2, 2);
      }
    }
    // игрок
    if (this.player) {
      m.fillStyle = "#ffb347";
      m.fillRect((this.player.x / TILE) * k - 1, (this.player.y / TILE) * k - 1, 3, 3);
    }
    // рамка обзора
    const vw = this.viewW / ZOOM / TILE;
    const vh = this.viewH / ZOOM / TILE;
    m.strokeStyle = "rgba(232,242,255,0.5)";
    m.lineWidth = 1;
    m.strokeRect(
      (this.camera.x / TILE - vw / 2) * k,
      (this.camera.y / TILE - vh / 2) * k,
      vw * k,
      vh * k
    );
  }

  // ---------- снапшот для HUD / экрана снаряжения ----------
  pushSnapshot() {
    const eq = this.save.equipped;
    const toItem = (id) => {
      const it = ITEMS[id];
      return it
        ? {
            id: it.id,
            name: it.name,
            slot: it.slot,
            tier: it.tier,
            cold: it.cold || 0,
            dmg: it.dmg || 0,
            rate: it.rate || 0,
            range: it.range || 0,
            art: it.art,
          }
        : null;
    };
    const w = this.weapon;
    const s = {
      state: this.state,
      heat: Math.max(0, Math.ceil(this.heat)),
      maxHeat: HEAT_MAX,
      hp: Math.max(0, Math.ceil(this.hp)),
      maxHp: HP_MAX,
      hpRate: Math.round(this.hpRate * 10) / 10,
      cause: this.deathCause,
      insulation: this.insulation,
      weapon: w
        ? { id: w.id, name: w.name, dmg: w.dmg, rate: w.rate, art: w.art }
        : null,
      kills: this.kills,
      time: this.time,
      found: this.foundThisRun,
      total: RUN_LOOT.length,
      // надето по слотам (Diablo)
      equipped: {
        hat: toItem(eq.hat),
        jacket: toItem(eq.jacket),
        pants: toItem(eq.pants),
        boots: toItem(eq.boots),
        mittens: toItem(eq.mittens),
        weapon: toItem(eq.weapon),
      },
      // весь схрон
      inv: this.save.data.inv.map((id) => {
        const it = toItem(id);
        return { ...it, equipped: this.save.isEquipped(id) };
      }),
      muted: this.sfx.muted,
      stats: this.save.snapshot(),
    };
    this.hooks.onSnapshot && this.hooks.onSnapshot(s);
  }
}
