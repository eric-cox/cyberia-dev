// ============================================================
//  sim/Movement — инерционное движение по ячейкам.
//
//  Скорость сущности не равна вводу напрямую: она «догоняет»
//  желаемую скорость. Темп догоняния зависит от поверхности:
//    - обычная дорога: отзывчивое управление
//    - масло: скольжение, движение продолжается само
//  Загрязнение (мусор) замедляет движение.
// ============================================================

import { DEBRIS_PARAMS, SURFACE_PARAMS } from "../world/streetTypes.js";

// Константы физики движения
const MOVEMENT_CONSTANTS = {
  BASE_RESPONSE: 0.7,      // базовая скорость реакции (1/сек)
  GRIP_MULTIPLIER: 12,     // множитель сцепления
  DEFAULT_SURFACE: 0,      // тип поверхности по умолчанию
  DEFAULT_DEBRIS: 0,       // тип мусора по умолчанию
};

export function steer(e, desiredX, desiredY, map, dt) {
  // Получаем параметры поверхности и мусора
  const surfaceType = map.surfaceAt(e.x, e.y);
  const debrisType = map.debrisAt(e.x, e.y);
  
  const surfaceParams = SURFACE_PARAMS[surfaceType] || SURFACE_PARAMS[MOVEMENT_CONSTANTS.DEFAULT_SURFACE];
  const debrisParams = DEBRIS_PARAMS[debrisType] || DEBRIS_PARAMS[MOVEMENT_CONSTANTS.DEFAULT_DEBRIS];
  
  // Применяем замедление от мусора
  const adjustedDesiredX = desiredX * debrisParams.speedMul;
  const adjustedDesiredY = desiredY * debrisParams.speedMul;
  
  // Вычисляем инерцию от поверхности
  const grip = 1 - surfaceParams.inertia;
  const response = MOVEMENT_CONSTANTS.BASE_RESPONSE + grip * MOVEMENT_CONSTANTS.GRIP_MULTIPLIER;
  const blend = Math.min(1, response * dt);
  
  // Обновляем скорость с учётом инерции
  e.vx += (adjustedDesiredX - e.vx) * blend;
  e.vy += (adjustedDesiredY - e.vy) * blend;
}
