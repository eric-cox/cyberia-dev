// ============================================================
//  world/WorldGen.js — процедурная генерация городского района
//  Интегрированная система: уличная сеть + здания + объекты
// ============================================================

import { MAP_TILES, TILE } from "../core/Constants.js";
import { T } from "./tiles.js";
import { mulberry32 } from "../core/Rng.js";
import { WorldMap } from "./WorldMap.js";
import { StreetNetwork } from "./streetNetwork.js";
import { STREET_TYPE } from "./streetTypes.js";
import { getRandomPrefabByTags } from "./prefabs.js";

// ---------- Главная функция генерации ----------
export function generateWorld(seed) {
  const rng = mulberry32(seed);
  const map = new WorldMap(seed, MAP_TILES, new Uint8Array(MAP_TILES * MAP_TILES));

  // ========== ЭТАП 1: Генерация уличной сети ==========
  const streetNetwork = new StreetNetwork(rng);
  streetNetwork.generate();

  // ========== ЭТАП 2: Конвертация уличной сети в тайлы карты ==========
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      const streetIdx = y * MAP_TILES + x;
      const streetType = streetNetwork.streetType[streetIdx];
      const mapIdx = y * MAP_TILES + x;

      // Конвертируем типы улиц в типы тайлов карты
      if (streetType === STREET_TYPE.ROADWAY || 
          streetType === STREET_TYPE.SIDEWALK || 
          streetType === STREET_TYPE.PLAZA) {
        // Улица — это снег (проходимая поверхность)
        map.tiles[mapIdx] = T.SNOW;
      } else if (streetType === STREET_TYPE.BUILDING) {
        // Зона застройки — будет заполнена зданиями
        map.tiles[mapIdx] = T.HOUSE;
      } else {
        // По умолчанию — снег
        map.tiles[mapIdx] = T.SNOW;
      }
    }
  }

  // ========== ЭТАП 3: Генерация зданий в зонах застройки ==========
  generateBuildings(map, streetNetwork, rng);

  // ========== ЭТАП 4: Расстановка уличных объектов ==========
  const streetObjects = placeStreetObjects(map, streetNetwork, rng);
  map.objects = streetObjects;

  // ========== ЭТАП 5: Добавление деталей ==========
  addStreetDetails(map, streetNetwork, rng);

  // ========== ЭТАП 6: Финализация ==========
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

  // Сохраняем данные уличной сети в карте
  map.streetNetwork = streetNetwork;

  // Строим индекс проходимых ячеек
  map.buildBands();

  return map;
}

// ---------- Генерация зданий ----------
function generateBuildings(map, streetNetwork, rng) {
  // Находим зоны застройки и создаём здания
  const buildingZones = findBuildingZones(streetNetwork);
  
  for (const zone of buildingZones) {
    // Создаём здание в зоне
    const height = 1 + Math.floor(rng() * 3); // 1-3 этажа
    const hasSign = rng() < 0.4; // 40% шанс вывески
    
    for (let y = zone.y; y < zone.y + zone.height; y++) {
      for (let x = zone.x; x < zone.x + zone.width; x++) {
        const idx = y * MAP_TILES + x;
        
        // Только периметр здания — стена
        const isPerimeter = x === zone.x || x === zone.x + zone.width - 1 ||
                           y === zone.y || y === zone.y + zone.height - 1;
        
        if (isPerimeter) {
          map.tiles[idx] = T.HOUSE;
          
          // Метаданные здания
          const windows = [];
          for (let w = 0; w < height * 2; w++) {
            windows.push(rng() < 0.4); // 40% окон горят
          }
          
          map.houseData.set(`${x},${y}`, {
            height,
            windows,
            hasSign: hasSign && x === zone.x && y === zone.y,
            signType: hasSign ? ["bar", "shop", "hotel"][Math.floor(rng() * 3)] : null,
            signColor: ["#ff4757", "#6fd6ff", "#ffb347"][Math.floor(rng() * 3)],
            buildingWidth: zone.width,
            buildingDepth: zone.height,
          });
        } else {
          // Внутренность здания — тоже стена (непроходимая)
          map.tiles[idx] = T.HOUSE;
        }
      }
    }
    
    // Добавляем двери (1-3 на здание)
    const doorCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < doorCount; i++) {
      const side = Math.floor(rng() * 4); // 0=top, 1=right, 2=bottom, 3=left
      let doorX, doorY;
      
      if (side === 0) {
        doorX = zone.x + 1 + Math.floor(rng() * (zone.width - 2));
        doorY = zone.y;
      } else if (side === 1) {
        doorX = zone.x + zone.width - 1;
        doorY = zone.y + 1 + Math.floor(rng() * (zone.height - 2));
      } else if (side === 2) {
        doorX = zone.x + 1 + Math.floor(rng() * (zone.width - 2));
        doorY = zone.y + zone.height - 1;
      } else {
        doorX = zone.x;
        doorY = zone.y + 1 + Math.floor(rng() * (zone.height - 2));
      }
      
      map.set(doorX, doorY, T.SNOW); // Дверь = проходимый тайл
    }
  }
}

