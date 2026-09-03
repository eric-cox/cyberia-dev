// ============================================================
//  Game — тонкий оркестратор. Сам НЕ содержит игровой логики.
//
//  Собирает систему и ведёт главный цикл:
//    Input → команда → Simulation.update(dt, cmd)
//    события симуляции → звук / тряска камеры / хитстоп /
//                        тосты и снапшоты для React-HUD
//    Renderer.render(sim, camera, dt)
//
//  Публичный API (для React): startRun(), equipItem(id),
//  unequipSlot(slot), discardItem(id), attachMinimap(el),
//  sfx.unlock(), destroy().
//
//  См. ARCHITECTURE.md — карта модулей и точки расширения.
// ============================================================
import { EventBus } from "./core/EventBus.js";
import { ZOOM } from "./core/Constants.js";
import { clamp } from "./core/Utils.js";
import { Input } from "./engine/Input.js";
import { Camera } from "./engine/Camera.js";
import { Sfx } from "./systems/Sfx.js";
import { SaveStore } from "./systems/SaveStore.js";
import { getDifficulty } from "./systems/Difficulty.js";
import { Equipment } from "./loot/Equipment.js";
import { Simulation, SHOTGUN_TUBE, SHOTGUN_RELOAD } from "./sim/Simulation.js";
import { Renderer } from "./render/Renderer.js";
import { artSystem } from "./art/pixel.js";
import { ART_MODULES } from "./art/modules.js";
import { ITEMS } from "./data/items.js";

export default class Game {
  constructor(canvas, hooks = {}) {
    this.hooks = hooks;

    // --- сборка системы ---
    this.bus = new EventBus();
    this.input = new Input(canvas);
    this.camera = new Camera();
    this.sfx = new Sfx();
    this.store = new SaveStore();
    this.equipment = new Equipment(this.store);
    this.diff = getDifficulty();
    this.sim = new Simulation(this.bus, this.store, this.equipment, this.diff);

    artSystem.registerAll(ART_MODULES);
    this.renderer = new Renderer(canvas, this.bus, { weather: this.diff.weather });

    this.menuT = 0;
    this.hitstop = 0;
    this.snapTimer = 0;

    this.wireEvents();

    this._onResize = () => this.renderer.resize();
    window.addEventListener("resize", this._onResize);

    // мир для фона главного меню
    this.sim.generate((Math.random() * 1e9) | 0);

    this._raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener("resize", this._onResize);
    this.input.destroy();
  }

  attachMinimap(el) {
    this.renderer.attachMinimap(el);
  }

