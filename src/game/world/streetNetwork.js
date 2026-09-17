// ============================================================
//  world/streetNetwork.js — алгоритм генерации уличной сети
//  4-фазный алгоритм: магистрали → переулки → площади → финализация
// ============================================================

import { STREET_TYPE, STREET_DIR, CURB_SIDE, STREET_PARAMS } from "./streetTypes.js";
import { MAP_TILES } from "../core/Constants.js";

export class StreetNetwork {
  constructor(rng) {
    this.rng = rng;
    this.size = MAP_TILES;
    
    // Многослойная структура данных
    this.streetType = new Uint8Array(this.size * this.size);
    this.streetDir = new Uint8Array(this.size * this.size);
    this.curbSide = new Uint8Array(this.size * this.size);
    this.decoration = new Uint8Array(this.size * this.size);
    
    // Дополнительные данные для рендеринга
    this.neonNodes = [];
    this.puddles = [];
    this.manholes = [];
  }

  idx(x, y) {
    return y * this.size + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.size && y < this.size;
  }

  // ========== ФАЗА 1: Закладка магистралей ==========
  generateHighways() {
    // Количество магистралей (2-3 вертикальных и 2-3 горизонтальных)
    const numVertical = 2 + Math.floor(this.rng() * 2);
    const numHorizontal = 2 + Math.floor(this.rng() * 2);

    // Генерируем вертикальные магистрали
    const verticalPositions = [];
    const spacing = this.size / (numVertical + 1);
    
    for (let i = 0; i < numVertical; i++) {
      const baseX = Math.floor(spacing * (i + 1));
      const jitter = Math.floor((this.rng() - 0.5) * 10); // ±5 тайлов джиттера
      const x = baseX + jitter;
      verticalPositions.push(x);
    }

    // Генерируем горизонтальные магистрали
    const horizontalPositions = [];
    for (let i = 0; i < numHorizontal; i++) {
      const baseY = Math.floor(spacing * (i + 1));
      const jitter = Math.floor((this.rng() - 0.5) * 10);
      const y = baseY + jitter;
      horizontalPositions.push(y);
    }

    // Размечаем вертикальные магистрали
    for (const x of verticalPositions) {
      const width = STREET_PARAMS.highway.roadWidth[0] + 
                    Math.floor(this.rng() * (STREET_PARAMS.highway.roadWidth[1] - STREET_PARAMS.highway.roadWidth[0] + 1));
      const sidewalk = STREET_PARAMS.highway.sidewalkWidth;
      
      this.drawVerticalHighway(x, width, sidewalk);
    }

    // Размечаем горизонтальные магистрали
    for (const y of horizontalPositions) {
      const width = STREET_PARAMS.highway.roadWidth[0] + 
                    Math.floor(this.rng() * (STREET_PARAMS.highway.roadWidth[1] - STREET_PARAMS.highway.roadWidth[0] + 1));
      const sidewalk = STREET_PARAMS.highway.sidewalkWidth;
      
      this.drawHorizontalHighway(y, width, sidewalk);
    }

    // Создаём перекрёстки
    for (const x of verticalPositions) {
      for (const y of horizontalPositions) {
        this.createIntersection(x, y);
      }
    }
  }

  drawVerticalHighway(centerX, roadWidth, sidewalkWidth) {
    const halfRoad = Math.floor(roadWidth / 2);
    const totalWidth = roadWidth + sidewalkWidth * 2;
    const halfTotal = Math.floor(totalWidth / 2);

    for (let y = 0; y < this.size; y++) {
      for (let dx = -halfTotal; dx <= halfTotal; dx++) {
        const x = centerX + dx;
        if (!this.inBounds(x, y)) continue;

        const idx = this.idx(x, y);
        
        // Определяем тип тайла
        if (Math.abs(dx) <= halfRoad) {
          // Проезжая часть
          this.streetType[idx] = STREET_TYPE.ROADWAY;
          this.streetDir[idx] = STREET_DIR.VERTICAL;
        } else if (Math.abs(dx) <= halfTotal) {
          // Тротуар
          this.streetType[idx] = STREET_TYPE.SIDEWALK;
          this.streetDir[idx] = STREET_DIR.VERTICAL;
          
          // Бордюр на границе с проезжей частью
          if (Math.abs(dx) === halfRoad + 1) {
            this.curbSide[idx] |= (dx < 0 ? CURB_SIDE.EAST : CURB_SIDE.WEST);
          }
        }
      }
    }
  }

