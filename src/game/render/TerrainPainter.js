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

  // Атмосферные эффекты (ART.MD §9)
  paintAtmosphericEffects(ctx, map, rng);

  return cv;
}

// ---------- атмосферные эффекты (ART.MD §9) ----------
function paintAtmosphericEffects(ctx, map, rng) {
  // Туман/дымка (ART.MD §9.2) - полупрозрачный слой
  ctx.fillStyle = "rgba(26, 29, 36, 0.15)"; // #1a1d24 15%
  ctx.fillRect(0, 0, map.widthPx, map.heightPx);
  
  // Неоновые отражения на дорогах (ART.MD §4.4)
  // Находим здания с неоновыми вывесками и рисуем отражения
  for (let ty = 0; ty < map.size; ty++) {
    for (let tx = 0; tx < map.size; tx++) {
      if (map.get(tx, ty) !== T.HOUSE) continue;
      
      const px = tx * TILE;
      const py = ty * TILE;
      
      // Проверяем, есть ли дорога рядом (для отражения)
      const hasRoadBelow = ty < map.size - 1 && map.get(tx, ty + 1) === T.ROAD;
      const hasRoadRight = tx < map.size - 1 && map.get(tx + 1, ty) === T.ROAD;
      
      if (hasRoadBelow || hasRoadRight) {
        // Рисуем отражение неона (ART.MD §4.4)
        const neonColors = ["#ff2a6d", "#05d9e8", "#f5e042"];
        const neonColor = neonColors[Math.floor(rng() * neonColors.length)];
        
        // Вытянутое вертикальное пятно 4x16 px, прозрачность 20-30%
        ctx.fillStyle = neonColor + "40"; // 25% alpha
        if (hasRoadBelow) {
          ctx.fillRect(px + 6, py + TILE, 4, 16);
        }
        if (hasRoadRight) {
          ctx.fillRect(px + TILE, py + 6, 16, 4);
        }
      }
    }
  }
}

