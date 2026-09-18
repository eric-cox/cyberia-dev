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
import { renderStreets } from "./StreetRenderer.js";

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
    renderStreets(ctx, map.streetNetwork);
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
      }
    }
  }

  // ========== Отрисовка уличных объектов (префабы) ==========
  if (map.objects) {
    for (const obj of map.objects) {
      if (!obj.isCollision) {
        paintPrefab(ctx, obj);
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

// ---------- отрисовка префаба (упрощённая, KISS) ----------
function paintPrefab(ctx, obj) {
  const { x, y, prefab } = obj;
  const px = x * TILE;
  const py = y * TILE;
  
  ctx.fillStyle = prefab.color;
  ctx.fillRect(px, py, prefab.width * TILE, prefab.height * TILE);
  
  // Тень для твёрдых объектов
  if (prefab.solid) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(px + 2, py + 2, prefab.width * TILE - 4, prefab.height * TILE - 4);
  }
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
  };
  for (let ty = 0; ty < map.size; ty++)
    for (let tx = 0; tx < map.size; tx++) {
      ctx.fillStyle = colors[map.get(tx, ty)] || "#05080f";
      ctx.fillRect(tx, ty, 1, 1);
    }
  return cv;
}
