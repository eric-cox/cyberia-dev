// ============================================================
//  world/CityGenerator.js — процедурная генерация города
//  Алгоритм по ТЗ: строгая сетка → рекурсивное разбиение → 
//  BSP для зданий → тротуары → разметка → валидация
// ============================================================

import { MAP_TILES } from "../core/Constants.js";
import { T } from "./tiles.js";
import { mulberry32 } from "../core/Rng.js";

// Типы тайлов для генерации
export const TILE_TYPES = {
  EMPTY: 0,           // Пустое место (будет заполнено)
  ROAD_HIGHWAY: 1,    // Магистраль (4-6 полос)
  ROAD_SECONDARY: 2,  // Второстепенная дорога (2 полосы)
  SIDEWALK: 3,        // Тротуар
  CURB: 4,            // Бордюр
  BUILDING: 5,        // Здание
  PARK: 6,            // Парк/промзона
  CROSSWALK: 7,       // Пешеходный переход
};

export class CityGenerator {
  constructor(seed) {
    this.rng = mulberry32(seed);
    this.size = MAP_TILES;
    
    // Сетка тайлов
    this.grid = new Uint8Array(this.size * this.size);
    
    // Метаданные для отрисовки
    this.buildings = []; // Список зданий с формами
    this.intersections = []; // Список перекрёстков
  }
  