  drawHorizontalHighway(centerY, roadWidth, sidewalkWidth) {
    const halfRoad = Math.floor(roadWidth / 2);
    const totalWidth = roadWidth + sidewalkWidth * 2;
    const halfTotal = Math.floor(totalWidth / 2);

    for (let x = 0; x < this.size; x++) {
      for (let dy = -halfTotal; dy <= halfTotal; dy++) {
        const y = centerY + dy;
        if (!this.inBounds(x, y)) continue;

        const idx = this.idx(x, y);
        
        // Определяем тип тайла
        if (Math.abs(dy) <= halfRoad) {
          // Проезжая часть
          this.streetType[idx] = STREET_TYPE.ROADWAY;
          this.streetDir[idx] = STREET_DIR.HORIZONTAL;
        } else if (Math.abs(dy) <= halfTotal) {
          // Тротуар
          this.streetType[idx] = STREET_TYPE.SIDEWALK;
          this.streetDir[idx] = STREET_DIR.HORIZONTAL;
          
          // Бордюр на границе с проезжей частью
          if (Math.abs(dy) === halfRoad + 1) {
            this.curbSide[idx] |= (dy < 0 ? CURB_SIDE.SOUTH : CURB_SIDE.NORTH);
          }
        }
      }
    }
  }

  createIntersection(centerX, centerY) {
    const radius = 4; // Радиус перекрёстка

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (!this.inBounds(x, y)) continue;

        const idx = this.idx(x, y);
        
        // Перекрёсток — это проезжая часть
        this.streetType[idx] = STREET_TYPE.ROADWAY;
        this.streetDir[idx] = STREET_DIR.INTERSECTION;
      }
    }

    // Добавляем пешеходные переходы (зебра)
    this.addCrosswalk(centerX, centerY, radius, "N");
    this.addCrosswalk(centerX, centerY, radius, "S");
    this.addCrosswalk(centerX, centerY, radius, "E");
    this.addCrosswalk(centerX, centerY, radius, "W");
  }

  addCrosswalk(centerX, centerY, radius, direction) {
    const stripeCount = 5;
    const stripeWidth = 1;
    const stripeGap = 1;

    for (let i = 0; i < stripeCount; i++) {
      for (let j = 0; j < stripeWidth; j++) {
        let x, y;
        
        if (direction === "N") {
          x = centerX - radius + i * (stripeWidth + stripeGap);
          y = centerY - radius - 1 - j;
        } else if (direction === "S") {
          x = centerX - radius + i * (stripeWidth + stripeGap);
          y = centerY + radius + 1 + j;
        } else if (direction === "E") {
          x = centerX + radius + 1 + j;
          y = centerY - radius + i * (stripeWidth + stripeGap);
        } else { // W
          x = centerX - radius - 1 - j;
          y = centerY - radius + i * (stripeWidth + stripeGap);
        }

        if (this.inBounds(x, y)) {
          this.decoration[this.idx(x, y)] = 1; // Маркер пешеходного перехода
        }
      }
    }
  }

  // ========== ФАЗА 2: Добавление переулков ==========
  generateAlleys() {
    // Добавляем переулки между магистралями
    const alleyCount = 8 + Math.floor(this.rng() * 5);

    for (let i = 0; i < alleyCount; i++) {
      const isHorizontal = this.rng() < 0.5;
      const isDeadEnd = this.rng() < 0.3; // 30% тупиков

      if (isHorizontal) {
        this.generateHorizontalAlley(isDeadEnd);
      } else {
        this.generateVerticalAlley(isDeadEnd);
      }
    }
  }

  generateHorizontalAlley(isDeadEnd) {
    const y = 10 + Math.floor(this.rng() * (this.size - 20));
    const startX = Math.floor(this.rng() * (this.size / 2));
    const length = 15 + Math.floor(this.rng() * 20);

    const width = STREET_PARAMS.alley.roadWidth[0] + 
                  Math.floor(this.rng() * (STREET_PARAMS.alley.roadWidth[1] - STREET_PARAMS.alley.roadWidth[0] + 1));
    const sidewalk = STREET_PARAMS.alley.sidewalkWidth;

    for (let x = startX; x < startX + length && x < this.size; x++) {
      for (let dy = -width - sidewalk; dy <= width + sidewalk; dy++) {
        const tileY = y + dy;
        if (!this.inBounds(x, tileY)) continue;

        const idx = this.idx(x, tileY);
        
        // Не перекрываем существующие магистрали
        if (this.streetType[idx] === STREET_TYPE.ROADWAY && 
            this.streetDir[idx] === STREET_DIR.VERTICAL) {
          continue;
        }

        if (Math.abs(dy) <= width) {
          this.streetType[idx] = STREET_TYPE.ROADWAY;
          this.streetDir[idx] = STREET_DIR.HORIZONTAL;
        } else if (Math.abs(dy) <= width + sidewalk) {
          this.streetType[idx] = STREET_TYPE.SIDEWALK;
          this.streetDir[idx] = STREET_DIR.HORIZONTAL;
          
          if (Math.abs(dy) === width + 1) {
            this.curbSide[idx] |= (dy < 0 ? CURB_SIDE.SOUTH : CURB_SIDE.NORTH);
          }
        }
      }
    }

    // Создаём тупик
    if (isDeadEnd) {
      const endX = Math.min(startX + length, this.size - 1);
      this.createDeadEnd(endX, y, width, sidewalk);
    }
  }

  generateVerticalAlley(isDeadEnd) {
    const x = 10 + Math.floor(this.rng() * (this.size - 20));
    const startY = Math.floor(this.rng() * (this.size / 2));
    const length = 15 + Math.floor(this.rng() * 20);

    const width = STREET_PARAMS.alley.roadWidth[0] + 
                  Math.floor(this.rng() * (STREET_PARAMS.alley.roadWidth[1] - STREET_PARAMS.alley.roadWidth[0] + 1));
    const sidewalk = STREET_PARAMS.alley.sidewalkWidth;

    for (let y = startY; y < startY + length && y < this.size; y++) {
      for (let dx = -width - sidewalk; dx <= width + sidewalk; dx++) {
        const tileX = x + dx;
        if (!this.inBounds(tileX, y)) continue;

        const idx = this.idx(tileX, y);
        
        // Не перекрываем существующие магистрали
        if (this.streetType[idx] === STREET_TYPE.ROADWAY && 
            this.streetDir[idx] === STREET_DIR.HORIZONTAL) {
          continue;
        }

        if (Math.abs(dx) <= width) {
          this.streetType[idx] = STREET_TYPE.ROADWAY;
          this.streetDir[idx] = STREET_DIR.VERTICAL;
        } else if (Math.abs(dx) <= width + sidewalk) {
          this.streetType[idx] = STREET_TYPE.SIDEWALK;
          this.streetDir[idx] = STREET_DIR.VERTICAL;
          
          if (Math.abs(dx) === width + 1) {
            this.curbSide[idx] |= (dx < 0 ? CURB_SIDE.EAST : CURB_SIDE.WEST);
          }
        }
      }
    }

    // Создаём тупик
    if (isDeadEnd) {
      const endY = Math.min(startY + length, this.size - 1);
      this.createDeadEnd(x, endY, width, sidewalk);
    }
  }

  createDeadEnd(x, y, width, sidewalk) {
    // Блокируем конец переулка зданием
    for (let dy = -width - sidewalk; dy <= width + sidewalk; dy++) {
      const tileY = y + dy;
      if (!this.inBounds(x, tileY)) continue;
      
      const idx = this.idx(x, tileY);
      this.streetType[idx] = STREET_TYPE.BUILDING;
      this.streetDir[idx] = STREET_DIR.NONE;
    }
  }

  // ========== ФАЗА 3: Вставка площадей ==========
  generatePlazas() {
    // Находим места для площадей (где сходятся 3+ улицы)
    const plazaCandidates = this.findPlazaCandidates();
    
    // Выбираем 2-4 места для площадей
    const plazaCount = 2 + Math.floor(this.rng() * 3);
    const selectedPlazas = plazaCandidates.slice(0, plazaCount);

    for (const { x, y } of selectedPlazas) {
      this.createPlaza(x, y);
    }
  }

  findPlazaCandidates() {
    const candidates = [];
    const step = 20; // Шаг поиска

    for (let y = step; y < this.size - step; y += step) {
      for (let x = step; x < this.size - step; x += step) {
        // Проверяем, есть ли здесь перекрёсток или соединение улиц
        if (this.isIntersectionArea(x, y)) {
          candidates.push({ x, y, score: this.calculatePlazaScore(x, y) });
        }
      }
    }

    // Сортируем по score (убывание)
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  isIntersectionArea(x, y) {
    let streetCount = 0;
    const radius = 5;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tileX = x + dx;
        const tileY = y + dy;
        if (!this.inBounds(tileX, tileY)) continue;

        const type = this.streetType[this.idx(tileX, tileY)];
        if (type === STREET_TYPE.ROADWAY || type === STREET_TYPE.SIDEWALK) {
          streetCount++;
        }
      }
    }

    return streetCount > 50; // Порог для "перекрёстка"
  }

  calculatePlazaScore(x, y) {
    // Простая эвристика: чем больше улиц вокруг, тем лучше
    let score = 0;
    const radius = 10;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tileX = x + dx;
        const tileY = y + dy;
        if (!this.inBounds(tileX, tileY)) continue;

        const type = this.streetType[this.idx(tileX, tileY)];
        if (type === STREET_TYPE.ROADWAY) score += 2;
        else if (type === STREET_TYPE.SIDEWALK) score += 1;
      }
    }

    return score;
  }

  createPlaza(centerX, centerY) {
    const size = 8 + Math.floor(this.rng() * 8); // 8-15 тайлов
    const halfSize = Math.floor(size / 2);

    for (let dy = -halfSize; dy <= halfSize; dy++) {
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (!this.inBounds(x, y)) continue;

        // Органичная форма: "откусываем" случайные куски
        const dist = Math.sqrt(dx * dx + dy * dy);
        const noise = (this.rng() - 0.5) * 3;
        
        if (dist + noise <= halfSize) {
          const idx = this.idx(x, y);
          this.streetType[idx] = STREET_TYPE.PLAZA;
          this.streetDir[idx] = STREET_DIR.NONE;
          this.curbSide[idx] = CURB_SIDE.NONE; // Нет бордюра на площади
        }
      }
    }
  }

  // ========== ФАЗА 4: Финализация границ ==========
  finalize() {
    // Всё оставшееся пространство помечаем как BUILDING_ZONE
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        if (this.streetType[idx] === 0) {
          this.streetType[idx] = STREET_TYPE.BUILDING;
        }
      }
    }

    // Добавляем детали: люки, лужи, мусор
    this.addStreetDetails();
  }

  addStreetDetails() {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        const type = this.streetType[idx];

        if (type === STREET_TYPE.ROADWAY) {
          // Люки (3% вероятность)
          if (this.rng() < 0.03) {
            this.decoration[idx] = 2; // Маркер люка
            this.manholes.push({ x, y });
          }

          // Лужи (5% вероятность)
          if (this.rng() < 0.05) {
            this.puddles.push({ x, y, size: 1 + Math.floor(this.rng() * 2) });
          }
        } else if (type === STREET_TYPE.SIDEWALK) {
          // Мусор на тротуарах (10% вероятность)
          if (this.rng() < 0.1) {
            this.decoration[idx] = 3; // Маркер мусора
          }
        }
      }
    }
  }

  // ========== Валидация связности ==========
  validateConnectivity() {
    // Flood Fill для проверки связности улиц
    const visited = new Uint8Array(this.size * this.size);
    const queue = [];

    // Находим первую улицу
    let startX = -1, startY = -1;
    for (let y = 0; y < this.size && startX === -1; y++) {
      for (let x = 0; x < this.size && startX === -1; x++) {
        const type = this.streetType[this.idx(x, y)];
        if (type === STREET_TYPE.ROADWAY || type === STREET_TYPE.SIDEWALK) {
          startX = x;
          startY = y;
        }
      }
    }

    if (startX === -1) return; // Нет улиц

    // Запускаем Flood Fill
    queue.push([startX, startY]);
    visited[this.idx(startX, startY)] = 1;

    while (queue.length > 0) {
      const [x, y] = queue.shift();
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (!this.inBounds(nx, ny)) continue;

        const idx = this.idx(nx, ny);
        if (visited[idx]) continue;

        const type = this.streetType[idx];
        if (type !== STREET_TYPE.ROADWAY && type !== STREET_TYPE.SIDEWALK && type !== STREET_TYPE.PLAZA) {
          continue;
        }

        visited[idx] = 1;
        queue.push([nx, ny]);
      }
    }

    // Проверяем, все ли улицы посещены
    let isolatedCount = 0;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const idx = this.idx(x, y);
        const type = this.streetType[idx];
        
        if ((type === STREET_TYPE.ROADWAY || type === STREET_TYPE.SIDEWALK) && !visited[idx]) {
          isolatedCount++;
          // Пробиваем проход к ближайшей улице
          this.connectIsolatedStreet(x, y, visited);
        }
      }
    }

    return isolatedCount;
  }

  connectIsolatedStreet(x, y, visited) {
    // Простая эвристика: ищем ближайшую посещённую улицу и пробиваем прямой проход
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    
    for (const [dx, dy] of dirs) {
      let nx = x + dx;
      let ny = y + dy;
      
      while (this.inBounds(nx, ny)) {
        const idx = this.idx(nx, ny);
        const type = this.streetType[idx];
        
        if (visited[idx] && (type === STREET_TYPE.ROADWAY || type === STREET_TYPE.SIDEWALK)) {
          // Нашли связную улицу — пробиваем проход
          this.carvePath(x, y, nx, ny);
          return;
        }
        
        if (type === STREET_TYPE.BUILDING) {
          // Пробиваем здание
          this.streetType[idx] = STREET_TYPE.ROADWAY;
          this.streetDir[idx] = dx !== 0 ? STREET_DIR.HORIZONTAL : STREET_DIR.VERTICAL;
        }
        
        nx += dx;
        ny += dy;
      }
    }
  }

  carvePath(x1, y1, x2, y2) {
    // Простой алгоритм: идём по горизонтали, затем по вертикали
    let x = x1, y = y1;
    
    while (x !== x2) {
      const idx = this.idx(x, y);
      if (this.streetType[idx] === STREET_TYPE.BUILDING) {
        this.streetType[idx] = STREET_TYPE.ROADWAY;
        this.streetDir[idx] = STREET_DIR.HORIZONTAL;
      }
      x += x2 > x1 ? 1 : -1;
    }
    
    while (y !== y2) {
      const idx = this.idx(x, y);
      if (this.streetType[idx] === STREET_TYPE.BUILDING) {
        this.streetType[idx] = STREET_TYPE.ROADWAY;
        this.streetDir[idx] = STREET_DIR.VERTICAL;
      }
      y += y2 > y1 ? 1 : -1;
    }
  }

  // ========== Главная функция генерации ==========
  generate() {
    this.generateHighways();
    this.generateAlleys();
    this.generatePlazas();
    this.finalize();
    this.validateConnectivity();
  }
}
