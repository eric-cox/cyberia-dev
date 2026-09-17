// ============================================================
//  render/TerrainPainter — запекание ландшафта в canvas:
//    paintTerrain(map)     → большой offscreen-canvas мира;
//    paintMinimapBase(map) → база миникарты (1px на тайл).
//  Отображение ячеек живёт ТОЛЬКО здесь: параметры — в
//  world/tiles.js, внешность — ниже. Новые ячейки = новая
//  ветка отрисовки, симуляцию это не затрагивает.
// ============================================================
import { TILE } from "../core/Constants.js";
import { T } from "../world/tiles.js";
import { mulberry32 } from "../core/Rng.js";
import { StreetRenderer } from "./StreetRenderer.js";

const SNOW_BASE = ["#dfe9f5", "#cddcf0", "#b3c6e0"];
const SNOW_SPECK = ["#c9d8ec", "#b9cbe4", "#9fb3d1"];
const SNOW_HI = ["#ffffff", "#e6f0fb", "#d2e1f4"];

export function paintTerrain(map) {
  const cv = document.createElement("canvas");
  cv.width = map.widthPx;
  cv.height = map.heightPx;
  const ctx = cv.getContext("2d");
  const rng = mulberry32((map.seed ^ 0x5eedbeef) >>> 0);

  // ========== Рендеринг улиц (если есть уличная сеть) ==========
  if (map.streetNetwork) {
    const streetRenderer = new StreetRenderer();
    streetRenderer.renderToContext(ctx, map.streetNetwork, 0);
  }

  // ========== Рендеринг остальных тайлов ==========
  for (let ty = 0; ty < map.size; ty++) {
    for (let tx = 0; tx < map.size; tx++) {
      const t = map.get(tx, ty);
      const px = tx * TILE;
      const py = ty * TILE;

      // Пропускаем улицы (уже отрисованы)
      if (map.streetNetwork) {
        const streetIdx = ty * map.size + tx;
        const streetType = map.streetNetwork.streetType[streetIdx];
        if (streetType === 1 || streetType === 2 || streetType === 3) {
          // ROADWAY, SIDEWALK, PLAZA — уже отрисованы
          continue;
        }
      }

      if (t === T.ICE || t === T.ICE_SMOOTH) {
        paintIce(ctx, map, tx, ty, px, py, t === T.ICE_SMOOTH, rng);
      } else if (t === T.SNOW || t === T.SNOW_DEEP || t === T.SNOW_VERY_DEEP) {
        // снег (под скалами/деревьями тоже)
        const depth = t <= T.SNOW_VERY_DEEP ? t : 1;
        ctx.fillStyle = SNOW_BASE[depth];
        ctx.fillRect(px, py, TILE, TILE);
        const n = 5 + Math.floor(rng() * 5);
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = rng() < 0.62 ? SNOW_SPECK[depth] : SNOW_HI[depth];
          ctx.fillRect(
            px + Math.floor(rng() * TILE),
            py + Math.floor(rng() * TILE),
            1,
            1
          );
        }
        if (depth === 2) {
          // бархан в очень глубоком снегу
          ctx.fillStyle = SNOW_HI[2];
          const wy = py + 3 + Math.floor(rng() * 8);
          ctx.fillRect(px + 1, wy, TILE - 2 - Math.floor(rng() * 4), 1);
        }
      }

      if (t === T.HOUSE) {
        // отрисовка стены здания
        paintBuildingWall(ctx, map, tx, ty, px, py, rng);
      } else if (t === T.TREE) {
        // тень дерева (крона рисуется спрайтом в проходе сущностей)
        ctx.fillStyle = "rgba(10,15,30,0.32)";
        ctx.fillRect(px + 2, py + 9, 12, 5);
        ctx.fillStyle = "rgba(10,15,30,0.18)";
        ctx.fillRect(px + 4, py + 7, 8, 2);
      }
    }
  }

  // ========== Отрисовка уличных объектов (префабы) ==========
  if (map.objects) {
    for (const obj of map.objects) {
      if (!obj.isCollision) {
        paintPrefab(ctx, obj, rng);
      }
    }
  }

  return cv;
}

