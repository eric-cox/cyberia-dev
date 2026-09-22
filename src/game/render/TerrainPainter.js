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
      
      // Рисуем дороги с разметкой
      if (tileType === T.ROAD) {
        paintRoad(ctx, map, tx, ty, px, py, rng);
      }
      
      // Рисуем здания
      if (tileType === T.HOUSE) {
        paintBuilding(ctx, map, tx, ty, px, py, rng);
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

// Отрисовка дороги с разметкой
function paintRoad(ctx, map, tx, ty, px, py, rng) {
  // Базовый асфальт с шумом
  ctx.fillStyle = "#2a2a2a";
  ctx.fillRect(px, py, TILE, TILE);
  
  // Добавляем шум/грязь на асфальт
  for (let i = 0; i < 3; i++) {
    const noiseX = px + Math.floor(rng() * TILE);
    const noiseY = py + Math.floor(rng() * TILE);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + rng() * 0.1})`;
    ctx.fillRect(noiseX, noiseY, 1, 1);
  }
  
  // Определяем направление дороги
  const isHorizontal = isRoadHorizontal(map, tx, ty);
  const isVertical = isRoadVertical(map, tx, ty);
  
  // Рисуем разметку (стёртую, желтоватую)
  if (isHorizontal && !isVertical) {
    // Горизонтальная дорога - осевая линия
    ctx.fillStyle = "#d4b84a"; // Желтоватая, стёртая
    const lineY = py + TILE / 2 - 1;
    // Прерывистая линия: 8px линия, 4px пробел
    for (let x = 0; x < TILE; x += 12) {
      ctx.fillRect(px + x, lineY, 8, 2);
    }
  } else if (isVertical && !isHorizontal) {
    // Вертикальная дорога - осевая линия
    ctx.fillStyle = "#d4b84a";
    const lineX = px + TILE / 2 - 1;
    // Прерывистая линия: 8px линия, 4px пробел
    for (let y = 0; y < TILE; y += 12) {
      ctx.fillRect(lineX, py + y, 2, 8);
    }
  }
  // Перекрёсток - без осевой разметки
  
  // Белые линии по краям дороги (если сосед не дорога)
  ctx.fillStyle = "#e0e0e0"; // Не идеально белый
  
  // Верхняя граница
  if (!isRoadAt(map, tx, ty - 1)) {
    ctx.fillRect(px, py, TILE, 1);
  }
  // Нижняя граница
  if (!isRoadAt(map, tx, ty + 1)) {
    ctx.fillRect(px, py + TILE - 1, TILE, 1);
  }
  // Левая граница
  if (!isRoadAt(map, tx - 1, ty)) {
    ctx.fillRect(px, py, 1, TILE);
  }
  // Правая граница
  if (!isRoadAt(map, tx + 1, ty)) {
    ctx.fillRect(px + TILE - 1, py, 1, TILE);
  }
  
  // Пешеходный переход (зебра)
  if (isCrosswalk(map, tx, ty)) {
    ctx.fillStyle = "#ffffff";
    if (isHorizontal) {
      // Горизонтальная зебра
      for (let i = 0; i < TILE; i += 4) {
        ctx.fillRect(px + i, py, 2, TILE);
      }
    } else if (isVertical) {
      // Вертикальная зебра
      for (let i = 0; i < TILE; i += 4) {
        ctx.fillRect(px, py + i, TILE, 2);
      }
    }
  }
}

// Проверка, является ли тайл дорогой
function isRoadAt(map, tx, ty) {
  if (tx < 0 || tx >= map.size || ty < 0 || ty >= map.size) return false;
  return map.get(tx, ty) === T.ROAD;
}

// Проверка, идёт ли дорога горизонтально
function isRoadHorizontal(map, tx, ty) {
  return isRoadAt(map, tx - 1, ty) || isRoadAt(map, tx + 1, ty);
}

// Проверка, идёт ли дорога вертикально
function isRoadVertical(map, tx, ty) {
  return isRoadAt(map, tx, ty - 1) || isRoadAt(map, tx, ty + 1);
}

// Проверка, является ли тайл пешеходным переходом
function isCrosswalk(map, tx, ty) {
  // Пешеходный переход - это дорога, окружённая тротуарами с двух сторон
  if (!isRoadAt(map, tx, ty)) return false;
  
  const isHorizontal = isRoadHorizontal(map, tx, ty);
  const isVertical = isRoadVertical(map, tx, ty);
  
  // Проверяем, есть ли тротуары поперёк дороги
  if (isHorizontal && !isVertical) {
    // Для горизонтальной дороги проверяем тротуары сверху и снизу
    const hasSidewalkTop = !isRoadAt(map, tx, ty - 1);
    const hasSidewalkBottom = !isRoadAt(map, tx, ty + 1);
    return hasSidewalkTop && hasSidewalkBottom;
  } else if (isVertical && !isHorizontal) {
    // Для вертикальной дороги проверяем тротуары слева и справа
    const hasSidewalkLeft = !isRoadAt(map, tx - 1, ty);
    const hasSidewalkRight = !isRoadAt(map, tx + 1, ty);
    return hasSidewalkLeft && hasSidewalkRight;
  }
  
  return false;
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



// ---------- отрисовка здания (крыша + стены + тень) ----------
function paintBuilding(ctx, map, tx, ty, px, py, rng) {
  const isHouse = (x, y) => {
    if (x < 0 || y < 0 || x >= map.size || y >= map.size) return false;
    return map.get(x, y) === T.HOUSE;
  };
  
  // Определяем, является ли этот тайл частью стены здания
  const isTopEdge = !isHouse(tx, ty - 1);
  const isBottomEdge = !isHouse(tx, ty + 1);
  const isLeftEdge = !isHouse(tx - 1, ty);
  const isRightEdge = !isHouse(tx + 1, ty);
  
  // Рисуем тень здания (если это верхний-левый угол)
  if (isTopEdge && isLeftEdge) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(px + 2, py + 2, TILE, TILE);
  }
  
  // Рисуем крышу (плоский тайл с текстурой)
  const roofColor = "#2a3444";
  ctx.fillStyle = roofColor;
  ctx.fillRect(px, py, TILE, TILE);
  
  // Добавляем текстуру крыши (шум)
  for (let i = 0; i < 2; i++) {
    const noiseX = px + Math.floor(rng() * TILE);
    const noiseY = py + Math.floor(rng() * TILE);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + rng() * 0.1})`;
    ctx.fillRect(noiseX, noiseY, 1, 1);
  }
  
  // Рисуем стены (если это край здания)
  const wallColor = "#1a2028";
  const wallHeight = 3; // Высота стены в пикселях
  
  ctx.fillStyle = wallColor;
  
  // Нижняя стена (видна, если это нижний край)
  if (isBottomEdge) {
    ctx.fillRect(px, py + TILE - wallHeight, TILE, wallHeight);
  }
  
  // Правая стена (видна, если это правый край)
  if (isRightEdge) {
    ctx.fillRect(px + TILE - wallHeight, py, wallHeight, TILE);
  }
  
  // Бортики крыши (по внешнему периметру)
  const edgeSize = 2;
  ctx.fillStyle = "#1a2028";
  
  if (isTopEdge) {
    ctx.fillRect(px, py, TILE, edgeSize);
  }
  if (isBottomEdge) {
    ctx.fillRect(px, py + TILE - edgeSize, TILE, edgeSize);
  }
  if (isLeftEdge) {
    ctx.fillRect(px, py, edgeSize, TILE);
  }
  if (isRightEdge) {
    ctx.fillRect(px + TILE - edgeSize, py, edgeSize, TILE);
  }
  
  // Антенны и детали рисуем только на "первом" тайле здания
  const isFirstTile = isTopEdge && isLeftEdge;
  
  if (isFirstTile) {
    // Антенны на крыше (30% шанс)
    if (rng() < 0.3) {
      ctx.fillStyle = "#4a5568";
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
