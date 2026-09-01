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
  drawOrbs,
} from "./painters.js";

export class Renderer {
  constructor(canvas, bus) {
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = 1;
    this.viewW = 800;
    this.viewH = 600;
    this.time = 0;
    this.fx = new Fx();
    this.weather = new Weather();
    this.terrainCache = new Map(); // seed → canvas
    this.mm = null;
    this.mctx = null;
    this.cam = null;

    this.wireEvents(bus);
    this.resize();
  }

  // события симуляции → визуальный отклик
  wireEvents(bus) {
    const P = this.fx.particles;
    const Tx = this.fx.texts;

    bus.on("attack", (e) => P.slashArc(e.x, e.y, e.angle, e.range));
    bus.on("hit", (e) => {
      P.burst(e.x, e.y - 6, {
        n: 7,
        colors: ["#c23b3b", "#8a2a2a", "#ff6b7a"],
        speed: 70,
        life: 0.45,
      });
      Tx.add(e.x, e.y - 16, "-" + e.dmg, "#ffd9ac");
    });
    bus.on("kill", (e) => {
      const isGolem = e.type === "golem";
      P.burst(e.x, e.y - (isGolem ? 40 : 6), {
        n: isGolem ? 46 : 16,
        colors: isGolem
          ? ["#6fd6ff", "#a9e8ff", "#dfeaf7", "#4a6288", "#e8f2ff"]
          : ["#c23b3b", "#8a2a2a", "#e8f2ff", "#7d8f82"],
        speed: isGolem ? 150 : 100,
        life: isGolem ? 0.9 : 0.6,
        size: isGolem ? 2 : 1,
      });
      Tx.add(e.x, e.y - (isGolem ? 90 : 24), e.name.toUpperCase() + " ПАЛ", isGolem ? "#6fd6ff" : "#9fd8ff");
    });
    bus.on("hurt", (e) => {
      P.burst(e.x, e.y - 6, {
        n: 8,
        colors: ["#ff4757", "#c23b3b", "#e8f2ff"],
        speed: 80,
        life: 0.4,
      });
      Tx.add(e.x, e.y - 18, "-" + e.dmg, "#ff4757");
    });
    bus.on("cold-tick", (e) => {
      Tx.add(e.x, e.y - 18, "-" + e.amount, e.critical ? "#ff4757" : "#ff8a94");
      if (e.critical)
        P.burst(e.x, e.y - 8, {
          n: 4,
          colors: ["#7fd7ff", "#bfe3ff", "#e8f2ff"],
          speed: 26,
          life: 0.5,
        });
    });
    bus.on("pickup", (e) =>
      P.burst(e.x, e.y - 6, {
        n: 14,
        colors: [e.color, "#e8f2ff", "#ffffff"],
        speed: 80,
        life: 0.55,
      })
    );
    bus.on("orb", (e) => {
      Tx.add(e.x, e.y - 16, `+${e.heat} ТЕПЛА`, "#ffb347");
      Tx.add(e.x, e.y - 26, `+${e.hp} ЖИЗНИ`, "#7dff8a");
      P.burst(e.x, e.y - 6, {
        n: 6,
        colors: ["#ffb347", "#ff8c42", "#fff1c9"],
        speed: 50,
        life: 0.4,
      });
    });
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
    this.cam = camera;

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

      // проход сущностей с y-сортировкой
      const list = [];
      for (const tr of sim.map.decor)
        list.push({ y: tr.y, d: () => drawTree(ctx, tr, this.time) });
      for (const pk of sim.pickups)
        list.push({ y: pk.y, d: () => drawPickup(ctx, pk) });
      for (const e of sim.enemies)
        list.push({ y: e.y, d: () => drawEnemy(ctx, e) });
      if (sim.player && sim.state !== "menu") {
        const p = sim.player;
        list.push({
          y: p.y,
          d: () =>
            sim.state === "dead" ? drawDeadPlayer(ctx, p) : drawPlayer(ctx, p),
        });
      }
      list.sort((a, b) => a.y - b.y);
      for (const it of list) it.d();

      drawOrbs(ctx, sim.orbs.list);
      this.fx.update(dt);
      this.fx.draw(ctx);
      ctx.restore();
    }

    this.weather.update(dt);
    this.weather.draw(ctx);

    this.renderMinimap(sim);
  }

  renderMinimap(sim) {
    if (!this.mctx || !sim.map || sim.state === "menu") return;
    const m = this.mctx;
    const S = this.mm.width;
    const k = S / sim.map.size;
    m.imageSmoothingEnabled = false;
    m.clearRect(0, 0, S, S);
    m.drawImage(this.minimapBase(sim.map), 0, 0, S, S);

    // артефакты (мигают)
    const blink = Math.floor(performance.now() / 300) % 2 === 0;
    for (const pk of sim.pickups) {
      if (!blink) continue;
      m.fillStyle = "#6fd6ff";
      m.fillRect((pk.x / TILE) * k - 1, (pk.y / TILE) * k - 1, 3, 3);
    }
    // мутанты (гиганты — крупные метки)
    for (const e of sim.enemies) {
      if (e.type === "golem") {
        m.fillStyle = blink ? "#6fd6ff" : "#a9e8ff";
        m.fillRect((e.x / TILE) * k - 2, (e.y / TILE) * k - 2, 6, 6);
      } else if (e.type === "rhino") {
        m.fillStyle = "#d6f6ff";
        m.fillRect((e.x / TILE) * k - 1, (e.y / TILE) * k - 1, 4, 4);
      } else {
        m.fillStyle = e.type === "mouse" ? "#f2a0b0" : "#ff4757";
        m.fillRect((e.x / TILE) * k, (e.y / TILE) * k, 2, 2);
      }
    }
    // игрок
    if (sim.player) {
      m.fillStyle = "#ffb347";
      m.fillRect(
        (sim.player.x / TILE) * k - 1,
        (sim.player.y / TILE) * k - 1,
        3,
        3
      );
    }
    // рамка обзора
    if (this.cam) {
      const vw = this.viewW / ZOOM / TILE;
      const vh = this.viewH / ZOOM / TILE;
      m.strokeStyle = "rgba(232,242,255,0.5)";
      m.lineWidth = 1;
      m.strokeRect(
        (this.cam.x / TILE - vw / 2) * k,
        (this.cam.y / TILE - vh / 2) * k,
        vw * k,
        vh * k
      );
    }
  }
}
