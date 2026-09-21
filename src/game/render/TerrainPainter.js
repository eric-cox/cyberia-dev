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
import { DEBRIS_TYPE, SURFACE_TYPE } from "../world/streetTypes.js";
import { mulberry32 } from "../core/Rng.js";
import { renderStreets } from "./StreetRenderer.js";

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

      if (t === T.HOUSE) {
        // отрисовка крыши здания (вид сверху)
        paintBuildingRoof(ctx, map, tx, ty, px, py, rng);
      }
    }
  }

  // ========== Отрисовка мусора и масла на дорогах ==========
  if (map.debris && map.surface) {
    for (let ty = 0; ty < map.size; ty++) {
      for (let tx = 0; tx < map.size; tx++) {
        const idx = ty * map.size + tx;
        const debrisType = map.debris[idx];
        const surfaceType = map.surface[idx];
        
        if (debrisType !== DEBRIS_TYPE.NONE || surfaceType !== SURFACE_TYPE.NORMAL) {
          const px = tx * TILE;
          const py = ty * TILE;
          
          // Рисуем масло (под мусором)
          if (surfaceType === SURFACE_TYPE.OIL) {
            paintOil(ctx, px, py, rng);
          }
          
          // Рисуем мусор (поверх масла)
          if (debrisType !== DEBRIS_TYPE.NONE) {
            paintDebris(ctx, px, py, debrisType, rng);
          }
        }
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

// ---------- разлитое масло ----------
function paintOil(ctx, px, py, rng) {
  // Чёрное маслянистое пятно
  ctx.fillStyle = "rgba(20, 20, 20, 0.7)";
  const oilX = px + 2 + Math.floor(rng() * 4);
  const oilY = py + 2 + Math.floor(rng() * 4);
  const oilW = TILE - 4 - Math.floor(rng() * 4);
  const oilH = TILE - 4 - Math.floor(rng() * 4);
  ctx.fillRect(oilX, oilY, oilW, oilH);
  
  // Блик на масле
  ctx.fillStyle = "rgba(60, 60, 60, 0.5)";
  ctx.fillRect(oilX + 2, oilY + 2, 3, 2);
}

// ---------- мусор ----------
function paintDebris(ctx, px, py, debrisType, rng) {
  const colors = {
    [DEBRIS_TYPE.LIGHT]: ["#6b6b6b", "#5a5a5a"],
    [DEBRIS_TYPE.MEDIUM]: ["#4a4a4a", "#3a3a3a", "#5a5a5a"],
    [DEBRIS_TYPE.HEAVY]: ["#3a3a3a", "#2a2a2a", "#4a4a4a", "#5a5a5a"],
  };
  
  const debrisColors = colors[debrisType] || colors[DEBRIS_TYPE.LIGHT];
  
  // Количество мусора зависит от типа
  const debrisCount = debrisType === DEBRIS_TYPE.LIGHT ? 3 :
                      debrisType === DEBRIS_TYPE.MEDIUM ? 6 : 10;
  
  for (let i = 0; i < debrisCount; i++) {
    ctx.fillStyle = debrisColors[Math.floor(rng() * debrisColors.length)];
    const dx = px + Math.floor(rng() * TILE);
    const dy = py + Math.floor(rng() * TILE);
    const size = 1 + Math.floor(rng() * 2);
    ctx.fillRect(dx, dy, size, size);
  }
}



// ---------- отрисовка стены здания ----------
function paintBuildingRoof(ctx, map, tx, ty, px, py, rng) {
  // Крыша здания (вид сверху)
  const roofColor = "#2a3444";
  const roofEdge = "#1a2028";
  const antennaColor = "#4a5568";
  
  // Основание крыши
  ctx.fillStyle = roofColor;
  ctx.fillRect(px, py, TILE, TILE);
  
  // Бортики только по внешнему периметру здания
  // Проверяем соседей: если сосед не HOUSE, рисуем бортик
  ctx.fillStyle = roofEdge;
  const edgeSize = 2;
  
  const isHouse = (x, y) => {
    if (x < 0 || y < 0 || x >= map.size || y >= map.size) return false;
    return map.get(x, y) === T.HOUSE;
  };
  
  // Верхний бортик (если сосед сверху не дом)
  if (!isHouse(tx, ty - 1)) {
    ctx.fillRect(px, py, TILE, edgeSize);
  }
  // Нижний бортик (если сосед снизу не дом)
  if (!isHouse(tx, ty + 1)) {
    ctx.fillRect(px, py + TILE - edgeSize, TILE, edgeSize);
  }
  // Левый бортик (если сосед слева не дом)
  if (!isHouse(tx - 1, ty)) {
    ctx.fillRect(px, py, edgeSize, TILE);
  }
  // Правый бортик (если сосед справа не дом)
  if (!isHouse(tx + 1, ty)) {
    ctx.fillRect(px + TILE - edgeSize, py, edgeSize, TILE);
  }
  
  // Антенны и детали рисуем только на "первом" тайле здания
  // (верхний-левый тайл: если слева и сверху не дом)
  const isFirstTile = !isHouse(tx - 1, ty) && !isHouse(tx, ty - 1);
  
  if (isFirstTile) {
    // Антенны на крыше (30% шанс)
    if (rng() < 0.3) {
      ctx.fillStyle = antennaColor;
      const antennaX = px + 4 + Math.floor(rng() * (TILE - 8));
      const antennaY = py + 4 + Math.floor(rng() * (TILE - 8));
      
      // Вертикальная антенна (линия)
      ctx.fillRect(antennaX, antennaY, 1, 6);
      // Горизонтальная перекладина
      ctx.fillRect(antennaX - 2, antennaY + 2, 5, 1);
    }
    
    // Дополнительные детали на крыше (20% шанс)
    if (rng() < 0.2) {
      ctx.fillStyle = "#3d4d6b";
      const detailX = px + 3 + Math.floor(rng() * (TILE - 6));
      const detailY = py + 3 + Math.floor(rng() * (TILE - 6));
      ctx.fillRect(detailX, detailY, 3, 3);
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
    [T.ROAD]: "#4a4a4a",
    [T.HOUSE]: "#3d4d6b",
  };
  for (let ty = 0; ty < map.size; ty++)
    for (let tx = 0; tx < map.size; tx++) {
      ctx.fillStyle = colors[map.get(tx, ty)] || "#05080f";
      ctx.fillRect(tx, ty, 1, 1);
    }
  return cv;
}