// ---------- лёд ----------
function paintIce(ctx, map, tx, ty, px, py, smooth, rng) {
  ctx.fillStyle = smooth ? "#cfe6f8" : "#a9cbe6";
  ctx.fillRect(px, py, TILE, TILE);

  if (smooth) {
    // зеркальные блики-полосы
    ctx.fillStyle = "#eaf6ff";
    for (let i = 0; i < 3; i++) {
      const sy = py + 2 + Math.floor(rng() * 11);
      const sw = 3 + Math.floor(rng() * 6);
      ctx.fillRect(px + Math.floor(rng() * (TILE - sw)), sy, sw, 1);
    }
    ctx.fillStyle = "#9fd8ff";
    ctx.fillRect(px + Math.floor(rng() * 14), py + Math.floor(rng() * 14), 2, 1);
  } else {
    // трещины
    ctx.fillStyle = "#7fa4c8";
    let cx = px + 2 + rng() * 8;
    let cy = py + 1;
    for (let s = 0; s < 8; s++) {
      ctx.fillRect(cx | 0, cy | 0, 1, 1);
      cx += rng() * 2 - 0.7;
      cy += 1.4;
    }
    ctx.fillStyle = "#93b8d9";
    for (let i = 0; i < 4; i++)
      ctx.fillRect(
        px + Math.floor(rng() * TILE),
        py + Math.floor(rng() * TILE),
        1,
        1
      );
  }

  // искры
  ctx.fillStyle = "#ffffff";
  if (rng() < 0.55)
    ctx.fillRect(px + Math.floor(rng() * TILE), py + Math.floor(rng() * TILE), 1, 1);

  // тёмная кромка там, где лёд граничит со снегом/скалой
  const ice = (x, y) => {
    const tt = map.get(x, y);
    return tt === T.ICE || tt === T.ICE_SMOOTH;
  };
  ctx.fillStyle = "#6f97bd";
  if (!ice(tx, ty - 1)) ctx.fillRect(px, py, TILE, 1);
  if (!ice(tx, ty + 1)) ctx.fillRect(px, py + TILE - 1, TILE, 1);
  if (!ice(tx - 1, ty)) ctx.fillRect(px, py, 1, TILE);
  if (!ice(tx + 1, ty)) ctx.fillRect(px + TILE - 1, py, 1, TILE);
}



// ---------- отрисовка стены здания ----------
function paintBuildingWall(ctx, map, tx, ty, px, py, rng) {
  // Стена здания — тёмная с текстурой
  const wallColor = "#1a2028";
  const wallHighlight = "#2a3444";
  const windowColor = "#0a0f1e";
  const windowLitColor = "#ffb347";
  
  // Основание стены
  ctx.fillStyle = wallColor;
  ctx.fillRect(px, py, TILE, TILE);
  
  // Текстура стены (горизонтальные линии)
  ctx.fillStyle = wallHighlight;
  for (let i = 0; i < 4; i++) {
    const y = py + 4 + i * 7;
    ctx.fillRect(px, y, TILE, 1);
  }
  
  // Окна (случайные, некоторые горят)
  const windowSize = 3;
  const windowSpacing = 8;
  for (let wy = 0; wy < 2; wy++) {
    for (let wx = 0; wx < 2; wx++) {
      const x = px + 4 + wx * windowSpacing;
      const y = py + 4 + wy * windowSpacing;
      
      ctx.fillStyle = rng() < 0.4 ? windowLitColor : windowColor;
      ctx.fillRect(x, y, windowSize, windowSize);
      
      // Рамка окна
      ctx.fillStyle = wallHighlight;
      ctx.fillRect(x - 1, y - 1, windowSize + 2, 1);
      ctx.fillRect(x - 1, y + windowSize, windowSize + 2, 1);
    }
  }
}

// ---------- отрисовка префаба ----------
function paintPrefab(ctx, obj, rng) {
  const { x, y, prefab } = obj;
  const px = x * TILE;
  const py = y * TILE;
  
  // Рисуем префаб в зависимости от типа
  switch (prefab.id) {
    case "dumpster":
      drawDumpster(ctx, px, py, prefab.width, prefab.height);
      break;
    case "concrete_block":
      drawConcreteBlock(ctx, px, py, prefab.width, prefab.height);
      break;
    case "cyber_car":
      drawCyberCar(ctx, px, py, prefab.width, prefab.height);
      break;
    case "vending_machine":
      drawVendingMachine(ctx, px, py, prefab.width, prefab.height);
      break;
    case "crate":
      drawCrate(ctx, px, py);
      break;
    case "barrel":
      drawBarrel(ctx, px, py);
      break;
    case "trash":
      drawTrash(ctx, px, py, rng);
      break;
    case "puddle":
      drawPuddle(ctx, px, py);
      break;
    case "cable":
      drawCable(ctx, px, py, rng);
      break;
    case "neon_sign":
      drawNeonSign(ctx, px, py, prefab, rng);
      break;
    case "street_light":
      drawStreetLight(ctx, px, py);
      break;
  }
  
  // Рисуем неоновые точки
  if (prefab.neon && prefab.neon.length > 0) {
    for (const node of prefab.neon) {
      const nx = px + node.x * TILE;
      const ny = py + node.y * TILE;
      drawNeonGlow(ctx, nx, ny, node.color, node.radius);
    }
  }
}

