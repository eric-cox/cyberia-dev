// ============================================================
//  world/streetTypes.js — классификация улиц и их параметры
// ============================================================

// Типы улиц
export const STREET_TYPE = {
  BUILDING: 0,      // зона застройки (здания)
  ROADWAY: 1,       // проезжая часть
  SIDEWALK: 2,      // тротуар
  PLAZA: 3,         // площадь
  TRANSITION: 4,    // переход (бордюр)
};

// Направления улиц
export const STREET_DIR = {
  NONE: 0,
  HORIZONTAL: 1,
  VERTICAL: 2,
  INTERSECTION: 3,
  TURN: 4,
};

// Параметры типов улиц
export const STREET_PARAMS = {
  highway: {
    roadWidth: [5, 7],      // ширина проезжей части
    sidewalkWidth: 2,       // ширина тротуара с каждой стороны
    totalWidth: [9, 11],    // общая ширина
  },
  alley: {
    roadWidth: [2, 3],
    sidewalkWidth: 1,
    totalWidth: [4, 5],
  },
  pedestrian: {
    roadWidth: 0,           // нет проезжей части
    sidewalkWidth: [3, 5],
    totalWidth: [3, 5],
  },
};

// Стороны бордюра (битовая маска)
export const CURB_SIDE = {
  NONE: 0,
  NORTH: 1,
  EAST: 2,
  SOUTH: 4,
  WEST: 8,
};
