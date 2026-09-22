// ============================================================
//  world/CityGenerator.js — генерация города с WFC
//  Wave Function Collapse для процедурной генерации
// ============================================================

import { MAP_TILES } from "../core/Constants.js";
import { T } from "./tiles.js";
import { mulberry32 } from "../core/Rng.js";

// Типы тайлов для WFC
export const TILE_TYPES = {
  WALL: 0,      // Стена (ограждение)
  ROAD: 1,      // Дорога
  SIDEWALK: 2,  // Тротуар
  HOUSE: 3,     // Дом
  STALL: 4,     // Ларёк
};

// Соседи для каждого типа тайла
// Формат: { direction: [allowed_neighbors] }
// direction: 0=top, 1=right, 2=bottom, 3=left
const TILE_RULES = {
  [TILE_TYPES.WALL]: {
    neighbors: {
      0: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK],
      1: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK],
      2: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK],
      3: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK],
    }
  },
  [TILE_TYPES.ROAD]: {
    neighbors: {
      0: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL],
      1: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL],
      2: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL],
      3: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL],
    }
  },
  [TILE_TYPES.SIDEWALK]: {
    neighbors: {
      0: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.HOUSE, TILE_TYPES.STALL, TILE_TYPES.WALL],
      1: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.HOUSE, TILE_TYPES.STALL, TILE_TYPES.WALL],
      2: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.HOUSE, TILE_TYPES.STALL, TILE_TYPES.WALL],
      3: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.HOUSE, TILE_TYPES.STALL, TILE_TYPES.WALL],
    }
  },
  [TILE_TYPES.HOUSE]: {
    neighbors: {
      0: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK],
      1: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK],
      2: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK],
      3: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK],
    }
  },
  [TILE_TYPES.STALL]: {
    neighbors: {
      0: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK],
      1: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK],
      2: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK],
      3: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK],
    }
  },
};

export class CityGenerator {
  constructor(seed) {
    this.rng = mulberry32(seed);
    this.size = MAP_TILES;
    
    // WFC состояние
    this.cells = new Array(this.size * this.size);
    this.initCells();
  }
  
  initCells() {
    // Инициализация: каждая ячейка может быть любым типом
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = {
        possibilities: [
          TILE_TYPES.WALL,
          TILE_TYPES.ROAD,
          TILE_TYPES.SIDEWALK,
          TILE_TYPES.HOUSE,
          TILE_TYPES.STALL,
        ],
        collapsed: false,
      };
    }
    
