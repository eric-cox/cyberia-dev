// ============================================================
//  world/streetPrefabs.js — каталог префабов улиц
// ============================================================

export const STREET_PREFABS = {
  // Прямой сегмент улицы (горизонтальный)
  street_horizontal: {
    id: "street_horizontal",
    size: [7, 7],
    street_type: "highway",
    direction: "horizontal",
    layers: {
      ground: "asphalt_dark",
      markings: ["center_line_h", "edge_lines_h"],
      infrastructure: [],
      decay: "none"
    },
    neon_nodes: [],
    connections: {
      N: null,
      S: null,
      E: "street_horizontal",
      W: "street_horizontal"
    }
  },

  // Прямой сегмент улицы (вертикальный)
  street_vertical: {
    id: "street_vertical",
    size: [7, 7],
    street_type: "highway",
    direction: "vertical",
    layers: {
      ground: "asphalt_dark",
      markings: ["center_line_v", "edge_lines_v"],
      infrastructure: [],
      decay: "none"
    },
    neon_nodes: [],
    connections: {
      N: "street_vertical",
      S: "street_vertical",
      E: null,
      W: null
    }
  },

  // Перекрёсток
  intersection: {
    id: "intersection",
    size: [7, 7],
    street_type: "intersection",
    direction: "intersection",
    layers: {
      ground: "asphalt_dark",
      markings: ["crosswalk_N", "crosswalk_S", "crosswalk_E", "crosswalk_W", "stop_lines"],
      infrastructure: ["traffic_light_NE", "traffic_light_SW"],
      decay: "cracked_asphalt"
    },
    neon_nodes: [
      { x: 3, y: 0, color: "#ff0033", type: "traffic_light", flicker: false },
      { x: 3, y: 6, color: "#ff0033", type: "traffic_light", flicker: true }
    ],
    connections: {
      N: "street_vertical",
      S: "street_vertical",
      E: "street_horizontal",
      W: "street_horizontal"
    }
  },

  // Переулок (узкий)
  alley_straight: {
    id: "alley_straight",
    size: [4, 4],
    street_type: "alley",
    direction: "horizontal",
    layers: {
      ground: "asphalt_light",
      markings: ["center_line_h"],
      infrastructure: [],
      decay: "dirty"
    },
    neon_nodes: [],
    connections: {
      N: null,
      S: null,
      E: "alley_straight",
      W: "alley_straight"
    }
  },

  // Тупик
  dead_end: {
    id: "dead_end",
    size: [4, 4],
    street_type: "alley",
    direction: "horizontal",
    layers: {
      ground: "asphalt_light",
      markings: [],
      infrastructure: [],
      decay: "trash"
    },
    neon_nodes: [
      { x: 0, y: 2, color: "#ffaa00", type: "wall_light", flicker: true }
    ],
    connections: {
      N: null,
      S: null,
      E: null,
      W: "alley_straight"
    }
  },

  // Площадь
  plaza: {
    id: "plaza",
    size: [10, 10],
    street_type: "plaza",
    direction: "none",
    layers: {
      ground: "plaza_tiles",
      markings: [],
      infrastructure: ["bench", "trash_can"],
      decay: "none"
    },
    neon_nodes: [
      { x: 5, y: 5, color: "#00ffff", type: "hologram", flicker: false }
    ],
    connections: {
      N: "street_vertical",
      S: "street_vertical",
      E: "street_horizontal",
      W: "street_horizontal"
    }
  },

  // Поворот улицы (L-образный)
  turn_NE: {
    id: "turn_NE",
    size: [5, 5],
    street_type: "alley",
    direction: "turn",
    layers: {
      ground: "asphalt_light",
      markings: ["corner_marking"],
      infrastructure: [],
      decay: "none"
    },
    neon_nodes: [],
    connections: {
      N: "street_vertical",
      S: null,
      E: "street_horizontal",
      W: null
    }
  },

  turn_NW: {
    id: "turn_NW",
    size: [5, 5],
    street_type: "alley",
    direction: "turn",
    layers: {
      ground: "asphalt_light",
      markings: ["corner_marking"],
      infrastructure: [],
      decay: "none"
    },
    neon_nodes: [],
    connections: {
      N: "street_vertical",
      S: null,
      E: null,
      W: "street_horizontal"
    }
  },

  turn_SE: {
    id: "turn_SE",
    size: [5, 5],
    street_type: "alley",
    direction: "turn",
    layers: {
      ground: "asphalt_light",
      markings: ["corner_marking"],
      infrastructure: [],
      decay: "none"
    },
    neon_nodes: [],
    connections: {
      N: null,
      S: "street_vertical",
      E: "street_horizontal",
      W: null
    }
  },

  turn_SW: {
    id: "turn_SW",
    size: [5, 5],
    street_type: "alley",
    direction: "turn",
    layers: {
      ground: "asphalt_light",
      markings: ["corner_marking"],
      infrastructure: [],
      decay: "none"
    },
    neon_nodes: [],
    connections: {
      N: null,
      S: "street_vertical",
      E: null,
      W: "street_horizontal"
    }
  }
};

// Функция для получения случайного префаба по типу
export function getRandomStreetPrefab(type, rng) {
  const candidates = Object.values(STREET_PREFABS).filter(p => p.street_type === type);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}