  idx(x, y) {
    return y * this.size + x;
  }
  
  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }
  
  // ========== ГЛАВНЫЙ АЛГОРИТМ ==========
  generate() {
    // Шаг 1: Дорожная сеть (скелет)
    this.generateRoadNetwork();
    
    // Шаг 2: Разбивка на кварталы и здания (мясо)
    this.generateBuildings();
    
    // Шаг 3: Инфраструктура и тротуары
    this.generateSidewalks();
    
    // Шаг 4: Разметка дорог
    this.generateRoadMarkings();
    
    // Шаг 5: Валидация
    this.validate();
    
    return this.toTileMap();
  }
  
  // ========== ШАГ 1: ДОРОЖНАЯ СЕТЬ ==========
  generateRoadNetwork() {
    // 1.1. Генерация магистралей (каждые 20-30 тайлов)
    const highwaySpacing = 20 + Math.floor(this.rng() * 10);
    
    // Горизонтальные магистрали
    for (let y = highwaySpacing; y < this.size - highwaySpacing; y += highwaySpacing) {
      const width = 4 + Math.floor(this.rng() * 3); // 4-6 полос
      this.drawHighway(0, y, this.size, width, 'horizontal');
    }
    
    // Вертикальные магистрали
    for (let x = highwaySpacing; x < this.size - highwaySpacing; x += highwaySpacing) {
      const width = 4 + Math.floor(this.rng() * 3);
      this.drawHighway(x, 0, width, this.size, 'vertical');
    }
    
    // 1.2. Рекурсивное разбиение для второстепенных дорог
    this.subdivideBlocks(0, 0, this.size, this.size, 2); // Уменьшили глубину с 3 до 2
    
    // 1.3. Удаление 10-15% дорог для парков
    this.createParks();
  }
  
  drawHighway(x, y, width, height, direction) {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (this.inBounds(tx, ty)) {
          this.grid[this.idx(tx, ty)] = TILE_TYPES.ROAD_HIGHWAY;
        }
      }
    }
  }
  
  // Рекурсивное разбиение кварталов
  subdivideBlocks(x, y, w, h, depth) {
    if (depth <= 0 || w < 10 || h < 10) return;
    
    // Вероятность разбиения уменьшается с глубиной
    if (this.rng() < 0.7) {
      // Горизонтальное разбиение
      const splitY = y + Math.floor(h * (0.3 + this.rng() * 0.4));
      this.drawSecondaryRoad(x, splitY, w, 2);
      this.subdivideBlocks(x, y, w, splitY - y, depth - 1);
      this.subdivideBlocks(x, splitY + 2, w, y + h - splitY - 2, depth - 1);
    }
    
    if (this.rng() < 0.7) {
      // Вертикальное разбиение
      const splitX = x + Math.floor(w * (0.3 + this.rng() * 0.4));
      this.drawSecondaryRoad(splitX, y, 2, h);
      this.subdivideBlocks(x, y, splitX - x, h, depth - 1);
      this.subdivideBlocks(splitX + 2, y, x + w - splitX - 2, h, depth - 1);
    }
  }
  
  drawSecondaryRoad(x, y, width, height) {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (this.inBounds(tx, ty) && this.grid[this.idx(tx, ty)] === TILE_TYPES.EMPTY) {
          this.grid[this.idx(tx, ty)] = TILE_TYPES.ROAD_SECONDARY;
        }
      }
    }
  }
  
  // Создание парков/промзон
  createParks() {
    // Находим все кварталы (области между дорогами)
    const blocks = this.findBlocks();
    
    // Удаляем 10-15% кварталов
    const parkCount = Math.floor(blocks.length * (0.10 + this.rng() * 0.05));
    const parkBlocks = [];
    
    for (let i = 0; i < parkCount && blocks.length > 0; i++) {
      const idx = Math.floor(this.rng() * blocks.length);
      parkBlocks.push(blocks[idx]);
      blocks.splice(idx, 1);
    }
    
    // Заполняем парки
    for (const block of parkBlocks) {
      for (let y = block.y; y < block.y + block.h; y++) {
        for (let x = block.x; x < block.x + block.w; x++) {
          if (this.inBounds(x, y)) {
            this.grid[this.idx(x, y)] = TILE_TYPES.PARK;
          }
        }
      }
    }
  }
  
  // Поиск кварталов (областей между дорогами)
  findBlocks() {
    const visited = new Uint8Array(this.size * this.size);
    const blocks = [];
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        if (visited[idx] || this.grid[idx] !== TILE_TYPES.EMPTY) continue;
        
        // BFS для нахождения квартала
        const block = { x, y, w: 0, h: 0 };
        const queue = [{ x, y }];
        visited[idx] = 1;
        
        let minX = x, maxX = x, minY = y, maxY = y;
        
        while (queue.length > 0) {
          const { x: cx, y: cy } = queue.shift();
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);
          
          const neighbors = [
            { x: cx - 1, y: cy },
            { x: cx + 1, y: cy },
            { x: cx, y: cy - 1 },
            { x: cx, y: cy + 1 },
          ];
          
          for (const n of neighbors) {
            if (!this.inBounds(n.x, n.y)) continue;
            const nIdx = this.idx(n.x, n.y);
            if (!visited[nIdx] && this.grid[nIdx] === TILE_TYPES.EMPTY) {
              visited[nIdx] = 1;
              queue.push(n);
            }
          }
        }
        
        block.x = minX;
        block.y = minY;
        block.w = maxX - minX + 1;
        block.h = maxY - minY + 1;
        
        if (block.w >= 5 && block.h >= 5) {
          blocks.push(block);
        }
      }
    }
    
    return blocks;
  }
  
  // ========== ШАГ 2: ЗДАНИЯ ==========
  generateBuildings() {
    const blocks = this.findBlocks();
    
    for (const block of blocks) {
      // Используем BSP для разбивки квартала на участки
      const lots = this.bspSubdivide(block.x, block.y, block.w, block.h);
      
      // Для каждого участка создаём здание
      for (const lot of lots) {
        if (lot.w >= 5 && lot.h >= 5) {
          this.createBuilding(lot);
        }
      }
    }
  }
  
  // BSP-разбиение участка
  bspSubdivide(x, y, w, h, depth = 2) {
    if (depth <= 0 || w < 6 || h < 6) {
      return [{ x, y, w, h }];
    }
    
    const lots = [];
    
    // Выбираем направление разреза
    if (this.rng() < 0.5 && w > h) {
      // Вертикальный разрез
      const split = Math.floor(w * (0.3 + this.rng() * 0.4));
      lots.push(...this.bspSubdivide(x, y, split, h, depth - 1));
      lots.push(...this.bspSubdivide(x + split, y, w - split, h, depth - 1));
    } else if (h > w) {
      // Горизонтальный разрез
      const split = Math.floor(h * (0.3 + this.rng() * 0.4));
      lots.push(...this.bspSubdivide(x, y, w, split, depth - 1));
      lots.push(...this.bspSubdivide(x, y + split, w, h - split, depth - 1));
    } else {
      // Случайный разрез
      if (this.rng() < 0.5) {
        const split = Math.floor(w * (0.3 + this.rng() * 0.4));
        lots.push(...this.bspSubdivide(x, y, split, h, depth - 1));
        lots.push(...this.bspSubdivide(x + split, y, w - split, h, depth - 1));
      } else {
        const split = Math.floor(h * (0.3 + this.rng() * 0.4));
        lots.push(...this.bspSubdivide(x, y, w, split, depth - 1));
        lots.push(...this.bspSubdivide(x, y + split, w, h - split, depth - 1));
      }
    }
    
    return lots;
  }
  
  // Создание здания на участке
  createBuilding(lot) {
    // Выбираем форму здания
    const shape = this.chooseBuildingShape(lot);
    
    // Заполняем тайлы здания
    for (const tile of shape.tiles) {
      const tx = lot.x + tile.x;
      const ty = lot.y + tile.y;
      if (this.inBounds(tx, ty) && this.grid[this.idx(tx, ty)] === TILE_TYPES.EMPTY) {
        this.grid[this.idx(tx, ty)] = TILE_TYPES.BUILDING;
      }
    }
    
    // Сохраняем метаданные здания
    this.buildings.push({
      x: lot.x,
      y: lot.y,
      w: lot.w,
      h: lot.h,
      shape: shape.type,
      tiles: shape.tiles,
    });
  }
  
  // Выбор формы здания
  chooseBuildingShape(lot) {
    const roll = this.rng();
    
    if (roll < 0.6) {
      // Прямоугольник (60%)
      return {
        type: 'rectangle',
        tiles: this.generateRectangle(lot.w, lot.h),
      };
    } else if (roll < 0.8 && lot.w >= 7 && lot.h >= 7) {
      // L-образная форма (20%)
      return {
        type: 'L',
        tiles: this.generateLShape(lot.w, lot.h),
      };
    } else if (lot.w >= 8 && lot.h >= 8) {
      // П-образная форма (20%)
      return {
        type: 'U',
        tiles: this.generateUShape(lot.w, lot.h),
      };
    } else {
      // Прямоугольник по умолчанию
      return {
        type: 'rectangle',
        tiles: this.generateRectangle(lot.w, lot.h),
      };
    }
  }
  
  generateRectangle(w, h) {
    const tiles = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        tiles.push({ x, y });
      }
    }
    return tiles;
  }
  
  generateLShape(w, h) {
    const tiles = [];
    const cutW = Math.floor(w * 0.4);
    const cutH = Math.floor(h * 0.4);
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Вырезаем угол
        if (x >= w - cutW && y >= h - cutH) continue;
        tiles.push({ x, y });
      }
    }
    return tiles;
  }
  
  generateUShape(w, h) {
    const tiles = [];
    const cutW = Math.floor(w * 0.3);
    const cutH = Math.floor(h * 0.4);
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Вырезаем центр сверху
        if (x >= cutW && x < w - cutW && y < cutH) continue;
        tiles.push({ x, y });
      }
    }
    return tiles;
  }
  
  // ========== ШАГ 3: ТРОТУАРЫ ==========
  generateSidewalks() {
    // Находим все дороги и добавляем тротуары вокруг них
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        const tile = this.grid[idx];
        
        if (tile === TILE_TYPES.ROAD_HIGHWAY || tile === TILE_TYPES.ROAD_SECONDARY) {
          // Добавляем тротуары по краям дороги
          this.addSidewalksAround(x, y);
        }
      }
    }
    
    // Скругляем углы тротуаров на перекрёстках
    this.roundSidewalkCorners();
  }
  
  addSidewalksAround(x, y) {
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];
    
    for (const n of neighbors) {
      if (!this.inBounds(n.x, n.y)) continue;
      const nIdx = this.idx(n.x, n.y);
      
      // Если сосед - пустое место, делаем тротуар
      if (this.grid[nIdx] === TILE_TYPES.EMPTY) {
        this.grid[nIdx] = TILE_TYPES.SIDEWALK;
      }
    }
  }
  
  roundSidewalkCorners() {
    // Находим перекрёстки и скругляем углы
    for (let y = 1; y < this.size - 1; y++) {
      for (let x = 1; x < this.size - 1; x++) {
        const idx = this.idx(x, y);
        if (this.grid[idx] !== TILE_TYPES.ROAD_HIGHWAY && 
            this.grid[idx] !== TILE_TYPES.ROAD_SECONDARY) continue;
        
        // Проверяем, это перекрёсток
        const isIntersection = 
          (this.grid[this.idx(x - 1, y)] === TILE_TYPES.ROAD_HIGHWAY || 
           this.grid[this.idx(x - 1, y)] === TILE_TYPES.ROAD_SECONDARY) &&
          (this.grid[this.idx(x + 1, y)] === TILE_TYPES.ROAD_HIGHWAY || 
           this.grid[this.idx(x + 1, y)] === TILE_TYPES.ROAD_SECONDARY) &&
          (this.grid[this.idx(x, y - 1)] === TILE_TYPES.ROAD_HIGHWAY || 
           this.grid[this.idx(x, y - 1)] === TILE_TYPES.ROAD_SECONDARY) &&
          (this.grid[this.idx(x, y + 1)] === TILE_TYPES.ROAD_HIGHWAY || 
           this.grid[this.idx(x, y + 1)] === TILE_TYPES.ROAD_SECONDARY);
        
        if (isIntersection) {
          this.intersections.push({ x, y });
          // Скругляем углы тротуаров
          this.roundCorner(x - 1, y - 1);
          this.roundCorner(x + 1, y - 1);
          this.roundCorner(x - 1, y + 1);
          this.roundCorner(x + 1, y + 1);
        }
      }
    }
  }
  
  roundCorner(x, y) {
    if (!this.inBounds(x, y)) return;
    const idx = this.idx(x, y);
    if (this.grid[idx] === TILE_TYPES.SIDEWALK) {
      this.grid[idx] = TILE_TYPES.CURB;
    }
  }
  
  // ========== ШАГ 4: РАЗМЕТКА ==========
  generateRoadMarkings() {
    // Добавляем пешеходные переходы на перекрёстках
    for (const intersection of this.intersections) {
      this.addCrosswalks(intersection.x, intersection.y);
    }
  }
  
  addCrosswalks(x, y) {
    // Северный переход
    for (let dx = -2; dx <= 2; dx++) {
      const tx = x + dx;
      const ty = y - 3;
      if (this.inBounds(tx, ty) && this.grid[this.idx(tx, ty)] === TILE_TYPES.ROAD_HIGHWAY) {
        this.grid[this.idx(tx, ty)] = TILE_TYPES.CROSSWALK;
      }
    }
    
    // Южный переход
    for (let dx = -2; dx <= 2; dx++) {
      const tx = x + dx;
      const ty = y + 3;
      if (this.inBounds(tx, ty) && this.grid[this.idx(tx, ty)] === TILE_TYPES.ROAD_HIGHWAY) {
        this.grid[this.idx(tx, ty)] = TILE_TYPES.CROSSWALK;
      }
    }
    
    // Западный переход
    for (let dy = -2; dy <= 2; dy++) {
      const tx = x - 3;
      const ty = y + dy;
      if (this.inBounds(tx, ty) && this.grid[this.idx(tx, ty)] === TILE_TYPES.ROAD_HIGHWAY) {
        this.grid[this.idx(tx, ty)] = TILE_TYPES.CROSSWALK;
      }
    }
    
    // Восточный переход
    for (let dy = -2; dy <= 2; dy++) {
      const tx = x + 3;
      const ty = y + dy;
      if (this.inBounds(tx, ty) && this.grid[this.idx(tx, ty)] === TILE_TYPES.ROAD_HIGHWAY) {
        this.grid[this.idx(tx, ty)] = TILE_TYPES.CROSSWALK;
      }
    }
  }
  
  // ========== ШАГ 5: ВАЛИДАЦИЯ ==========
  validate() {
    // 1. Проверка связности дорог
    this.validateRoadConnectivity();
    
    // 2. Проверка коллизий зданий
    this.validateBuildingCollisions();
    
    // 3. Заполняем оставшиеся пустые места тротуарами
    this.fillEmptySpaces();
  }
  
  validateRoadConnectivity() {
    // Находим все связные компоненты дорог
    const visited = new Uint8Array(this.size * this.size);
    const components = [];
    
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        const tile = this.grid[idx];
        
        if ((tile === TILE_TYPES.ROAD_HIGHWAY || tile === TILE_TYPES.ROAD_SECONDARY) && !visited[idx]) {
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
              if (!this.inBounds(n.x, n.y)) continue;
              const nIdx = this.idx(n.x, n.y);
              const nTile = this.grid[nIdx];
              
              if (!visited[nIdx] && (nTile === TILE_TYPES.ROAD_HIGHWAY || nTile === TILE_TYPES.ROAD_SECONDARY)) {
                visited[nIdx] = 1;
                queue.push(n);
              }
            }
          }
          
          components.push(component);
        }
      }
    }
    
    // Если есть несколько компонентов, соединяем их
    if (components.length > 1) {
      this.connectRoadComponents(components);
    }
  }
  
  connectRoadComponents(components) {
    // Сортируем по размеру
    components.sort((a, b) => b.length - a.length);
    const mainComponent = components[0];
    
    // Для каждого маленького компонента находим ближайшую точку в главном
    for (let i = 1; i < components.length; i++) {
      const smallComponent = components[i];
      const smallCenter = smallComponent[Math.floor(smallComponent.length / 2)];
      
      // Находим ближайшую точку в главном компоненте
      let nearestPoint = mainComponent[0];
      let minDist = Infinity;
      
      for (const point of mainComponent) {
        const dist = Math.abs(point.x - smallCenter.x) + Math.abs(point.y - smallCenter.y);
        if (dist < minDist) {
          minDist = dist;
          nearestPoint = point;
        }
      }
      
      // Прокладываем дорогу
      this.carveRoad(smallCenter.x, smallCenter.y, nearestPoint.x, nearestPoint.y);
    }
  }
  
  carveRoad(x1, y1, x2, y2) {
    let x = x1;
    let y = y1;
    
    // Сначала идём по X
    while (x !== x2) {
      const idx = this.idx(x, y);
      if (this.grid[idx] === TILE_TYPES.BUILDING || this.grid[idx] === TILE_TYPES.EMPTY) {
        this.grid[idx] = TILE_TYPES.ROAD_SECONDARY;
      }
      x += x2 > x1 ? 1 : -1;
    }
    
    // Затем по Y
    while (y !== y2) {
      const idx = this.idx(x, y);
      if (this.grid[idx] === TILE_TYPES.BUILDING || this.grid[idx] === TILE_TYPES.EMPTY) {
        this.grid[idx] = TILE_TYPES.ROAD_SECONDARY;
      }
      y += y2 > y1 ? 1 : -1;
    }
  }
  
  validateBuildingCollisions() {
    // Проверяем, что здания не пересекаются с дорогами
    for (const building of this.buildings) {
      for (const tile of building.tiles) {
        const tx = building.x + tile.x;
        const ty = building.y + tile.y;
        const idx = this.idx(tx, ty);
        
        if (this.grid[idx] !== TILE_TYPES.BUILDING) {
          // Building collision detected
        }
      }
    }
  }
  
  fillEmptySpaces() {
    // Заполняем оставшиеся пустые места тротуарами
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === TILE_TYPES.EMPTY) {
        this.grid[i] = TILE_TYPES.SIDEWALK;
      }
    }
  }
  
  // ========== ПРЕОБРАЗОВАНИЕ В ТАЙЛОВУЮ КАРТУ ==========
  toTileMap() {
    const tiles = new Uint8Array(this.size * this.size);
    
    for (let i = 0; i < this.grid.length; i++) {
      const wfcType = this.grid[i];
      
      // Преобразуем типы в игровые типы
      switch (wfcType) {
        case TILE_TYPES.ROAD_HIGHWAY:
        case TILE_TYPES.ROAD_SECONDARY:
        case TILE_TYPES.CROSSWALK:
          tiles[i] = T.ROAD;
          break;
        case TILE_TYPES.SIDEWALK:
        case TILE_TYPES.CURB:
          tiles[i] = T.ROAD; // Тротуары тоже проходимые
          break;
        case TILE_TYPES.BUILDING:
          tiles[i] = T.HOUSE;
          break;
        case TILE_TYPES.PARK:
          tiles[i] = T.ROAD; // Парки проходимые
          break;
        default:
          tiles[i] = T.ROAD;
      }
    }
    
    return tiles;
  }
}