    // Предзаполнение: стена по краям карты
    this.preFillBorders();
  }
  
  // Предзаполнение границы стены
  preFillBorders() {
    for (let x = 0; x < this.size; x++) {
      // Верхняя граница
      this.collapseCellTo(x, 0, TILE_TYPES.WALL);
      // Нижняя граница
      this.collapseCellTo(x, this.size - 1, TILE_TYPES.WALL);
    }
    
    for (let y = 0; y < this.size; y++) {
      // Левая граница
      this.collapseCellTo(0, y, TILE_TYPES.WALL);
      // Правая граница
      this.collapseCellTo(this.size - 1, y, TILE_TYPES.WALL);
    }
  }
  
  // Принудительно свернуть ячейку к определённому типу
  collapseCellTo(x, y, type) {
    const cell = this.cells[this.idx(x, y)];
    cell.possibilities = [type];
    cell.collapsed = true;
  }
  
  idx(x, y) {
    return y * this.size + x;
  }
  
  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }
  
  // Получить соседей ячейки
  getNeighbors(x, y) {
    const neighbors = {
      0: null, // top
      1: null, // right
      2: null, // bottom
      3: null, // left
    };
    
    if (this.inBounds(x, y - 1)) neighbors[0] = this.cells[this.idx(x, y - 1)];
    if (this.inBounds(x + 1, y)) neighbors[1] = this.cells[this.idx(x + 1, y)];
    if (this.inBounds(x, y + 1)) neighbors[2] = this.cells[this.idx(x, y + 1)];
    if (this.inBounds(x - 1, y)) neighbors[3] = this.cells[this.idx(x - 1, y)];
    
    return neighbors;
  }
  
  // Вычислить энтропию ячейки (количество возможных состояний)
  entropy(x, y) {
    const cell = this.cells[this.idx(x, y)];
    if (cell.collapsed) return Infinity;
    return cell.possibilities.length;
  }
  
  // Найти ячейку с минимальной энтропией
  findLowestEntropyCell() {
    let minEntropy = Infinity;
    let candidates = [];
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const entropy = this.entropy(x, y);
        if (entropy === 0) continue;
        
        if (entropy < minEntropy) {
          minEntropy = entropy;
          candidates = [{ x, y }];
        } else if (entropy === minEntropy) {
          candidates.push({ x, y });
        }
      }
    }
    
    if (candidates.length === 0) return null;
    
    // Случайный выбор среди ячеек с минимальной энтропией
    return candidates[Math.floor(this.rng() * candidates.length)];
  }
  
  // Свернуть ячейку к одному состоянию
  collapseCell(x, y) {
    const cell = this.cells[this.idx(x, y)];
    if (cell.collapsed || cell.possibilities.length === 0) return;
    
    // Случайный выбор из возможных состояний
    const choice = cell.possibilities[Math.floor(this.rng() * cell.possibilities.length)];
    cell.possibilities = [choice];
    cell.collapsed = true;
  }
  
  // Обновить возможности соседей после сворачивания ячейки
  propagate(x, y) {
    const stack = [{ x, y }];
    const visited = new Set();
    
    while (stack.length > 0) {
      const { x: cx, y: cy } = stack.pop();
      const key = `${cx},${cy}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      const cell = this.cells[this.idx(cx, cy)];
      if (!cell.collapsed) continue;
      
      const collapsedType = cell.possibilities[0];
      const rules = TILE_RULES[collapsedType];
      const neighbors = this.getNeighbors(cx, cy);
      
      // Для каждого направления
      for (let dir = 0; dir < 4; dir++) {
        const neighbor = neighbors[dir];
        if (!neighbor || neighbor.collapsed) continue;
        
        // Противоположное направление
        const oppositeDir = (dir + 2) % 4;
        const allowedTypes = rules.neighbors[oppositeDir];
        
        // Удалить запрещённые типы из возможностей соседа
        const beforeCount = neighbor.possibilities.length;
        neighbor.possibilities = neighbor.possibilities.filter(t => allowedTypes.includes(t));
        
        // Если возможности изменились, добавить в стек для обработки
        if (neighbor.possibilities.length < beforeCount) {
          const nx = cx + (dir === 1 ? 1 : dir === 3 ? -1 : 0);
          const ny = cy + (dir === 2 ? 1 : dir === 0 ? -1 : 0);
          stack.push({ x: nx, y: ny });
          
          // Если возможностей не осталось - противоречие
          if (neighbor.possibilities.length === 0) {
            console.warn(`Contradiction at (${nx}, ${ny})`);
          }
        }
      }
    }
  }
  
  // Генерация дорожной сети (до WFC)
  generateRoadNetwork() {
    // Параметры дорог
    const ROAD_WIDTH_MIN = 2;
    const ROAD_WIDTH_MAX = 6;
    const ROAD_SPACING = 12; // Минимум между параллельными дорогами
    
    // Генерируем горизонтальные дороги
    const horizontalRoads = [];
    let y = 3 + Math.floor(this.rng() * 5); // Начальная позиция
    
    while (y < this.size - 3) {
      const width = ROAD_WIDTH_MIN + Math.floor(this.rng() * (ROAD_WIDTH_MAX - ROAD_WIDTH_MIN + 1));
      
      // Размещаем дорогу
      for (let dy = 0; dy < width; dy++) {
        for (let x = 1; x < this.size - 1; x++) { // Не трогаем границы
          this.collapseCellTo(x, y + dy, TILE_TYPES.ROAD);
        }
      }
      
      horizontalRoads.push({ y, width });
      y += width + ROAD_SPACING + Math.floor(this.rng() * 5); // Следующая дорога
    }
    
    // Генерируем вертикальные дороги
    const verticalRoads = [];
    let x = 3 + Math.floor(this.rng() * 5);
    
    while (x < this.size - 3) {
      const width = ROAD_WIDTH_MIN + Math.floor(this.rng() * (ROAD_WIDTH_MAX - ROAD_WIDTH_MIN + 1));
      
      // Размещаем дорогу
      for (let dx = 0; dx < width; dx++) {
        for (let y = 1; y < this.size - 1; y++) {
          this.collapseCellTo(x + dx, y, TILE_TYPES.ROAD);
        }
      }
      
      verticalRoads.push({ x, width });
      x += width + ROAD_SPACING + Math.floor(this.rng() * 5);
    }
    
    return { horizontalRoads, verticalRoads };
  }
  
  // Основной цикл WFC
  generate() {
    // Этап 1: Генерация дорожной сети
    this.generateRoadNetwork();
    
    // Этап 2: WFC для заполнения остального пространства
    let iterations = 0;
    const maxIterations = this.size * this.size * 10;
    
    while (iterations < maxIterations) {
      // Найти ячейку с минимальной энтропией
      const cell = this.findLowestEntropyCell();
      if (!cell) break; // Все ячейки свернуты
      
      // Свернуть ячейку
      this.collapseCell(cell.x, cell.y);
      
      // Распространить ограничения
      this.propagate(cell.x, cell.y);
      
      iterations++;
    }
    
    return this.toTileMap();
  }
  
  // Преобразовать результат в тайловую карту
  toTileMap() {
    const tiles = new Uint8Array(this.size * this.size);
    
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.collapsed && cell.possibilities.length > 0) {
        const wfcType = cell.possibilities[0];
        
        // Преобразовать WFC типы в игровые типы
        switch (wfcType) {
          case TILE_TYPES.WALL:
            tiles[i] = T.HOUSE; // Стена = непроходимый объект
            break;
          case TILE_TYPES.ROAD:
            tiles[i] = T.ROAD;
            break;
          case TILE_TYPES.SIDEWALK:
            tiles[i] = T.ROAD; // Тротуар тоже проходимый
            break;
          case TILE_TYPES.HOUSE:
            tiles[i] = T.HOUSE;
            break;
          case TILE_TYPES.STALL:
            tiles[i] = T.HOUSE; // Ларёк тоже непроходимый
            break;
          default:
            tiles[i] = T.ROAD;
        }
      } else {
        tiles[i] = T.ROAD; // По умолчанию дорога
      }
    }
    
    return tiles;
  }
}