// ---------- Поиск зон застройки ----------
function findBuildingZones(streetNetwork) {
  const zones = [];
  const visited = new Uint8Array(MAP_TILES * MAP_TILES);
  
  // Находим связные области BUILDING_ZONE
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      const idx = y * MAP_TILES + x;
      
      if (streetNetwork.streetType[idx] === STREET_TYPE.BUILDING && !visited[idx]) {
        // Flood Fill для нахождения зоны
        const zone = floodFillBuildingZone(x, y, streetNetwork, visited);
        
        // Фильтруем слишком маленькие зоны
        if (zone.width >= 3 && zone.height >= 3) {
          zones.push(zone);
        }
      }
    }
  }
  
  return zones;
}

function floodFillBuildingZone(startX, startY, streetNetwork, visited) {
  const queue = [[startX, startY]];
  visited[startY * MAP_TILES + startX] = 1;
  
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;
  
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx < 0 || ny < 0 || nx >= MAP_TILES || ny >= MAP_TILES) continue;
      
      const idx = ny * MAP_TILES + nx;
      if (visited[idx]) continue;
      
      if (streetNetwork.streetType[idx] === STREET_TYPE.BUILDING) {
        visited[idx] = 1;
        queue.push([nx, ny]);
      }
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

// ---------- Расстановка уличных объектов ----------
function placeStreetObjects(map, streetNetwork, rng) {
  const objects = [];
  
  // Собираем тайлы улиц, прилегающие к зданиям
  const wallAdjacentTiles = [];
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      const streetIdx = y * MAP_TILES + x;
      const streetType = streetNetwork.streetType[streetIdx];
      
      if (streetType !== STREET_TYPE.ROADWAY && streetType !== STREET_TYPE.SIDEWALK) continue;
      
      // Проверяем, прилегает ли к зданию
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < MAP_TILES && ny < MAP_TILES) {
          const neighborIdx = ny * MAP_TILES + nx;
          if (streetNetwork.streetType[neighborIdx] === STREET_TYPE.BUILDING) {
            wallAdjacentTiles.push({ x, y });
            break;
          }
        }
      }
    }
  }
  
  // Размещаем крупные объекты вдоль стен
  for (const tile of wallAdjacentTiles) {
    if (rng() < 0.15) { // 15% шанс на объект
      const prefab = getRandomPrefabByTags(["cover_high", "wall_adjacent"], rng);
      if (prefab && canPlaceObject(map, tile.x, tile.y, prefab.width, prefab.height)) {
        placeObject(objects, tile.x, tile.y, prefab);
      }
    }
  }
  
  // Размещаем мелкий мусор
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      const streetIdx = y * MAP_TILES + x;
      const streetType = streetNetwork.streetType[streetIdx];
      
      if ((streetType === STREET_TYPE.ROADWAY || streetType === STREET_TYPE.SIDEWALK) && rng() < 0.03) {
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

function placeObject(objects, x, y, prefab) {
  objects.push({ x, y, prefab });
}

// ---------- Добавление деталей улиц ----------
function addStreetDetails(map, streetNetwork, rng) {
  // Добавляем люки, лужи, трещины на основе данных streetNetwork
  for (const manhole of streetNetwork.manholes) {
    map.decor.push({
      kind: "manhole",
      x: manhole.x * TILE + TILE / 2,
      y: manhole.y * TILE + TILE / 2,
    });
  }
  
  for (const puddle of streetNetwork.puddles) {
    map.decor.push({
      kind: "puddle",
      x: puddle.x * TILE + TILE / 2,
      y: puddle.y * TILE + TILE / 2,
      size: puddle.size,
    });
  }
}
