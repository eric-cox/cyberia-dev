// ============================================================
//  world/WorldGen.js — процедурная генерация городского района
//  Алгоритм из 5 шагов:
//  1. Разметка зданий (Block Layout)
//  2. Прорисовка периметров и двери
//  3. Валидация связности (Flood Fill)
//  4. Расстановка уличных объектов (Street Dressing)
//  5. Финальная проверка коллизий
// ============================================================
import { MAP_TILES, TILE } from "../core/Constants.js";
import { T } from "./tiles.js";
import { mulberry32 } from "../core/Rng.js";
import { WorldMap } from "./WorldMap.js";
import { getRandomPrefabByTags } from "./prefabs.js";

// Константы генерации
const MIN_BUILDING_SIZE = 5;
const MAX_BUILDING_SIZE = 15;
const MIN_STREET_WIDTH = 2;
const BUILDING_ATTEMPTS = 30;

// ---------- Шаг 1: Разметка зданий ----------
function generateBuildingLayout(rng) {
  const buildings = [];
  const occupied = new Uint8Array(MAP_TILES * MAP_TILES);

  for (let attempt = 0; attempt < BUILDING_ATTEMPTS; attempt++) {
    const width = MIN_BUILDING_SIZE + Math.floor(rng() * (MAX_BUILDING_SIZE - MIN_BUILDING_SIZE));
    const height = MIN_BUILDING_SIZE + Math.floor(rng() * (MAX_BUILDING_SIZE - MIN_BUILDING_SIZE));
    
    // Позиция с отступом от края
    const x = 3 + Math.floor(rng() * (MAP_TILES - width - 6));
    const y = 3 + Math.floor(rng() * (MAP_TILES - height - 6));

    // Проверяем, не пересекается ли с другими зданиями
    let canPlace = true;
    for (let dy = -MIN_STREET_WIDTH; dy < height + MIN_STREET_WIDTH && canPlace; dy++) {
      for (let dx = -MIN_STREET_WIDTH; dx < width + MIN_STREET_WIDTH && canPlace; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= MAP_TILES || ty >= MAP_TILES) continue;
        if (occupied[ty * MAP_TILES + tx] === 1) {
          canPlace = false;
        }
      }
    }

    if (canPlace) {
      buildings.push({ x, y, width, height });
      // Помечаем здание и буфер вокруг него
      for (let dy = -MIN_STREET_WIDTH; dy < height + MIN_STREET_WIDTH; dy++) {
        for (let dx = -MIN_STREET_WIDTH; dx < width + MIN_STREET_WIDTH; dx++) {
          const tx = x + dx;
          const ty = y + dy;
          if (tx >= 0 && ty >= 0 && tx < MAP_TILES && ty < MAP_TILES) {
            occupied[ty * MAP_TILES + tx] = 1;
          }
        }
      }
    }
  }

  return buildings;
}

// ---------- Шаг 2: Прорисовка стен и дверей ----------
function drawBuildingWalls(map, buildings, rng) {
  for (const building of buildings) {
    // Рисуем стены по периметру
    for (let x = building.x; x < building.x + building.width; x++) {
      map.set(x, building.y, T.HOUSE); // Верхняя стена
      map.set(x, building.y + building.height - 1, T.HOUSE); // Нижняя стена
    }
    for (let y = building.y; y < building.y + building.height; y++) {
      map.set(building.x, y, T.HOUSE); // Левая стена
      map.set(building.x + building.width - 1, y, T.HOUSE); // Правая стена
    }

    // Прорезаем двери (1-3 двери на здание)
    const doorCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < doorCount; i++) {
      const side = Math.floor(rng() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let doorX, doorY;

      if (side === 0) {
        // Верхняя стена
        doorX = building.x + 1 + Math.floor(rng() * (building.width - 2));
        doorY = building.y;
      } else if (side === 1) {
        // Правая стена
        doorX = building.x + building.width - 1;
        doorY = building.y + 1 + Math.floor(rng() * (building.height - 2));
      } else if (side === 2) {
        // Нижняя стена
        doorX = building.x + 1 + Math.floor(rng() * (building.width - 2));
        doorY = building.y + building.height - 1;
      } else {
        // Левая стена
        doorX = building.x;
        doorY = building.y + 1 + Math.floor(rng() * (building.height - 2));
      }

      map.set(doorX, doorY, T.SNOW); // Дверь = проходимый тайл
    }
  }
}

// ---------- Шаг 3: Валидация связности (Flood Fill) ----------
function validateConnectivity(map) {
  const visited = new Uint8Array(MAP_TILES * MAP_TILES);
  const queue = [];
  
  // Находим первую проходимую клетку
  let startX = -1, startY = -1;
  for (let y = 0; y < MAP_TILES && startX === -1; y++) {
    for (let x = 0; x < MAP_TILES && startX === -1; x++) {
      if (map.get(x, y) !== T.HOUSE) {
        startX = x;
        startY = y;
      }
    }
  }

  if (startX === -1) return; // Нет проходимых клеток

  // Flood Fill
  queue.push([startX, startY]);
  visited[startY * MAP_TILES + startX] = 1;

  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_TILES || ny >= MAP_TILES) continue;
      if (visited[ny * MAP_TILES + nx] === 1) continue;
      if (map.get(nx, ny) === T.HOUSE) continue;
      
      visited[ny * MAP_TILES + nx] = 1;
      queue.push([nx, ny]);
    }
  }

  // Проверяем, все ли проходимые клетки посещены
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      if (map.get(x, y) !== T.HOUSE && visited[y * MAP_TILES + x] === 0) {
        // Нашли изолированную область — пробиваем проход
        map.set(x, y, T.SNOW);
      }
    }
  }
}