// Функции отрисовки конкретных префабов
function drawDumpster(ctx, px, py, w, h) {
  ctx.fillStyle = "#3d4d6b";
  ctx.fillRect(px, py, w * TILE, h * TILE);
  ctx.fillStyle = "#2a3444";
  ctx.fillRect(px + 2, py + 2, w * TILE - 4, h * TILE - 4);
}

function drawConcreteBlock(ctx, px, py, w, h) {
  ctx.fillStyle = "#55688a";
  ctx.fillRect(px, py, w * TILE, h * TILE);
  ctx.fillStyle = "#3d4d6b";
  ctx.fillRect(px + 1, py + 1, w * TILE - 2, h * TILE - 2);
}

function drawCyberCar(ctx, px, py, w, h) {
  ctx.fillStyle = "#2a3444";
  ctx.fillRect(px, py, w * TILE, h * TILE);
  ctx.fillStyle = "#3d4d6b";
  ctx.fillRect(px + 4, py + 4, w * TILE - 8, h * TILE - 8);
  // Фары
  ctx.fillStyle = "#6fd6ff";
  ctx.fillRect(px + 4, py + 8, 4, 4);
  ctx.fillStyle = "#ff4757";
  ctx.fillRect(px + w * TILE - 8, py + 8, 4, 4);
}

function drawVendingMachine(ctx, px, py, w, h) {
  ctx.fillStyle = "#3d4d6b";
  ctx.fillRect(px, py, w * TILE, h * TILE);
  ctx.fillStyle = "#7dff8a";
  ctx.fillRect(px + 4, py + 8, w * TILE - 8, h * TILE - 16);
}

function drawCrate(ctx, px, py) {
  ctx.fillStyle = "#8a5a3a";
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = "#6a4229";
  ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
}

function drawBarrel(ctx, px, py) {
  ctx.fillStyle = "#55688a";
  ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
  ctx.fillStyle = "#3d4d6b";
  ctx.fillRect(px + 5, py + 5, TILE - 10, TILE - 10);
}

function drawTrash(ctx, px, py, rng) {
  ctx.fillStyle = "#4a4a4a";
  for (let i = 0; i < 5; i++) {
    const x = px + Math.floor(rng() * TILE);
    const y = py + Math.floor(rng() * TILE);
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPuddle(ctx, px, py) {
  ctx.fillStyle = "rgba(111, 214, 255, 0.3)";
  ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
}

function drawCable(ctx, px, py, rng) {
  ctx.strokeStyle = "#2a3444";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py + TILE / 2);
  ctx.lineTo(px + TILE, py + TILE / 2 + (rng() - 0.5) * 8);
  ctx.stroke();
}

function drawNeonSign(ctx, px, py, prefab, rng) {
  const colors = ["#ff4757", "#6fd6ff", "#7dff8a", "#ffb347"];
  const color = colors[Math.floor(rng() * colors.length)];
  
  // Основа вывески
  ctx.fillStyle = "#1a2028";
  ctx.fillRect(px, py, prefab.width * TILE, prefab.height * TILE);
  
  // Неоновый текст (упрощённый)
  ctx.fillStyle = color;
  ctx.fillRect(px + 4, py + 4, prefab.width * TILE - 8, prefab.height * TILE - 8);
}

function drawStreetLight(ctx, px, py) {
  ctx.fillStyle = "#3d4d6b";
  ctx.fillRect(px + TILE / 2 - 2, py, 4, TILE);
  ctx.fillStyle = "#ffb347";
  ctx.fillRect(px + TILE / 2 - 4, py, 8, 4);
}

function drawNeonGlow(ctx, x, y, color, radius) {
  // Свечение (упрощённое)
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
}



// ---------- база миникарты (1px на тайл) ----------
export function paintMinimapBase(map) {
  const cv = document.createElement("canvas");
  cv.width = map.size;
  cv.height = map.size;
  const ctx = cv.getContext("2d");
  const colors = {
    [T.SNOW]: "#c9d8ec",
    [T.SNOW_DEEP]: "#b0c3de",
    [T.SNOW_VERY_DEEP]: "#93aad0",
    [T.HOUSE]: "#3d4d6b",
    [T.ICE]: "#7fb2d9",
    [T.ICE_SMOOTH]: "#a9d7f2",
    [T.TREE]: "#5a718f",
  };
  for (let ty = 0; ty < map.size; ty++)
    for (let tx = 0; tx < map.size; tx++) {
      ctx.fillStyle = colors[map.get(tx, ty)] || "#05080f";
      ctx.fillRect(tx, ty, 1, 1);
    }
  return cv;
}