// Отрисовка дороги с разметкой (ART.MD стиль)
function paintRoad(ctx, map, tx, ty, px, py, rng) {
  // Базовый мокрый асфальт (ART.MD §4.1)
  ctx.fillStyle = "#1a1d24"; // Тёмный мокрый асфальт
  ctx.fillRect(px, py, TILE, TILE);
  
  // Добавляем шум для текстуры (5-10% пикселей)
  for (let i = 0; i < 2; i++) {
    const noiseX = px + Math.floor(rng() * TILE);
    const noiseY = py + Math.floor(rng() * TILE);
    ctx.fillStyle = "#2a2d34"; // Сухой асфальт
    ctx.fillRect(noiseX, noiseY, 1, 1);
  }
  
  // Блики воды (2-3 белых пикселя с прозрачностью 30%)
  for (let i = 0; i < 2; i++) {
    if (rng() < 0.3) {
      const glareX = px + Math.floor(rng() * TILE);
      const glareY = py + Math.floor(rng() * TILE);
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.fillRect(glareX, glareY, 1, 1);
    }
  }
  
  // Определяем направление дороги
  const isHorizontal = isRoadHorizontal(map, tx, ty);
  const isVertical = isRoadVertical(map, tx, ty);
  
  // Разметка (ART.MD §4.2) - жёлто-белая, слегка стёртая
  if (isHorizontal && !isVertical) {
    // Горизонтальная дорога - прерывистая осевая линия
    ctx.fillStyle = "#f5e042"; // Toxic Yellow
    const lineY = py + TILE / 2 - 1;
    // Прерывистая линия: 4px линия / 4px пробел
    for (let x = 0; x < TILE; x += 8) {
      // Добавляем случайные пропажи для эффекта стёртости
      if (rng() > 0.1) {
        ctx.fillRect(px + x, lineY, 4, 2);
      }
    }
  } else if (isVertical && !isHorizontal) {
    // Вертикальная дорога - прерывистая осевая линия
    ctx.fillStyle = "#f5e042";
    const lineX = px + TILE / 2 - 1;
    for (let y = 0; y < TILE; y += 8) {
      if (rng() > 0.1) {
        ctx.fillRect(lineX, py + y, 2, 4);
      }
    }
  }
  
  // Границы дороги (ART.MD §4.2) - белые, не идеально яркие
  ctx.fillStyle = "#e0e0e0";
  
  if (!isRoadAt(map, tx, ty - 1)) {
    ctx.fillRect(px, py, TILE, 2); // Сплошная линия 2px
  }
  if (!isRoadAt(map, tx, ty + 1)) {
    ctx.fillRect(px, py + TILE - 2, TILE, 2);
  }
  if (!isRoadAt(map, tx - 1, ty)) {
    ctx.fillRect(px, py, 2, TILE);
  }
  if (!isRoadAt(map, tx + 1, ty)) {
    ctx.fillRect(px + TILE - 2, py, 2, TILE);
  }
  
  // Пешеходный переход (ART.MD §4.3) - зебра
  if (isCrosswalk(map, tx, ty)) {
    ctx.fillStyle = "#ffffff";
    if (isHorizontal) {
      // Горизонтальная зебра (полосы 2x8 px)
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
  
  // Люки на перекрёстках (ART.MD §4.3)
  if (isIntersection(map, tx, ty) && rng() < 0.1) {
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.arc(px + TILE / 2, py + TILE / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    // Решётка
    ctx.strokeStyle = "#1a1d24";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + TILE / 2 - 3, py + TILE / 2);
    ctx.lineTo(px + TILE / 2 + 3, py + TILE / 2);
    ctx.moveTo(px + TILE / 2, py + TILE / 2 - 3);
    ctx.lineTo(px + TILE / 2, py + TILE / 2 + 3);
    ctx.stroke();
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

// Проверка, является ли тайл перекрёстком
function isIntersection(map, tx, ty) {
  if (!isRoadAt(map, tx, ty)) return false;
  
  // Перекрёсток - дорога окружена дорогами со всех 4 сторон
  return isRoadAt(map, tx - 1, ty) && 
         isRoadAt(map, tx + 1, ty) && 
         isRoadAt(map, tx, ty - 1) && 
         isRoadAt(map, tx, ty + 1);
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



// ---------- отрисовка здания (ART.MD §6 - 2.5D эффект) ----------
function paintBuilding(ctx, map, tx, ty, px, py, rng) {
  const isHouse = (x, y) => {
    if (x < 0 || y < 0 || x >= map.size || y >= map.size) return false;
    return map.get(x, y) === T.HOUSE;
  };
  
  // Определяем края здания
  const isTopEdge = !isHouse(tx, ty - 1);
  const isBottomEdge = !isHouse(tx, ty + 1);
  const isLeftEdge = !isHouse(tx - 1, ty);
  const isRightEdge = !isHouse(tx + 1, ty);
  
  // Тень здания (ART.MD §6.1) - смещена на 4px вниз-вправо
  if (isTopEdge && isLeftEdge) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(px + 4, py + 4, TILE, TILE);
  }
  
  // Крыша (ART.MD §6.2) - бетонная плита
  ctx.fillStyle = "#3d3a38"; // Бетон старый
  ctx.fillRect(px, py, TILE, TILE);
  
  // Текстура крыши - шум и детали
  for (let i = 0; i < 3; i++) {
    const noiseX = px + Math.floor(rng() * TILE);
    const noiseY = py + Math.floor(rng() * TILE);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + rng() * 0.15})`;
    ctx.fillRect(noiseX, noiseY, 1, 1);
  }
  
  // Кондиционеры на крыше (ART.MD §6.2) - 30% шанс
  if (rng() < 0.3 && isTopEdge && isLeftEdge) {
    ctx.fillStyle = "#4a4a4a";
    const condX = px + 4 + Math.floor(rng() * 4);
    const condY = py + 4 + Math.floor(rng() * 4);
    ctx.fillRect(condX, condY, 4, 4);
    // Решётка
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(condX + 1, condY + 1, 2, 2);
  }
  
  // Антенны (ART.MD §6.2) - 20% шанс
  if (rng() < 0.2 && isTopEdge && isLeftEdge) {
    ctx.fillStyle = "#5c3a2a"; // Ржавчина
    const antennaX = px + 8 + Math.floor(rng() * 4);
    const antennaY = py + 2;
    ctx.fillRect(antennaX, antennaY, 1, 6);
    // Мигающий красный огонь (ART.MD §6.2)
    if (rng() < 0.5) {
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(antennaX, antennaY, 1, 1);
    }
  }
  
  // Стены (ART.MD §6.3) - видны сбоку, высота 8-12px
  const wallHeight = 10;
  const wallColor = "#2a2725"; // На 2 тона темнее крыши
  
  ctx.fillStyle = wallColor;
  
  // Нижняя стена
  if (isBottomEdge) {
    ctx.fillRect(px, py + TILE - wallHeight, TILE, wallHeight);
    
    // Окна на стене (ART.MD §6.3) - сетка 4x4, случайно
    const windowColors = ["#f5e042", "#05d9e8", "#1a1d24"]; // Жёлтый/циан/тёмный
    for (let wx = 2; wx < TILE - 4; wx += 6) {
      for (let wy = 2; wy < wallHeight - 2; wy += 6) {
        if (rng() < 0.7) { // 70% окон горят
          ctx.fillStyle = windowColors[Math.floor(rng() * windowColors.length)];
          ctx.fillRect(px + wx, py + TILE - wallHeight + wy, 4, 4);
        }
      }
    }
  }
  
  // Правая стена
  if (isRightEdge) {
    ctx.fillStyle = wallColor;
    ctx.fillRect(px + TILE - wallHeight, py, wallHeight, TILE);
    
    // Окна на правой стене
    const windowColors = ["#f5e042", "#05d9e8", "#1a1d24"];
    for (let wx = 2; wx < wallHeight - 2; wx += 6) {
      for (let wy = 2; wy < TILE - 4; wy += 6) {
        if (rng() < 0.7) {
          ctx.fillStyle = windowColors[Math.floor(rng() * windowColors.length)];
          ctx.fillRect(px + TILE - wallHeight + wx, py + wy, 4, 4);
        }
      }
    }
  }
  
  // Неоновая вывеска (ART.MD §6.4) - 15% шанс
  if (rng() < 0.15 && isBottomEdge && isLeftEdge) {
    const neonColors = ["#ff2a6d", "#05d9e8", "#f5e042"]; // Pink/Cyan/Yellow
    const neonColor = neonColors[Math.floor(rng() * neonColors.length)];
    
    // Вывеска 16x8 px
    const signX = px + 2;
    const signY = py + TILE - 14;
    
    // Свечение в 3 прохода (ART.MD §2.3)
    // 1. Гало (50% прозрачности)
    ctx.fillStyle = neonColor + "80"; // 50% alpha
    ctx.fillRect(signX - 2, signY - 2, 20, 12);
    
    // 2. Основной цвет
    ctx.fillStyle = neonColor;
    ctx.fillRect(signX, signY, 16, 8);
    
    // 3. Ядро (белый/светлый)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(signX + 2, signY + 2, 12, 4);
    
    // Псевдо-иероглифы (ART.MD §6.4)
    ctx.fillStyle = neonColor;
    for (let i = 0; i < 3; i++) {
      const charX = signX + 3 + i * 4;
      const charY = signY + 3;
      ctx.fillRect(charX, charY, 2, 2);
    }
  }
  
  // Бортики крыши (ART.MD §6.1) - по внешнему периметру
  ctx.fillStyle = "#1a1d24";
  const edgeSize = 2;
  
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
