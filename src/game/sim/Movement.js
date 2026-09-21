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

export function steer(e, desiredX, desiredY, map, dt) {
  // Получаем тип поверхности (масло или обычная дорога)
  const surfaceType = map.surfaceAt(e.x, e.y);
  const surfaceParams = SURFACE_PARAMS[surfaceType] || SURFACE_PARAMS[0];
  const inertia = surfaceParams.inertia;
  
  // Получаем тип загрязнения (мусор)
  const debrisType = map.debrisAt(e.x, e.y);
  const debrisParams = DEBRIS_PARAMS[debrisType] || DEBRIS_PARAMS[0];
  const speedMul = debrisParams.speedMul;
  
  // Применяем замедление от мусора к желаемой скорости
  const adjustedDesiredX = desiredX * speedMul;
  const adjustedDesiredY = desiredY * speedMul;
  
  // Инерция от масла
  const grip = 1 - inertia;
  const response = 0.7 + grip * 12; // 1/сек: как быстро скорость меняется
  // Доля пути до желаемой скорости за этот кадр (0..1).
  // Малая доля на масле = скорость меняется медленно = скольжение.
  const blend = Math.min(1, response * dt);
  e.vx += (adjustedDesiredX - e.vx) * blend;
  e.vy += (adjustedDesiredY - e.vy) * blend;
}
