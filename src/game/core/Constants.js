// ============================================================
//  core/Constants — неизменяемые константы мира.
//  (Типы ячеек и их параметры — в world/tiles.js;
//   балансные числа — в systems/Difficulty.)
// ============================================================
export const TILE = 16; // размер тайла в px
export const MAP_TILES = 128; // карта 128×128 тайлов
export const WORLD_PX = MAP_TILES * TILE;
export const ZOOM = 2; // масштаб отрисовки мира
