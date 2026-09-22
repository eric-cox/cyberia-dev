// ============================================================
//  world/WorldGen.js — генерация города с WFC
// ============================================================

import { MAP_TILES, TILE } from "../core/Constants.js";
import { T } from "./tiles.js";
import { mulberry32 } from "../core/Rng.js";
import { WorldMap } from "./WorldMap.js";
import { CityGenerator } from "./CityGenerator.js";
import { 
  DEBRIS_TYPE, 
  SURFACE_TYPE,
  DEBRIS_DISTRIBUTION
} from "./streetTypes.js";

// ---------- Главная функция генерации ----------
export function generateWorld(seed) {
  console.time('Total world generation');
  const rng = mulberry32(seed);
  
  // ========== ЭТАП 1: Генерация города с WFC ==========
  console.time('CityGenerator');
  const cityGen = new CityGenerator(seed);
  const tiles = cityGen.generate();
  console.timeEnd('CityGenerator');
  
  console.time('WorldMap creation');
  const map = new WorldMap(seed, MAP_TILES, tiles);
  console.timeEnd('WorldMap creation');
  
  // Инициализация массивов для загрязнения и поверхностей
  map.debris = new Uint8Array(MAP_TILES * MAP_TILES);
  map.surface = new Uint8Array(MAP_TILES * MAP_TILES);

  // ========== ЭТАП 2: Постобработка ==========
  // TODO: Добавить тротуары, объединить здания, разместить ларьки
  
  // ========== ЭТАП 3: Генерация мусора и масла ==========
  console.time('Debris and oil generation');
  generateDebrisAndOil(map, rng);
  console.timeEnd('Debris and oil generation');

  // ========== ЭТАП 4: Финализация ==========
  console.time('Finalization');
  clearStartingZone(map);

  // Строим индекс проходимых ячеек
  map.buildBands();
  console.timeEnd('Finalization');
  
  console.timeEnd('Total world generation');

  return map;
}

// ---------- Генерация мусора и масла на дорогах ----------
function generateDebrisAndOil(map, rng) {
  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      const mapIdx = y * MAP_TILES + x;
      const tileType = map.tiles[mapIdx];
      
      // Мусор и масло только на дорогах
      if (tileType !== T.ROAD) {
        continue;
      }
      
      // Генерация мусора
      generateDebris(map, mapIdx, rng);
      
      // Генерация масла
      generateOil(map, mapIdx, rng);
    }
  }
}

// Генерация мусора на одном тайле
function generateDebris(map, mapIdx, rng) {
  const chance = 0.10; // 10% шанс для дорог
  if (rng() >= chance) return;
  
  const roll = rng();
  if (roll < DEBRIS_DISTRIBUTION.LIGHT) {
    map.debris[mapIdx] = DEBRIS_TYPE.LIGHT;
  } else if (roll < DEBRIS_DISTRIBUTION.MEDIUM) {
    map.debris[mapIdx] = DEBRIS_TYPE.MEDIUM;
  } else {
    map.debris[mapIdx] = DEBRIS_TYPE.HEAVY;
  }
}

// Генерация масла на одном тайле
function generateOil(map, mapIdx, rng) {
  const chance = 0.03; // 3% шанс для дорог
  if (rng() < chance) {
    map.surface[mapIdx] = SURFACE_TYPE.OIL;
  }
}

// Очистка стартовой зоны в центре карты
function clearStartingZone(map) {
  const center = MAP_TILES / 2;
  const radius = 3;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = center + dx;
      const ty = center + dy;
      
      if (tx < 0 || ty < 0 || tx >= MAP_TILES || ty >= MAP_TILES) continue;
      
      const idx = ty * MAP_TILES + tx;
      
      // Гарантируем дорогу в стартовой зоне
      if (map.tiles[idx] !== T.ROAD) {
        map.tiles[idx] = T.ROAD;
      }
      
      // Очищаем от мусора и масла
      map.debris[idx] = DEBRIS_TYPE.NONE;
      map.surface[idx] = SURFACE_TYPE.NORMAL;
    }
  }
}