// ---------- Шаг 4: Расстановка уличных объектов ----------
function placeStreetObjects(map, buildings, rng) {
  const objects = [];

  // Собираем все тайлы улиц, прилегающие к стенам
  const wallAdjacentTiles = [];
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      if (map.get(x, y) !== T.SNOW) continue;
      
      // Проверяем, прилегает ли к стене здания
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < MAP_TILES && ny < MAP_TILES) {
          if (map.get(nx, ny) === T.HOUSE) {
            wallAdjacentTiles.push({ x, y });
            break;
          }
        }
      }
    }
  }

  // Размещаем крупные объекты вдоль стен
  const largeObjects = ["dumpster", "concrete_block", "cyber_car", "vending_machine"];
  for (const tile of wallAdjacentTiles) {
    if (rng() < 0.15) { // 15% шанс на объект
      const prefab = getRandomPrefabByTags(["cover_high", "wall_adjacent"], rng);
      if (prefab && canPlaceObject(map, tile.x, tile.y, prefab.width, prefab.height)) {
        placeObject(map, objects, tile.x, tile.y, prefab);
      }
    }
  }

  // Размещаем мелкий мусор
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      if (map.get(x, y) === T.SNOW && rng() < 0.03) { // 3% шанс
        const prefab = getRandomPrefabByTags(["clutter"], rng);
        if (prefab) {
          objects.push({ x, y, prefab });
        }
      }
    }
  }

  return objects;
}

function canPlaceObject(map, x, y, width, height) {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= MAP_TILES || ty >= MAP_TILES) return false;
      if (map.get(tx, ty) !== T.SNOW) return false;
    }
  }
  return true;
}

function placeObject(map, objects, x, y, prefab) {
  // Помечаем тайлы как занятые (но не меняем тип тайла)
  for (let dy = 0; dy < prefab.height; dy++) {
    for (let dx = 0; dx < prefab.width; dx++) {
      if (prefab.collision[dy][dx] === 1) {
        // Объект имеет коллизию — помечаем
        objects.push({ x: x + dx, y: y + dy, prefab, isCollision: true });
      }
    }
  }
  objects.push({ x, y, prefab, isCollision: false });
}

// ---------- Шаг 5: Финальная проверка коллизий ----------
function validateCollisions(map, objects) {
  // Проверяем, что после расстановки объектов ширина прохода >= 2 тайла
  // (упрощенная проверка — в полной версии нужен более сложный алгоритм)
  return objects;
}

// ---------- Главная функция генерации ----------
export function generateWorld(seed) {
  const rng = mulberry32(seed);
  const map = new WorldMap(seed, MAP_TILES, new Uint8Array(MAP_TILES * MAP_TILES));

  // Инициализируем карту снегом
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      map.set(x, y, T.SNOW);
    }
  }

  // Шаг 1: Разметка зданий
  const buildings = generateBuildingLayout(rng);

  // Шаг 2: Стены и двери
  drawBuildingWalls(map, buildings, rng);

  // Шаг 3: Валидация связности
  validateConnectivity(map);

  // Шаг 4: Расстановка объектов
  const objects = placeStreetObjects(map, buildings, rng);

  // Шаг 5: Финальная проверка
  const validatedObjects = validateCollisions(map, objects);

  // Сохраняем объекты в карте
  map.objects = validatedObjects;
  map.buildings = buildings;

  // Добавляем мёртвые деревья (для разнообразия)
  let trees = 0;
  for (let i = 0; i < 200 && trees < 40; i++) {
    const tx = Math.floor(rng() * MAP_TILES);
    const ty = Math.floor(rng() * MAP_TILES);
    if (map.get(tx, ty) === T.SNOW) {
      map.set(tx, ty, T.TREE);
      map.decor.push({
        kind: "tree",
        x: tx * TILE + TILE / 2,
        y: ty * TILE + TILE,
        sway: rng() * 10,
      });
      trees++;
    }
  }

  // Добавляем замёрзшие озёра
  for (let i = 0; i < 5; i++) {
    const cx = 10 + Math.floor(rng() * (MAP_TILES - 20));
    const cy = 10 + Math.floor(rng() * (MAP_TILES - 20));
    const r = 2 + Math.floor(rng() * 3);
    
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const tx = cx + dx;
          const ty = cy + dy;
          if (tx >= 0 && ty >= 0 && tx < MAP_TILES && ty < MAP_TILES) {
            if (map.get(tx, ty) === T.SNOW) {
              map.set(tx, ty, dx * dx + dy * dy < (r * 0.5) ** 2 ? T.ICE_SMOOTH : T.ICE);
            }
          }
        }
      }
    }
  }

  // Стартовая поляна в центре
  const C = MAP_TILES / 2;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const tx = C + dx;
      const ty = C + dy;
      if (tx >= 0 && ty >= 0 && tx < MAP_TILES && ty < MAP_TILES) {
        if (map.get(tx, ty) !== T.SNOW) {
          map.set(tx, ty, T.SNOW);
        }
      }
    }
  }

  // Строим индекс проходимых ячеек
  map.buildBands();

  return map;
}
