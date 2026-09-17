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

const SNOW_BASE = ["#dfe9f5", "#cddcf0", "#b3c6e0"];
const SNOW_SPECK = ["#c9d8ec", "#b9cbe4", "#9fb3d1"];
const SNOW_HI = ["#ffffff", "#e6f0fb", "#d2e1f4"];

export function paintTerrain(map) {
  const cv = document.createElement("canvas");
  cv.width = map.widthPx;
  cv.height = map.heightPx;
  const ctx = cv.getContext("2d");
  const rng = mulberry32((map.seed ^ 0x5eedbeef) >>> 0);

  for (let ty = 0; ty < map.size; ty++)
    for (let tx = 0; tx < map.size; tx++) {
      const t = map.get(tx, ty);
      const px = tx * TILE;
      const py = ty * TILE;

      if (t === T.ICE || t === T.ICE_SMOOTH) {
        paintIce(ctx, map, tx, ty, px, py, t === T.ICE_SMOOTH, rng);
      } else {
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
        // отрисовка дома с окнами и неоновыми вывесками
        paintHouse(ctx, map, tx, ty, px, py, rng);
      } else if (t === T.TREE) {
        // тень дерева (крона рисуется спрайтом в проходе сущностей)
        ctx.fillStyle = "rgba(10,15,30,0.32)";
        ctx.fillRect(px + 2, py + 9, 12, 5);
        ctx.fillStyle = "rgba(10,15,30,0.18)";
        ctx.fillRect(px + 4, py + 7, 8, 2);
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

// ---------- отрисовка дома с окнами и неоновыми вывесками ----------
function paintHouse(ctx, map, tx, ty, px, py, rng) {
  const house = map.houseAt(tx, ty);
  if (!house) return;
  
  // Специальная обработка для стены по периметру
  if (house.isWall) {
    paintWall(ctx, map, tx, ty, px, py);
    return;
  }
  
  const { height, windows, hasSign, signType, signColor, buildingWidth, buildingDepth } = house;
  
  // Определяем позицию этого тайла внутри здания
  // Находим верхний левый угол здания
  let buildingStartX = tx;
  let buildingStartY = ty;
  
  // Ищем начало здания, двигаясь влево и вверх
  while (buildingStartX > 0 && map.houseAt(buildingStartX - 1, ty)?.buildingWidth === buildingWidth) {
    buildingStartX--;
  }
  while (buildingStartY > 0 && map.houseAt(tx, buildingStartY - 1)?.buildingDepth === buildingDepth) {
    buildingStartY--;
  }
  
  const localX = tx - buildingStartX;
  const localY = ty - buildingStartY;
  
  // Базовый цвет здания (тёмно-серый с вариациями)
  const baseColor = rng() < 0.5 ? "#2a3444" : "#323e4f";
  const darkColor = "#1a2028";
  const lightColor = "#3d4d6b";
  
  // Основание здания
  ctx.fillStyle = baseColor;
  ctx.fillRect(px, py, TILE, TILE);
  
  // Тень слева (если это левая граница здания)
  if (localX === 0) {
    ctx.fillStyle = darkColor;
    ctx.fillRect(px, py, 2, TILE);
  }
  
  // Свет справа (если это правая граница здания)
  if (localX === buildingWidth - 1) {
    ctx.fillStyle = lightColor;
    ctx.fillRect(px + TILE - 2, py, 2, TILE);
  }
  
  // Крыша (тёмная полоса сверху)
  if (localY === 0) {
    ctx.fillStyle = darkColor;
    ctx.fillRect(px, py, TILE, 3);
    // Снег на крыше
    ctx.fillStyle = "#dfe9f5";
    ctx.fillRect(px + 1, py, TILE - 2, 1);
  }
  
  // Окна (рисуем только на фасадах - верхняя и нижняя границы здания)
  if (localY === 0 || localY === buildingDepth - 1) {
    const windowHeight = Math.floor(TILE / (height + 1));
    const windowWidth = 3;
    const windowSpacing = Math.floor(TILE / 3);
    
    for (let floor = 0; floor < height; floor++) {
      for (let w = 0; w < 2; w++) {
        const windowIndex = floor * 2 + w;
        const isLit = windows[windowIndex];
        const wx = px + windowSpacing * (w + 0.5) - windowWidth / 2;
        const wy = py + 4 + floor * windowHeight;
        
        if (isLit) {
          // Горящее окно (тёплый жёлтый свет)
          ctx.fillStyle = "#ffb347";
          ctx.fillRect(wx, wy, windowWidth, windowHeight - 2);
          // Свечение вокруг окна
          ctx.fillStyle = "rgba(255, 179, 71, 0.3)";
          ctx.fillRect(wx - 1, wy - 1, windowWidth + 2, windowHeight);
        } else {
          // Тёмное окно
          ctx.fillStyle = "#0a0f1e";
          ctx.fillRect(wx, wy, windowWidth, windowHeight - 2);
        }
      }
    }
  }
  
  // Неоновая вывеска (если есть и это первый тайл здания)
  if (hasSign && signType && localX === 0 && localY === 0) {
    const signY = py + TILE - 6;
    const signX = px + 2;
    const signWidth = TILE * buildingWidth - 4;
    const signHeight = 4;
    
    // Фон вывески (тёмный)
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(signX, signY, signWidth, signHeight);
    
    // Неоновый текст/символ
    ctx.fillStyle = signColor;
    drawSignSymbol(ctx, signType, signX + 1, signY + 1, signWidth - 2, signHeight - 2);
    
    // Свечение вокруг вывески
    ctx.fillStyle = signColor + "40"; // 25% прозрачности
    ctx.fillRect(signX - 1, signY - 1, signWidth + 2, signHeight + 2);
  }
}

// ---------- отрисовка стены по периметру ----------
function paintWall(ctx, map, tx, ty, px, py) {
  // Стена — сплошная тёмная граница
  const wallColor = "#1a2028";
  const wallHighlight = "#2a3444";
  
  // Основание стены
  ctx.fillStyle = wallColor;
  ctx.fillRect(px, py, TILE, TILE);
  
  // Текстура стены (вертикальные линии)
  ctx.fillStyle = wallHighlight;
  for (let i = 0; i < 3; i++) {
    const x = px + 4 + i * 4;
    ctx.fillRect(x, py + 2, 1, TILE - 4);
  }
  
  // Верхняя кромка стены (если это верхняя граница)
  if (ty === 0 || ty === 1 || ty === 2) {
    ctx.fillStyle = "#3d4d6b";
    ctx.fillRect(px, py, TILE, 2);
  }
  
  // Нижняя кромка стены (если это нижняя граница)
  if (ty >= map.size - 3) {
    ctx.fillStyle = "#3d4d6b";
    ctx.fillRect(px, py + TILE - 2, TILE, 2);
  }
  
  // Левая кромка стены (если это левая граница)
  if (tx === 0 || tx === 1 || tx === 2) {
    ctx.fillStyle = "#3d4d6b";
    ctx.fillRect(px, py, 2, TILE);
  }
  
  // Правая кромка стены (если это правая граница)
  if (tx >= map.size - 3) {
    ctx.fillStyle = "#3d4d6b";
    ctx.fillRect(px + TILE - 2, py, 2, TILE);
  }
}

// ---------- отрисовка символа неоновой вывески ----------
function drawSignSymbol(ctx, type, x, y, w, h) {
  switch (type) {
    case "bar":
      // Символ бокала
      ctx.fillRect(x + w / 2 - 1, y, 2, h);
      ctx.fillRect(x + w / 2 - 2, y + h - 1, 4, 1);
      break;
    case "shop":
      // Символ корзины
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      break;
    case "hotel":
      // Символ "H"
      ctx.fillRect(x + 1, y, 1, h);
      ctx.fillRect(x + w - 2, y, 1, h);
      ctx.fillRect(x + 1, y + h / 2, w - 2, 1);
      break;
    case "clinic":
      // Символ креста
      ctx.fillRect(x + w / 2 - 1, y, 2, h);
      ctx.fillRect(x, y + h / 2 - 1, w, 2);
      break;
    case "casino":
      // Символ игральной кости (точки)
      ctx.fillRect(x + 1, y + 1, 1, 1);
      ctx.fillRect(x + w - 2, y + 1, 1, 1);
      ctx.fillRect(x + w / 2, y + h / 2, 1, 1);
      ctx.fillRect(x + 1, y + h - 2, 1, 1);
      ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
      break;
    case "neon":
      // Абстрактный неоновый символ
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x, y + h - 1, w, 1);
      ctx.fillRect(x + w / 2 - 1, y, 2, h);
      break;
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
    [T.TREE]: "#5a718f",
  };
  for (let ty = 0; ty < map.size; ty++)
    for (let tx = 0; tx < map.size; tx++) {
      ctx.fillStyle = colors[map.get(tx, ty)] || "#05080f";
      ctx.fillRect(tx, ty, 1, 1);
    }
  return cv;
}
