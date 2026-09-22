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
import { 
  DEBRIS_TYPE, 
  SURFACE_TYPE,
  DEBRIS_VISUAL,
  OIL_VISUAL
} from "../world/streetTypes.js";
import { mulberry32 } from "../core/Rng.js";

export function paintTerrain(map) {
  const cv = document.createElement("canvas");
  cv.width = map.widthPx;
  cv.height = map.heightPx;
  const ctx = cv.getContext("2d");
  const rng = mulberry32((map.seed ^ 0x5eedbeef) >>> 0);

  // Единый проход по всем тайлам
  for (let ty = 0; ty < map.size; ty++) {
    for (let tx = 0; tx < map.size; tx++) {
      const px = tx * TILE;
      const py = ty * TILE;
      const tileType = map.get(tx, ty);
      
      // Рисуем дороги
      if (tileType === T.ROAD) {
        paintRoad(ctx, px, py);
      }
      
      // Рисуем здания
      if (tileType === T.HOUSE) {
        paintBuildingRoof(ctx, map, tx, ty, px, py, rng);
      }
      
      // Рисуем масло и мусор на дорогах
      paintSurfaceDetails(ctx, map, tx, ty, px, py, rng);
    }
  }

  // Рендеринг уличных объектов (префабы)
  if (map.objects) {
    for (const obj of map.objects) {
      if (!obj.isCollision) {
        paintPrefab(ctx, obj);
      }
    }
  }

  return cv;
}

// Отрисовка дороги
function paintRoad(ctx, px, py) {
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(px, py, TILE, TILE);
}

// Отрисовка деталей поверхности (масло и мусор)
function paintSurfaceDetails(ctx, map, tx, ty, px, py, rng) {
  if (!map.debris || !map.surface) return;
  
  const idx = ty * map.size + tx;
  const debrisType = map.debris[idx];
  const surfaceType = map.surface[idx];
  
  // Пропускаем чистые поверхности
  if (debrisType === DEBRIS_TYPE.NONE && surfaceType === SURFACE_TYPE.NORMAL) return;
  
  // Рисуем масло (под мусором)
  if (surfaceType === SURFACE_TYPE.OIL) {
    paintOil(ctx, px, py, rng);
  }
  
  // Рисуем мусор (поверх масла)
  if (debrisType !== DEBRIS_TYPE.NONE) {
    paintDebris(ctx, px, py, debrisType, rng);
  }
}

// ---------- разлитое масло ----------
function paintOil(ctx, px, py, rng) {
  const { baseColor, highlightColor, margin, variance, highlightSize, highlightOffset } = OIL_VISUAL;
  
  // Чёрное маслянистое пятно
  ctx.fillStyle = baseColor;
  const oilX = px + margin + Math.floor(rng() * variance);
  const oilY = py + margin + Math.floor(rng() * variance);
  const oilW = TILE - margin * 2 - Math.floor(rng() * variance);
  const oilH = TILE - margin * 2 - Math.floor(rng() * variance);
  ctx.fillRect(oilX, oilY, oilW, oilH);
  
  // Блик на масле
  ctx.fillStyle = highlightColor;
  ctx.fillRect(oilX + highlightOffset, oilY + highlightOffset, highlightSize.w, highlightSize.h);
}

// ---------- мусор ----------
function paintDebris(ctx, px, py, debrisType, rng) {
  const visual = DEBRIS_VISUAL[debrisType] || DEBRIS_VISUAL[DEBRIS_TYPE.LIGHT];
  const { colors, count } = visual;
  
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
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
