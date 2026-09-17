// ============================================================
//  render/StreetRenderer.js — многослойный рендеринг улиц
//  5 слоёв: базовое покрытие, разметка, инфраструктура, повреждения, неон
// ============================================================

import { TILE } from "../core/Constants.js";
import { STREET_TYPE, STREET_DIR, CURB_SIDE } from "../world/streetTypes.js";

export class StreetRenderer {
  constructor() {
    // Кэшированные слои для оптимизации
    this.groundLayer = null;
    this.markingsLayer = null;
    this.infrastructureLayer = null;
    this.decayLayer = null;
    this.neonLayer = null;
    
    // Флаг инициализации
    this.initialized = false;
  }

  // ========== Инициализация слоёв ==========
  initialize(streetNetwork, mapWidth, mapHeight) {
    if (this.initialized) return;
    
    // Создаём offscreen canvas для каждого слоя
    this.groundLayer = this.createLayerCanvas(mapWidth, mapHeight);
    this.markingsLayer = this.createLayerCanvas(mapWidth, mapHeight);
    this.infrastructureLayer = this.createLayerCanvas(mapWidth, mapHeight);
    this.decayLayer = this.createLayerCanvas(mapWidth, mapHeight);
    this.neonLayer = this.createLayerCanvas(mapWidth, mapHeight);
    
    // Рендерим статические слои
    this.renderGroundLayer(streetNetwork);
    this.renderMarkingsLayer(streetNetwork);
    this.renderInfrastructureLayer(streetNetwork);
    this.renderDecayLayer(streetNetwork);
    
    this.initialized = true;
  }

  createLayerCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width * TILE;
    canvas.height = height * TILE;
    return canvas;
  }

  // ========== Слой 1: Базовое покрытие ==========
  renderGroundLayer(streetNetwork) {
    const ctx = this.groundLayer.getContext("2d");
    
    for (let y = 0; y < streetNetwork.size; y++) {
      for (let x = 0; x < streetNetwork.size; x++) {
        const idx = y * streetNetwork.size + x;
        const streetType = streetNetwork.streetType[idx];
        const px = x * TILE;
        const py = y * TILE;
        
        if (streetType === STREET_TYPE.ROADWAY) {
          // Проезжая часть — тёмный асфальт с вариацией тона
          const brightness = 0.95 + Math.random() * 0.1; // ±5%
          const gray = Math.floor(40 * brightness);
          ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray + 5})`;
          ctx.fillRect(px, py, TILE, TILE);
          
          // Шум на асфальте
          for (let i = 0; i < 3; i++) {
            const nx = px + Math.random() * TILE;
            const ny = py + Math.random() * TILE;
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
            ctx.fillRect(nx, ny, 1, 1);
          }
        } else if (streetType === STREET_TYPE.SIDEWALK) {
          // Тротуар — бетонные плиты
          ctx.fillStyle = "#8a8a8a";
          ctx.fillRect(px, py, TILE, TILE);
          
          // Швы между плитами (2x2 тайла)
          ctx.strokeStyle = "#6a6a6a";
          ctx.lineWidth = 1;
          if (x % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + TILE);
            ctx.stroke();
          }
          if (y % 2 === 0) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + TILE, py);
            ctx.stroke();
          }
          
          // Грязные пятна
          if (Math.random() < 0.2) {
            ctx.fillStyle = "rgba(60, 50, 40, 0.3)";
            ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          }
        } else if (streetType === STREET_TYPE.PLAZA) {
          // Площадь — крупная плитка
          ctx.fillStyle = "#9a9a9a";
          ctx.fillRect(px, py, TILE, TILE);
          
          // Узорная вставка (редко)
          if (Math.random() < 0.05) {
            ctx.fillStyle = "#7a7a7a";
            ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
          }
        }
        
        // Бордюры
        const curbSide = streetNetwork.curbSide[idx];
        if (curbSide !== CURB_SIDE.NONE) {
          ctx.fillStyle = "#4a4a4a";
          
          if (curbSide & CURB_SIDE.NORTH) {
            ctx.fillRect(px, py, TILE, 2);
            ctx.fillStyle = "#6a6a6a";
            ctx.fillRect(px, py + 2, TILE, 1);
          }
          if (curbSide & CURB_SIDE.SOUTH) {
            ctx.fillRect(px, py + TILE - 2, TILE, 2);
            ctx.fillStyle = "#6a6a6a";
            ctx.fillRect(px, py + TILE - 3, TILE, 1);
          }
          if (curbSide & CURB_SIDE.EAST) {
            ctx.fillRect(px + TILE - 2, py, 2, TILE);
            ctx.fillStyle = "#6a6a6a";
            ctx.fillRect(px + TILE - 3, py, 1, TILE);
          }
          if (curbSide & CURB_SIDE.WEST) {
            ctx.fillRect(px, py, 2, TILE);
            ctx.fillStyle = "#6a6a6a";
            ctx.fillRect(px + 2, py, 1, TILE);
          }
        }
      }
    }
  }

  // ========== Слой 2: Разметка ==========
  renderMarkingsLayer(streetNetwork) {
    const ctx = this.markingsLayer.getContext("2d");
    
    for (let y = 0; y < streetNetwork.size; y++) {
      for (let x = 0; x < streetNetwork.size; x++) {
        const idx = y * streetNetwork.size + x;
        const streetType = streetNetwork.streetType[idx];
        const streetDir = streetNetwork.streetDir[idx];
        const px = x * TILE;
        const py = y * TILE;
        
        if (streetType === STREET_TYPE.ROADWAY) {
          // Осевая линия (жёлтая прерывистая)
          if (streetDir === STREET_DIR.HORIZONTAL && y % 2 === 0) {
            if (x % 3 !== 0) { // Прерывистая: 2 тайла линия, 1 тайл пробел
              ctx.fillStyle = "#ffcc00";
              ctx.fillRect(px, py + TILE / 2 - 1, TILE, 2);
            }
          } else if (streetDir === STREET_DIR.VERTICAL && x % 2 === 0) {
            if (y % 3 !== 0) {
              ctx.fillStyle = "#ffcc00";
              ctx.fillRect(px + TILE / 2 - 1, py, 2, TILE);
            }
          }
          
          // Разделительные полосы (белые сплошные)
          if (streetDir === STREET_DIR.HORIZONTAL) {
            const curbSide = streetNetwork.curbSide[idx];
            if (curbSide & CURB_SIDE.NORTH) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(px, py + 1, TILE, 1);
            }
            if (curbSide & CURB_SIDE.SOUTH) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(px, py + TILE - 2, TILE, 1);
            }
          } else if (streetDir === STREET_DIR.VERTICAL) {
            const curbSide = streetNetwork.curbSide[idx];
            if (curbSide & CURB_SIDE.EAST) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(px + TILE - 2, py, 1, TILE);
            }
            if (curbSide & CURB_SIDE.WEST) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(px + 1, py, 1, TILE);
            }
          }
          
          // Стирание разметки (15% шанс)
          if (Math.random() < 0.15) {
            ctx.clearRect(px, py, TILE, TILE);
          }
        }
        
        // Пешеходные переходы на перекрёстках
        if (streetDir === STREET_DIR.INTERSECTION) {
          // Проверяем, есть ли маркер перехода
          if (streetNetwork.decoration[idx] === 1) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          }
        }
      }
    }
  }

  // ========== Слой 3: Инфраструктура ==========
  renderInfrastructureLayer(streetNetwork) {
    const ctx = this.infrastructureLayer.getContext("2d");
    
    // Люки
    for (const manhole of streetNetwork.manholes) {
      const px = manhole.x * TILE;
      const py = manhole.y * TILE;
      
      // Круглая крышка
      ctx.fillStyle = "#3a3a3a";
      ctx.beginPath();
      ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Киберпанк-символика
      ctx.strokeStyle = "#5a5a5a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + TILE / 2);
      ctx.lineTo(px + TILE - 4, py + TILE / 2);
      ctx.stroke();
    }
    
    // Ливневые решётки (вдоль бордюров)
    for (let y = 0; y < streetNetwork.size; y++) {
      for (let x = 0; x < streetNetwork.size; x++) {
        const idx = y * streetNetwork.size + x;
        const curbSide = streetNetwork.curbSide[idx];
        
        if (curbSide !== CURB_SIDE.NONE && (x + y) % 10 === 0) {
          const px = x * TILE;
          const py = y * TILE;
          
          ctx.fillStyle = "#2a2a2a";
          
          if (curbSide & CURB_SIDE.NORTH) {
            ctx.fillRect(px + 2, py, TILE - 4, 3);
          }
          if (curbSide & CURB_SIDE.SOUTH) {
            ctx.fillRect(px + 2, py + TILE - 3, TILE - 4, 3);
          }
        }
      }
    }
  }

  // ========== Слой 4: Повреждения и мусор ==========
  renderDecayLayer(streetNetwork) {
    const ctx = this.decayLayer.getContext("2d");
    
    // Трещины на асфальте
    for (let y = 0; y < streetNetwork.size; y++) {
      for (let x = 0; x < streetNetwork.size; x++) {
        const idx = y * streetNetwork.size + x;
        const streetType = streetNetwork.streetType[idx];
        
        if (streetType === STREET_TYPE.ROADWAY && Math.random() < 0.05) {
          const px = x * TILE;
          const py = y * TILE;
          
          // Процедурная трещина
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth = 1;
          ctx.beginPath();
          
          let cx = px + Math.random() * TILE;
          let cy = py + Math.random() * TILE;
          ctx.moveTo(cx, cy);
          
          const segments = 2 + Math.floor(Math.random() * 4);
          for (let i = 0; i < segments; i++) {
            cx += (Math.random() - 0.5) * 8;
            cy += (Math.random() - 0.5) * 8;
            ctx.lineTo(cx, cy);
          }
          
          ctx.stroke();
        }
      }
    }
    
    // Лужи
    for (const puddle of streetNetwork.puddles) {
      const px = puddle.x * TILE;
      const py = puddle.y * TILE;
      const size = puddle.size * TILE;
      
      ctx.fillStyle = "rgba(100, 150, 200, 0.4)";
      ctx.beginPath();
      ctx.ellipse(px + TILE / 2, py + TILE / 2, size / 2, size / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Мусор
    for (let y = 0; y < streetNetwork.size; y++) {
      for (let x = 0; x < streetNetwork.size; x++) {
        const idx = y * streetNetwork.size + x;
        
        if (streetNetwork.decoration[idx] === 3) {
          const px = x * TILE;
          const py = y * TILE;
          
          // Разбросанный мусор
          ctx.fillStyle = "#4a4a4a";
          for (let i = 0; i < 3; i++) {
            const mx = px + Math.random() * TILE;
            const my = py + Math.random() * TILE;
            ctx.fillRect(mx, my, 2, 2);
          }
        }
      }
    }
  }

  // ========== Слой 5: Неон (динамический) ==========
  renderNeonLayer(streetNetwork, time) {
    const ctx = this.neonLayer.getContext("2d");
    ctx.clearRect(0, 0, this.neonLayer.width, this.neonLayer.height);
    
    // Неоновые узлы
    for (const node of streetNetwork.neonNodes) {
      const px = node.x * TILE;
      const py = node.y * TILE;
      
      // Мерцание (20% объектов)
      let alpha = 1.0;
      if (node.flicker) {
        alpha = 0.7 + Math.sin(time * 5 + node.x) * 0.3;
      }
      
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = "lighter";
      
      // Свечение
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Ореол
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(px + TILE / 2, py + TILE / 2, TILE, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = "source-over";
  }

  // ========== Отражения неона в лужах ==========
  renderPuddleReflections(streetNetwork) {
    const ctx = this.decayLayer.getContext("2d");
    
    for (const puddle of streetNetwork.puddles) {
      // Находим ближайший источник неона
      let nearestNeon = null;
      let nearestDist = Infinity;
      
      for (const node of streetNetwork.neonNodes) {
        const dist = Math.hypot(node.x - puddle.x, node.y - puddle.y);
        if (dist < 5 && dist < nearestDist) {
          nearestNeon = node;
          nearestDist = dist;
        }
      }
      
      if (nearestNeon) {
        const px = puddle.x * TILE;
        const py = puddle.y * TILE;
        const size = puddle.size * TILE;
        
        // Цветовое пятно в луже
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = nearestNeon.color;
        ctx.beginPath();
        ctx.ellipse(px + TILE / 2, py + TILE / 2, size / 2, size / 3 * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
  }

  // ========== Композитный рендеринг ==========
  renderToContext(targetCtx, streetNetwork, time) {
    if (!this.initialized) {
      this.initialize(streetNetwork, streetNetwork.size, streetNetwork.size);
      this.renderPuddleReflections(streetNetwork);
    }
    
    // Обновляем динамический слой неона
    this.renderNeonLayer(streetNetwork, time);
    
    // Копируем все слои на целевой контекст
    targetCtx.drawImage(this.groundLayer, 0, 0);
    targetCtx.drawImage(this.markingsLayer, 0, 0);
    targetCtx.drawImage(this.infrastructureLayer, 0, 0);
    targetCtx.drawImage(this.decayLayer, 0, 0);
    targetCtx.drawImage(this.neonLayer, 0, 0);
  }
}