  // ---------- события → отклик (звук, камера, UI) ----------
  wireEvents() {
    const b = this.bus;
    b.on("attack", () => this.sfx.swing());
    b.on("hit", (e) => {
      this.sfx.hit();
      if (e.voice) this.sfx.hurtVoice(e.voice); // писк на своей частоте, чуть длиннее
      this.hitstop = 0.045;
      this.camera.addTrauma(0.22);
    });
    b.on("kill", (e) => {
      this.sfx.kill();
      if (e.voice) this.sfx.deathVoice(e.voice); // предсмертный вопль, +500мс
      if (e.type === "golem") this.camera.addTrauma(0.65);
    });
    b.on("hurt", () => {
      this.sfx.hurt();
      this.camera.addTrauma(0.5);
      this.hooks.onHurt && this.hooks.onHurt();
    });
    b.on("cold-tick", (e) => e.critical && this.sfx.crackle());
    b.on("levelup", () => {
      this.sfx.levelup();
      this.camera.addTrauma(0.35);
      this.pushSnapshot();
    });
    b.on("growl", (e) => {
      this.sfx.growl(e.voice, e.soft);
      // низкий рёв сотрясает экран (голем, носорог)
      if (e.voice && e.voice.freq < 100 && !e.soft) this.camera.addTrauma(0.3);
    });
    b.on("heartbeat", () => this.sfx.heartbeat());
    b.on("weather", ({ dark }) => {
      // серо-чёрная пурга: тревожный гул и предупреждение
      this.sfx.darkWind(dark);
      this.toast({
        kind: "sys",
        text: dark ? "ПУРГА ЧЕРНЕЕТ…" : "СНЕГ СНОВА БЕЛЫЙ",
      });
    });
    b.on("blizzard", ({ active }) => {
      // метель: порыв ветра и предупреждение
      this.sfx.blizzard(active);
      this.toast({
        kind: "sys",
        text: active ? "НАДВИГАЕТСЯ МЕТЕЛЬ" : "МЕТЕЛЬ УТИХЛА",
      });
    });
    // --- дробовик ---
    b.on("shot", () => {
      this.sfx.shotgun();
      this.camera.addTrauma(0.4); // отдача сотрясает экран
      this.pushSnapshot(); // обновить счётчик патронов в HUD
    });
    b.on("reload-start", () => this.sfx.reloadStart());
    b.on("reload-done", () => {
      this.sfx.reloadDone();
      this.pushSnapshot();
    });
    b.on("dryfire", () => this.sfx.dryfire());
    b.on("ammo", () => {
      this.sfx.ammoPickup();
      this.pushSnapshot();
    });
    b.on("pickup", (e) => {
      this.sfx.pickup(e.item.tier);
      const { item, isNew, equipped, statText } = e;
      // базовый лут надевается сразу, продвинутый — только в схрон:
      // снарядить его можно между играми на экране снаряжения
      let text;
      if (!isNew) text = `${item.name} — уже в схроне`;
      else if (equipped) text = `${item.name} · надето · ${statText}`;
      else text = `${item.name} · в схрон · надень в снаряжении`;
      this.toast({ kind: "item", text, tier: item.tier });
      this.pushSnapshot();
    });
    b.on("death", ({ time, kills }) => {
      this.sfx.death();
      this.camera.addTrauma(0.9);
      this.store.recordRun({ time, kills, victory: false });
      this.hooks.onState && this.hooks.onState("dead");
      this.pushSnapshot();
    });
    b.on("victory", ({ time, kills }) => {
      this.sfx.victory();
      this.store.recordRun({ time, kills, victory: true });
      this.hooks.onState && this.hooks.onState("victory");
    });
  }

  toast(t) {
    this.hooks.onToast && this.hooks.onToast(t);
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

    this.camera.update(dt);
    this.renderer.render(this.sim, this.camera, dt);

    // вой пурги усиливается с замерзанием; вне забега
    // (экран смерти, меню) плавно затухает до тишины
    if (this.sim.state === "playing")
      this.sfx.setWind(clamp(1 - this.sim.heat / this.diff.player.maxHeat, 0, 1));
    else this.sfx.setWind(0);

    // снапшот для HUD — по таймеру (событийные — внутри wireEvents)
    this.snapTimer -= dt;
    if (this.snapTimer <= 0) {
      this.snapTimer = 0.12;
      this.pushSnapshot();
    }

    this._raf = requestAnimationFrame(this.frame);
  };

  update(dt, cmd) {
    const sim = this.sim;

    if (sim.state === "menu") {
      this.menuT += dt;
      const center = sim.map.center;
      // камера медленно плывёт по кругу — живой фон меню
      this.camera.set(
        center.x + Math.cos(this.menuT * 0.11) * 110,
        center.y + Math.sin(this.menuT * 0.09) * 110
      );
      if (cmd.enter) this.startRun();
      return;
    }

    if (sim.state === "dead") {
      if (cmd.restart || cmd.enter) this.startRun();
      return;
    }

    // --- playing ---
    const player = sim.player;
    if (player)
      this.camera.follow(
        player.x,
        player.y,
        dt,
        sim.map.widthPx,
        sim.map.heightPx,
        this.renderer.viewW / ZOOM,
        this.renderer.viewH / ZOOM
      );

    if (cmd.toggleMute) {
      this.sfx.unlock();
      const muted = this.sfx.toggleMute();
      this.toast({ kind: "sys", text: muted ? "ЗВУК ВЫКЛ" : "ЗВУК ВКЛ" });
      this.pushSnapshot();
    }
    if (cmd.toggleInventory)
      this.hooks.onToggleInventory && this.hooks.onToggleInventory();

    // прицел ЛКМ: экранные координаты курсора → мировые → угол от игрока
    if (cmd.attackAim && player) {
      const worldX = this.camera.x + (cmd.mouseX - this.renderer.viewW / 2) / ZOOM;
      const worldY = this.camera.y + (cmd.mouseY - this.renderer.viewH / 2) / ZOOM;
      cmd.aimAngle = Math.atan2(worldY - player.y, worldX - player.x);
    }

    // хитстоп: короткая пауза мира ради «веса» удара
    if (this.hitstop > 0) this.hitstop -= dt;
    else sim.update(dt, cmd);
  }

