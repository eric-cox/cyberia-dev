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
// Упрощённые правила для избежания противоречий
const TILE_RULES = {
  [TILE_TYPES.WALL]: {
    neighbors: {
      0: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      1: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      2: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      3: [TILE_TYPES.WALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
    }
  },
  [TILE_TYPES.ROAD]: {
    neighbors: {
      0: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL, TILE_TYPES.HOUSE, TILE_TYPES.STALL],
      1: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL, TILE_TYPES.HOUSE, TILE_TYPES.STALL],
      2: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL, TILE_TYPES.HOUSE, TILE_TYPES.STALL],
      3: [TILE_TYPES.ROAD, TILE_TYPES.SIDEWALK, TILE_TYPES.WALL, TILE_TYPES.HOUSE, TILE_TYPES.STALL],
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
      0: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      1: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      2: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      3: [TILE_TYPES.HOUSE, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
    }
  },
  [TILE_TYPES.STALL]: {
    neighbors: {
      0: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      1: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      2: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
      3: [TILE_TYPES.STALL, TILE_TYPES.SIDEWALK, TILE_TYPES.ROAD],
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
  
  // Найти ячейку с минимальной энтропией (оптимизированная версия)
  findLowestEntropyCell() {
    let minEntropy = Infinity;
    let bestCell = null;
    
    // Случайное смещение для разнообразия
    const startX = Math.floor(this.rng() * this.size);
    const startY = Math.floor(this.rng() * this.size);
    
    for (let dy = 0; dy < this.size; dy++) {
      for (let dx = 0; dx < this.size; dx++) {
        const x = (startX + dx) % this.size;
        const y = (startY + dy) % this.size;
        
        const cell = this.cells[this.idx(x, y)];
        if (cell.collapsed) continue;
        
        const entropy = cell.possibilities.length;
        
        // Нашли ячейку с энтропией 1 - сразу возвращаем
        if (entropy === 1) {
          return { x, y };
        }
        
        if (entropy > 0 && entropy < minEntropy) {
          minEntropy = entropy;
          bestCell = { x, y };
          
          // Если нашли ячейку с энтропией 2, достаточно хорошо
          if (entropy === 2) {
            return bestCell;
          }
        }
      }
    }
    
    return bestCell;
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
          // Восстанавливаем ячейку, добавляя все типы
          if (neighbor.possibilities.length === 0) {
            neighbor.possibilities = [
              TILE_TYPES.WALL,
              TILE_TYPES.ROAD,
              TILE_TYPES.SIDEWALK,
              TILE_TYPES.HOUSE,
              TILE_TYPES.STALL,
            ];
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
          this.propagate(x, y + dy); // Распространяем ограничения
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
          this.propagate(x + dx, y); // Распространяем ограничения
        }
      }
      
      verticalRoads.push({ x, width });
      x += width + ROAD_SPACING + Math.floor(this.rng() * 5);
    }
    
    return { horizontalRoads, verticalRoads };
  }
  
  // Основной цикл WFC
  generate() {
    console.time('WFC generation');
    
    // Этап 1: Генерация дорожной сети
    this.generateRoadNetwork();
    
    // Этап 2: WFC для заполнения остального пространства
    let iterations = 0;
    const maxIterations = this.size * this.size * 2; // Ещё больше уменьшили
    
    while (iterations < maxIterations) {
      // Найти ячейку с минимальной энтропией
      const cell = this.findLowestEntropyCell();
      if (!cell) break; // Все ячейки свернуты
      
      // Свернуть ячейку
      this.collapseCell(cell.x, cell.y);
      
      // Распространить ограничения
      this.propagate(cell.x, cell.y);
      
      iterations++;
      
      // Прогресс каждые 1000 итераций
      if (iterations % 1000 === 0) {
        console.log(`WFC progress: ${iterations}/${maxIterations}`);
      }
    }
    
    console.log(`WFC iterations: ${iterations}`);
    
    // Этап 3: Принудительно свернуть оставшиеся ячейки
    this.forceCollapseRemaining();
    
    console.timeEnd('WFC generation');
    
    return this.toTileMap();
  }
  
  // Принудительно свернуть все оставшиеся ячейки
  forceCollapseRemaining() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.cells[this.idx(x, y)];
        if (!cell.collapsed) {
          // Выбираем случайный тип из оставшихся возможностей
          if (cell.possibilities.length > 0) {
            const choice = cell.possibilities[Math.floor(this.rng() * cell.possibilities.length)];
            cell.possibilities = [choice];
            cell.collapsed = true;
          } else {
            // Если возможностей нет, делаем ROAD
            cell.possibilities = [TILE_TYPES.ROAD];
            cell.collapsed = true;
          }
        }
      }
    }
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
    
    // Постобработка: создать цельные здания
    this.postProcessBuildings(tiles);
    
    // Постобработка: обеспечить целостность дорог
    this.postProcessRoads(tiles);
    
    return tiles;
  }
  
  // Постобработка зданий: найти связные компоненты и удалить маленькие
  postProcessBuildings(tiles) {
    const visited = new Uint8Array(this.size * this.size);
    const MIN_BUILDING_SIZE = 25; // 5×5 = 25 тайлов
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        if (tiles[idx] !== T.HOUSE || visited[idx]) continue;
        
        // Найти связный компонент
        const component = [];
        const queue = [{ x, y }];
        visited[idx] = 1;
        
        while (queue.length > 0) {
          const { x: cx, y: cy } = queue.shift();
          component.push({ x: cx, y: cy });
          
          // Проверить 4 соседа
          const neighbors = [
            { x: cx - 1, y: cy },
            { x: cx + 1, y: cy },
            { x: cx, y: cy - 1 },
            { x: cx, y: cy + 1 },
          ];
          
          for (const n of neighbors) {
            if (n.x < 0 || n.x >= this.size || n.y < 0 || n.y >= this.size) continue;
            const nIdx = this.idx(n.x, n.y);
            if (tiles[nIdx] === T.HOUSE && !visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(n);
            }
          }
        }
        
        // Если компонент слишком маленький, превратить в дорогу
        if (component.length < MIN_BUILDING_SIZE) {
          for (const cell of component) {
            tiles[this.idx(cell.x, cell.y)] = T.ROAD;
          }
        }
      }
    }
  }
  
  // Постобработка дорог: обеспечить связность
  postProcessRoads(tiles) {
    // Найти все связные компоненты дорог
    const visited = new Uint8Array(this.size * this.size);
    const components = [];
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        if (tiles[idx] !== T.ROAD || visited[idx]) continue;
        
        // Найти связный компонент дорог
        const component = [];
        const queue = [{ x, y }];
        visited[idx] = 1;
        
        while (queue.length > 0) {
          const { x: cx, y: cy } = queue.shift();
          component.push({ x: cx, y: cy });
          
          const neighbors = [
            { x: cx - 1, y: cy },
            { x: cx + 1, y: cy },
            { x: cx, y: cy - 1 },
            { x: cx, y: cy + 1 },
          ];
          
          for (const n of neighbors) {
            if (n.x < 0 || n.x >= this.size || n.y < 0 || n.y >= this.size) continue;
            const nIdx = this.idx(n.x, n.y);
            if (tiles[nIdx] === T.ROAD && !visited[nIdx]) {
              visited[nIdx] = 1;
              queue.push(n);
            }
          }
        }
        
        components.push(component);
      }
    }
    
    // Если есть несколько компонентов дорог, соединить их
    if (components.length > 1) {
      // Найти самый большой компонент
      components.sort((a, b) => b.length - a.length);
      const mainComponent = components[0];
      
      // Для каждого маленького компонента найти ближайшую точку в главном
      for (let i = 1; i < components.length; i++) {
        const smallComponent = components[i];
        const smallCenter = smallComponent[Math.floor(smallComponent.length / 2)];
        
        // Найти ближайшую точку в главном компоненте
        let nearestPoint = mainComponent[0];
        let minDist = Infinity;
        
        for (const point of mainComponent) {
          const dist = Math.abs(point.x - smallCenter.x) + Math.abs(point.y - smallCenter.y);
          if (dist < minDist) {
            minDist = dist;
            nearestPoint = point;
          }
        }
        
        // Проложить дорогу от маленького компонента к главному
        this.carveRoad(tiles, smallCenter.x, smallCenter.y, nearestPoint.x, nearestPoint.y);
      }
    }
  }
  
  // Проложить дорогу между двумя точками
  carveRoad(tiles, x1, y1, x2, y2) {
    let x = x1;
    let y = y1;
    
    // Сначала идём по X
    while (x !== x2) {
      const idx = this.idx(x, y);
      if (tiles[idx] === T.HOUSE) {
        tiles[idx] = T.ROAD;
      }
      x += x2 > x1 ? 1 : -1;
    }
    
    // Затем по Y
    while (y !== y2) {
      const idx = this.idx(x, y);
      if (tiles[idx] === T.HOUSE) {
        tiles[idx] = T.ROAD;
      }
      y += y2 > y1 ? 1 : -1;
    }
  }
}
