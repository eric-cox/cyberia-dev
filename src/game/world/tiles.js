// ============================================================
//  world/tiles — реестр ячеек карты. ЕДИНЫЙ источник параметров
//  ландшафта: каждая ячейка описана данными, не кодом.
//
//    speed   — коэффициент скорости передвижения (0..1);
//              0 = непроходимо;
//    inertia — коэффициент инерции (0..1): насколько ячейка
//              «продолжает» движение сама (скольжение).
//              0 — полный контроль, 1 — каток;
//    solid   — блокирует движение (коллизии).
//
//  НОВАЯ ЯЧЕЙКА = строка в TILE_TABLE + id в T + палитра в
//  render/TerrainPainter. Симуляция и физика подхватят её сами.
// ============================================================

export const T = {
  SNOW: 0, // обычный снег
  SNOW_DEEP: 1, // глубокий снег
  SNOW_VERY_DEEP: 2, // очень глубокий снег
  HOUSE: 3, // дом (непроходим)
  ICE: 4, // обычный лёд
  ICE_SMOOTH: 5, // гладкий лёд
  TREE: 6, // мёртвое дерево (препятствие)
};

export const TILE_TABLE = [
  { id: "snow", name: "Обычный снег", speed: 1, inertia: 0.2, solid: false },
  { id: "snowDeep", name: "Глубокий снег", speed: 0.9, inertia: 0.1, solid: false },
  { id: "snowVdeep", name: "Очень глубокий снег", speed: 0.7, inertia: 0, solid: false },
  { id: "house", name: "Дом", speed: 0, inertia: 0.2, solid: true },
  { id: "ice", name: "Обычный лёд", speed: 1, inertia: 0.5, solid: false },
  { id: "iceSmooth", name: "Гладкий лёд", speed: 1, inertia: 1, solid: false },
  { id: "tree", name: "Мёртвое дерево", speed: 0, inertia: 0.2, solid: true },
];

export function cellOf(t) {
  return TILE_TABLE[t] || TILE_TABLE[T.HOUSE];
}