  // ---------- публичный API ----------
  startRun() {
    this.sfx.unlock();
    this.sim.startRun((Math.random() * 0x7fffffff) | 0);
    const c = this.sim.map.center;
    this.camera.set(c.x, c.y);
    this.hitstop = 0;
    this.hooks.onState && this.hooks.onState("playing");
    this.pushSnapshot();
  }

  // --- экипировка (экран между играми) ---
  equipItem(id) {
    if (this.equipment.equip(id)) {
      this.sfx.ui();
      this.pushSnapshot();
    }
  }
  unequipSlot(slot) {
    if (this.equipment.unequip(slot)) {
      this.sfx.ui();
      this.pushSnapshot();
    }
  }
  discardItem(id) {
    const it = ITEMS[id];
    if (!it) return;
    if (this.equipment.discard(id)) {
      this.sfx.noise({ t: 0.12, v: 0.14, f: 500, type: "lowpass" });
      this.toast({ kind: "sys", text: `${it.name} — выброшено в пургу` });
      this.pushSnapshot();
    }
  }

  // ---------- снапшот для HUD / React ----------
  pushSnapshot() {
    const sim = this.sim;
    const eq = this.equipment;
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
    const w = eq.weapon();
    const slots = eq.slots;
    this.hooks.onSnapshot &&
      this.hooks.onSnapshot({
        state: sim.state,
        heat: Math.max(0, Math.ceil(sim.heat)),
        maxHeat: this.diff.player.maxHeat,
        hp: Math.max(0, Math.ceil(sim.hp)),
        maxHp: sim.xp.maxHp,
        hpRate: Math.round(sim.hpRate * 10) / 10,
        cause: sim.deathCause,
        xp: Math.floor(sim.xp.xp),
        xpNext: sim.xp.xpForNextLevel(),
        level: sim.xp.level,
        insulation: eq.insulation(),
        weapon: w
          ? { id: w.id, name: w.name, dmg: w.dmg, rate: w.rate, art: w.art, kind: w.kind || "melee" }
          : null,
        // --- дробовик: патроны и перезарядка ---
        shotgun:
          w && w.kind === "shotgun" && sim.player
            ? {
                tube: sim.player.tube,
                tubeMax: SHOTGUN_TUBE,
                ammo: sim.player.ammo,
                reloading: sim.player.reloadT > 0,
                reloadProgress: sim.player.reloadT > 0 ? 1 - sim.player.reloadT / SHOTGUN_RELOAD : 0,
              }
            : null,
        kills: sim.kills,
        time: sim.time,
        found: sim.foundThisRun,
        total: sim.total,
        equipped: {
          hat: toItem(slots.hat),
          jacket: toItem(slots.jacket),
          pants: toItem(slots.pants),
          boots: toItem(slots.boots),
          mittens: toItem(slots.mittens),
          weapon: toItem(slots.weapon),
        },
        inv: this.store.data.inv.map((id) => ({
          ...toItem(id),
          equipped: eq.isEquipped(id),
        })),
        muted: this.sfx.muted,
        wind: this.renderer.weather.windInfo(),
        stats: this.store.snapshot(),
      });
  }
}
