// ============================================================
//  render/Renderer — вся отрисовка кадра:
//  ландшафт → сущности (y-сортировка) → орбы → эффекты →
//  пурга → миникарта. Плюс подписки на события симуляции:
//  каждое игровое событие рождает визуальный отклик.
//
//  Это «клиентская» половина: для мультиплеера Renderer
//  остаётся, а Simulation заменяется сетевым источником
//  состояния и тех же событий.
// ============================================================
import { ZOOM, TILE } from "../core/Constants.js";
import { paintTerrain, paintMinimapBase } from "./TerrainPainter.js";
import { Fx } from "./Fx.js";
import { Weather } from "./Weather.js";
import {
  drawPlayer,
  drawDeadPlayer,
  drawEnemy,
  drawPickup,
  drawTree,
  drawPellets,
  drawAmmoPickup,
} from "./painters.js";

export class Renderer {
  constructor(canvas, bus, options = {}) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = 1;
    this.viewW = 800;
    this.viewH = 600;
    this.time = 0;
    this.fx = new Fx();
    this.weather = new Weather(bus, options.weather);
    this.terrainCache = new Map(); // seed → canvas
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this.camera = null; // сюда Game передаёт камеру каждого кадра

    this.wireEvents(bus);
    this.resize();
  }

  // события симуляции → визуальный отклик
  wireEvents(bus) {
    const particles = this.fx.particles;
    const texts = this.fx.texts;

    bus.on("attack", (e) => particles.slashArc(e.x, e.y, e.angle, e.range));
    bus.on("hit", (e) => {
      particles.burst(e.x, e.y - 6, {
        n: 7,
        colors: ["#c23b3b", "#8a2a2a", "#ff6b7a"],
        speed: 70,
        life: 0.45,
      });
      texts.add(e.x, e.y - 16, "-" + e.dmg, "#ffd9ac");
    });
    bus.on("kill", (e) => {
      const isAwakened = e.type === "awakened";
      particles.burst(e.x, e.y - (isAwakened ? 40 : 6), {
        n: isAwakened ? 46 : 16,
        colors: isAwakened
          ? ["#6fd6ff", "#a9e8ff", "#dfeaf7", "#4a6288", "#e8f2ff"]
          : ["#c23b3b", "#8a2a2a", "#e8f2ff", "#7d8f82"],
        speed: isAwakened ? 150 : 100,
        life: isAwakened ? 0.9 : 0.6,
        size: isAwakened ? 2 : 1,
      });
      texts.add(e.x, e.y - (isAwakened ? 90 : 24), e.name.toUpperCase() + " ПАЛ", isAwakened ? "#6fd6ff" : "#9fd8ff");
    });
    bus.on("hurt", (e) => {
      particles.burst(e.x, e.y - 6, {
        n: 8,
        colors: ["#ff4757", "#c23b3b", "#e8f2ff"],
        speed: 80,
        life: 0.4,
      });
      texts.add(e.x, e.y - 18, "-" + e.dmg, "#ff4757");
    });
    bus.on("cold-tick", (e) => {
      texts.add(e.x, e.y - 18, "-" + e.amount, e.critical ? "#ff4757" : "#ff8a94");
      if (e.critical)
        particles.burst(e.x, e.y - 8, {
          n: 4,
          colors: ["#7fd7ff", "#bfe3ff", "#e8f2ff"],
          speed: 26,
          life: 0.5,
        });
    });
    bus.on("pickup", (e) =>
      particles.burst(e.x, e.y - 6, {
        n: 14,
        colors: [e.color, "#e8f2ff", "#ffffff"],
        speed: 80,
        life: 0.55,
      })
    );
    bus.on("xp", (e) => {
      texts.add(e.x, e.y - 18, `+${e.amount} XP`, "#6fd6ff");
      particles.burst(e.x, e.y - 6, {
        n: 6,
        colors: ["#6fd6ff", "#a9e8ff", "#d6f6ff"],
        speed: 50,
        life: 0.4,
      });
    });
    bus.on("levelup", (e) => {
      texts.add(e.x, e.y - 30, `УРОВЕНЬ ${e.level}`, "#ffb347");
      particles.burst(e.x, e.y - 8, {
        n: 22,
        colors: ["#ffb347", "#ffd9ac", "#fff1c9", "#6fd6ff"],
        speed: 110,
        life: 0.7,
      });
    });
    // --- дробовик ---
    bus.on("shot", (e) => {
      this.fx.flashes.add(e.x, e.y, e.angle); // вспышка у дула
      this.fx.particles.shell(e.x - Math.cos(e.angle) * 6, e.y - 4); // гильза
      // пороховой дым
      particles.burst(e.x, e.y, {
        n: 8,
        colors: ["#9aa7b8", "#6b7787", "#c8d2de"],
        speed: 40,
        life: 0.4,
      });
    });
    bus.on("blood", (e) => this.fx.particles.gore(e.x, e.y, e.angle));
    bus.on("spark", (e) => this.fx.particles.spark(e.x, e.y));
    bus.on("ammo", (e) => {
      texts.add(e.x, e.y - 12, `+${e.amount} ПАТРОНОВ`, "#d9b54a");
      particles.burst(e.x, e.y - 4, {
        n: 8,
        colors: ["#d9b54a", "#c23b3b", "#e8f2ff"],
        speed: 50,
        life: 0.4,
      });
    });
    bus.on("reload-done", (e) => {
      texts.add(this._lastPlayerX || 0, (this._lastPlayerY || 0) - 20, "ЗАРЯЖЕНО", "#7dff8a");
    });
  }

  attachMinimap(el) {
    this.minimapCanvas = el;
    this.minimapCtx = el ? el.getContext("2d") : null;
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.viewW = this.cv.clientWidth || window.innerWidth;
    this.viewH = this.cv.clientHeight || window.innerHeight;
    this.cv.width = Math.round(this.viewW * this.dpr);
    this.cv.height = Math.round(this.viewH * this.dpr);
    this.ctx.imageSmoothingEnabled = false;
    this.weather.setSize(this.viewW, this.viewH);
  }

  terrain(map) {
    let cv = this.terrainCache.get(map.seed);
    if (!cv) {
      cv = paintTerrain(map);
      this.terrainCache.set(map.seed, cv);
    }
    return cv;
  }
  minimapBase(map) {
    let cv = this.terrainCache.get("mm" + map.seed);
    if (!cv) {
      cv = paintMinimapBase(map);
      this.terrainCache.set("mm" + map.seed, cv);
    }
    return cv;
  }

  // ---------- кадр ----------
  render(sim, camera, dt) {
    const ctx = this.ctx;
    this.time += dt;
    this.camera = camera; // запоминаем для рамки обзора на миникарте

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#05080f";
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    if (sim.map) {
      ctx.save();
      ctx.translate(
        Math.round(this.viewW / 2 + camera.ox),
        Math.round(this.viewH / 2 + camera.oy)
      );
      ctx.scale(ZOOM, ZOOM);
      ctx.translate(-camera.x, -camera.y);

      ctx.drawImage(this.terrain(sim.map), 0, 0);

      // проход сущностей с y-сортировкой: всё, что ниже по Y, рисуется
      // позже (поверх) — так возникает псевдо-глубина
      const list = [];
      for (const tree of sim.map.decor)
        list.push({ y: tree.y, draw: () => drawTree(ctx, tree, this.time) });
      for (const pickup of sim.pickups)
        list.push({ y: pickup.y, draw: () => drawPickup(ctx, pickup) });
      for (const ammo of sim.ammoPickups)
        list.push({ y: ammo.y, draw: () => drawAmmoPickup(ctx, ammo) });
      for (const enemy of sim.enemies)
        list.push({ y: enemy.y, draw: () => drawEnemy(ctx, enemy) });
      if (sim.player && sim.state !== "menu") {
        const player = sim.player;
        this._lastPlayerX = player.x;
        this._lastPlayerY = player.y;
        const weapon = sim.equipment.weapon();
        list.push({
          y: player.y,
          draw: () =>
            sim.state === "dead"
              ? drawDeadPlayer(ctx, player)
              : drawPlayer(ctx, player, weapon),
        });
      }
      list.sort((a, b) => a.y - b.y);
      for (const entry of list) entry.draw();

      // дробь — поверх сущностей (летит быстро)
      drawPellets(ctx, sim.pellets);

      this.fx.update(dt);
      this.fx.draw(ctx);
      ctx.restore();
    }

    this.weather.update(dt);
    this.weather.draw(ctx);

    this.renderMinimap(sim);
  }

  renderMinimap(sim) {
    if (!this.minimapCtx || !sim.map || sim.state === "menu") return;
    const ctx = this.minimapCtx;
    const size = this.minimapCanvas.width;
    // пикселей миникарты на один тайл мира
    const scale = size / sim.map.size;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(this.minimapBase(sim.map), 0, 0, size, size);

    // артефакты (мигают)
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    for (const pk of sim.pickups) {
      if (!blink) continue;
      ctx.fillStyle = "#6fd6ff";
      ctx.fillRect((pk.x / TILE) * scale - 1, (pk.y / TILE) * scale - 1, 3, 3);
    }
    // мутанты (гиганты — крупные метки)
    for (const e of sim.enemies) {
      if (e.type === "awakened") {
        ctx.fillStyle = blink ? "#6fd6ff" : "#a9e8ff";
        ctx.fillRect((e.x / TILE) * scale - 2, (e.y / TILE) * scale - 2, 6, 6);
      } else if (e.type === "sweeper") {
        ctx.fillStyle = "#d6f6ff";
        ctx.fillRect((e.x / TILE) * scale - 1, (e.y / TILE) * scale - 1, 4, 4);
      } else {
        ctx.fillStyle = e.type === "rat" ? "#f2a0b0" : "#ff4757";
        ctx.fillRect((e.x / TILE) * scale, (e.y / TILE) * scale, 2, 2);
      }
    }
    // игрок
    if (sim.player) {
      ctx.fillStyle = "#ffb347";
      ctx.fillRect(
        (sim.player.x / TILE) * scale - 1,
        (sim.player.y / TILE) * scale - 1,
        3,
        3
      );
    }
    // рамка видимой области
    if (this.camera) {
      const viewTilesW = this.viewW / ZOOM / TILE;
      const viewTilesH = this.viewH / ZOOM / TILE;
      ctx.strokeStyle = "rgba(232,242,255,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        (this.camera.x / TILE - viewTilesW / 2) * scale,
        (this.camera.y / TILE - viewTilesH / 2) * scale,
        viewTilesW * scale,
        viewTilesH * scale
      );
    }
  }
}
