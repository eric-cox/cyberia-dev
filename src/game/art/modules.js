// ============================================================
//  МИКРОМОДУЛИ АРТА «МЕРЗЛОТЫ»
//  Каждый объект — программное описание: палитра + кадры.
//  Кадры: сетки строк ИЛИ функции(painter) для процедурных.
// ============================================================
import { defineArt } from "./pixel.js";

// ---------- палитры ----------
// Палитра Тихохода — приглушённая, «ржавое железо и кость» (WORLD §3.1).
const PAL_PLAYER = {
  k: "#10151f", // контур
  f: "#6e4536", // шапка (пыльная кожа)
  g: "#cbbfa0", // мех (пыльная кость)
  h: "#d8a888", // кожа (почти не видна)
  e: "#181d26", // провал лица
  c: "#a55233", // куртка (ржавчина)
  d: "#82412a", // рукава темнее
  b: "#3a3f4a", // ремень
  p: "#414c5e", // штаны (холодный сине-серый)
  t: "#232936", // сапоги
};
const PAL_WOLF = {
  k: "#1c2430",
  w: "#a9bcae",
  m: "#7d8f82",
  r: "#ff3b4e",
  s: "#a8e6ff", // ледяные наросты
};
const PAL_BOAR = {
  k: "#1c2430",
  b: "#5f5248",
  m: "#463c34",
  e: "#ff3b4e",
  t: "#e8f2ff",
  s: "#a8e6ff",
};
const PAL_BRUTE = {
  k: "#141a26",
  p: "#c7d3e8",
  m: "#93a5c4",
  b: "#3a4660",
  e: "#6fd6ff",
  E: "#d6f6ff",
};
const PAL_TREE = {
  k: "#141a26",
  t: "#3a3342",
  d: "#2a2430",
  s: "#dfe9f5",
};

// ---------- игрок (Тихоход) ----------
// Реалистичные пропорции (WORLD §3.2): ушанка + тёмный провал лица,
// тяжёлая куртка с ремнём, длинные ноги. Голова ≈ 1/4 роста — вместе
// с крупной шапкой; само лицо — узкая тёмная щель, «почти не видно».
const P_TOP = [
  "................",
  "......kkkk......",
  ".....kffffk.....",
  "....kffffffk....",
  "...kggggggggk...", // меховая опушка ушанки
  "...kgeeeeeegk...", // провал лица
  "....kggggggk....", // воротник
  "...kcccccccck...",
  "..kdccccccccdk..",
  "..kdccccccccdk..",
  "..kdccbbbbccdk..", // ремень
  "..kdccccccccdk..",
  "...kccggggcck...", // меховая опушка куртки
];
const P_LEGS_A = [
  "....kppppppk....",
  "....kppk.kppk...",
  "....kppk.kppk...",
  "....kppk.kppk...",
  "....kppk.kppk...",
  "....kppk.kppk...",
  "....kttk.kttk...",
  "...ktttk.ktttk..",
  "..kttttk.kttttk.",
];
const P_LEGS_B = [
  "....kppppppk....",
  "....kppkkppk....",
  "...kppk..kppk...",
  "...kppk..kppk...",
  "..kppk....kppk..",
  "..kttk....kttk..",
  "..kttk.....kttk.",
  ".ktttk.....ktttk",
  ".ktttk.....ktttk",
];
const P_LEGS_C = [
  "....kppppppk....",
  "....kppk.kppk...",
  "....kppk.kppk...",
  "....kppk.kppk...",
  "....kttk.kppk...",
  "....kttk.kttk...",
  "....kttk.kttk...",
  "....kkk..ktttk..",
  ".........ktttk..",
];
const playerFrame = (legs) => P_TOP.concat(legs);
const attackFrame = P_TOP.slice(0, 8)
  .concat([
    "..kdcccccccccdk.", // руки выброшены вперёд
    "..kccccccccccdk.",
    ".kdccbbbbcccddk.",
    "..kdcccccccck...",
    "...kccggggcck...",
  ])
  .concat(P_LEGS_A);

const playerArt = defineArt({
  id: "player",
  w: 16,
  h: 22,
  palette: PAL_PLAYER,
  animations: {
    idle: { fps: 2, frames: [playerFrame(P_LEGS_A), playerFrame(P_LEGS_A)] },
    walk: {
      fps: 9,
      frames: [
        playerFrame(P_LEGS_A),
        playerFrame(P_LEGS_B),
        playerFrame(P_LEGS_A),
        playerFrame(P_LEGS_C),
      ],
    },
    attack: { fps: 10, frames: [attackFrame, playerFrame(P_LEGS_A)] },
    dead: { fps: 1, frames: [playerFrame(P_LEGS_A)] },
  },
});

// ---------- волк-мутант ----------
const W_TOP = [
  "................",
  "................",
  "...kk...........",
  "..kswk.......kk.",
  ".kwwwwk.kkkkkk..",
  ".kwrwwkkwwwwwwwk",
  ".kwwwwkwwwwwwwwk",
  "..kwwkwwwwwwwwk.",
  "..kk.wwwwwwwwk..",
  ".....kwwwwwwk...",
];
const W_LEGS_A = [
  ".....kww.kww....",
  ".....kww.kww....",
  ".....kww..kww...",
  "......kk...kk...",
  "................",
  "................",
];
const W_LEGS_B = [
  "....kww...kww...",
  "....kww...kww...",
  "...kww.....kww..",
  "....kk.....kk...",
  "................",
  "................",
];
const W_ATTACK = [
  ".....kww.kww....",
  ".....kww.kww....",
  ".....kww..kww...",
  "......kk...kk...",
  "................",
  "................",
];
const wolfArt = defineArt({
  id: "wolf",
  w: 16,
  h: 16,
  palette: PAL_WOLF,
  animations: {
    idle: { fps: 2, frames: [W_TOP.concat(W_LEGS_A)] },
    walk: {
      fps: 8,
      frames: [W_TOP.concat(W_LEGS_A), W_TOP.concat(W_LEGS_B)],
    },
    windup: {
      fps: 2,
      frames: [
        W_TOP.slice(0, 5).concat([
          ".kwrwwkkwwwwwwwk",
          ".kwwkwkwwwwwwwwk",
          "..kwwkkwwwwwwwk.",
          "..kk.kwwwwwwwk..",
          ".....kwwwwwwk...",
        ]).concat(W_ATTACK),
      ],
    },
    attack: {
      fps: 8,
      frames: [
        W_TOP.slice(0, 5).concat([
          ".kwrwwkkwwwwwwwk",
          ".kwwkwkwwwwwwwwk",
          "..kwwkkwwwwwwwk.",
          "..kk.kwwwwwwwk..",
          ".....kwwwwwwk...",
        ]).concat(W_LEGS_B),
      ],
    },
  },
});

// ---------- секач (мутировавший кабан) ----------
const B_TOP = [
  "................",
  "....kssk.kssk...",
  "...ksssskssssk..",
  "..kbbbbbbbbbbbk.",
  ".kbbbbbbbbbbbbk.",
  ".kbbbbbbbbbbbbk.",
  "ktbbebbbbbbbbbbk".slice(0, 16),
  "kttkbbbbbbbbbbbk",
  "kttkbbbbbbbbbbbk",
  ".ktkbbbbbbbbbbk.",
];
const B_LEGS_A = [
  "..kbkbbbbbbkbk..",
  "..kbkbbbbbbkbk..",
  "..kkk......kkk..",
  "................",
  "................",
  "................",
];
const B_LEGS_B = [
  "..kbkbbbbbbkbk..",
  ".kbk........kbk.",
  ".kkk........kkk.",
  "................",
  "................",
  "................",
];
const boarArt = defineArt({
  id: "boar",
  w: 16,
  h: 16,
  palette: PAL_BOAR,
  animations: {
    idle: { fps: 2, frames: [B_TOP.concat(B_LEGS_A)] },
    walk: {
      fps: 7,
      frames: [B_TOP.concat(B_LEGS_A), B_TOP.concat(B_LEGS_B)],
    },
    windup: { fps: 2, frames: [B_TOP.concat(B_LEGS_A)] },
    attack: { fps: 8, frames: [B_TOP.concat(B_LEGS_B)] },
  },
});

// ---------- отродье (крупный мутант) ----------
const BR_ROWS = [
  "....................",
  ".......kkkkkk.......",
  "......kppppppk......",
  ".....kpeppeppk......",
  ".....kppppppppk.....",
  "......kppppppk......",
  "...kkkkppppppkkkk...",
  "..kpppkppppppkpppk..",
  ".kppppkppppppkppppk.",
  ".kpmppkpbbbbpkpmppk.",
  ".kpppkppppppppkpppk.",
  "..kppkppppppppkppk..",
  "...kkppppppppppkk...",
  ".....kppppppppk.....",
  "....kppkppppkppk....",
  "....kppkppppkppk....",
  "....kppk....kppk....",
  "...kpppk....kpppk...",
  "...kkkkk....kkkkk...",
  "....................",
];
const BR_LEGS_B = [
  "....................",
  "....kppkppppkppk....",
  "...kppk.pppp.kppk...",
  "...kppk......kppk...",
  "..kpppk......kpppk..",
  "..kkkkk......kkkkk..",
];
const bruteArt = defineArt({
  id: "brute",
  w: 20,
  h: 20,
  palette: PAL_BRUTE,
  animations: {
    idle: { fps: 2, frames: [BR_ROWS] },
    walk: {
      fps: 5,
      frames: [
        BR_ROWS,
        BR_ROWS.slice(0, 14).concat(BR_LEGS_B),
      ],
    },
    windup: { fps: 3, frames: [BR_ROWS] },
    attack: {
      fps: 8,
      frames: [
        // яростные глаза + выпад
        BR_ROWS.map((r) => r.replaceAll("e", "E")),
        BR_ROWS.slice(0, 14).concat(BR_LEGS_B),
      ],
    },
  },
});

// ---------- мёртвое дерево ----------
const treeArt = defineArt({
  id: "tree",
  w: 16,
  h: 24,
  palette: PAL_TREE,
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          "................",
          "................",
          ".......kk.......",
          "......kttk......",
          "...k..kttk..k...",
          "...kk.kttk.kk...",
          "..kttkkttkkttk..",
          "...kk.kttks.kk..",
          "......kttk......",
          "..k...kttk......",
          "..kk..kttk..k...",
          "...kkskttk.kk...",
          ".....kttttk.....",
          ".....kttttk.....",
          "....ktttttk.....",
          "....ktttttk.....",
          "....ktttttk.....",
          "...kttttttk.....",
          "...kttttttk.....",
          "...kttttttk.....",
          "..kttttttttk....",
          "..kttdtttdttk...",
          ".kttttttttttk...",
          ".kkkkkkkkkkkk...",
        ],
      ],
    },
  },
});

// ---------- артефакты (12×12) ----------
const K = "#10151f";
const hatArt = defineArt({
  id: "it_hat",
  w: 12,
  h: 12,
  palette: { k: K, f: "#7a4a3a", s: "#ff4757", g: "#d9c9a8" },
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          "............",
          "...kkkkkk...",
          "..kffssffk..",
          ".kffffffffk.",
          ".kggggggggk.",
          "kggggggggggk",
          "kggk....kggk",
          "kggk....kggk",
          ".kk......kk.",
          "............",
          "............",
          "............",
        ],
      ],
    },
  },
});

const jacketArt = defineArt({
  id: "it_jacket",
  w: 12,
  h: 12,
  palette: { k: K, c: "#a8503a", z: "#262d3a", g: "#d9c9a8" },
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          "............",
          "...kkkkkk...",
          "..kccccccck.",
          ".kccczzccck.",
          ".kcccczcccck".slice(0, 12),
          ".kcccczcccck".slice(0, 12),
          ".kcccczcccck".slice(0, 12),
          ".kcccczcccck".slice(0, 12),
          ".kgggggggggk".slice(0, 12),
          "..kck..kck..",
          "..kk....kk..",
          "............",
        ],
      ],
    },
  },
});

const pantsArt = defineArt({
  id: "it_pants",
  w: 12,
  h: 12,
  palette: { k: K, p: "#3e4a5e", t: "#262d3a" },
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          "............",
          "...kkkkkk...",
          "..kpppppppk.",
          "..kpppppppk.",
          "..kppk.kppk.",
          "..kppk.kppk.",
          "..kppk.kppk.",
          "..kppk.kppk.",
          "..kttk.kttk.",
          "..kkk...kkk.",
          "............",
          "............",
        ],
      ],
    },
  },
});

const bootsArt = defineArt({
  id: "it_boots",
  w: 12,
  h: 12,
  palette: { k: K, t: "#5a4232", g: "#d9c9a8" },
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          "............",
          "............",
          "............",
          "............",
          "..kggk.kggk.",
          "..kttk.kttk.",
          "..kttk.kttk.",
          "..kttkkkttk.",
          ".kttttkktttk".slice(0, 12),
          ".kkkkkkkkkkk".slice(0, 12),
          "............",
          "............",
        ],
      ],
    },
  },
});

const mittensArt = defineArt({
  id: "it_mittens",
  w: 12,
  h: 12,
  palette: { k: K, g: "#b03a3a", h: "#d9c9a8" },
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          "............",
          "............",
          "............",
          "..kkk..kkk..",
          ".kgggk.kgggk".slice(0, 12),
          ".kgggkkkgggk".slice(0, 12),
          ".kgggg.kgggk".slice(0, 12),
          "..kggk..kggk",
          "..khhk..khhk",
          "...kk....kk.",
          "............",
          "............",
        ],
      ],
    },
  },
});

const knifeArt = defineArt({
  id: "it_knife",
  w: 12,
  h: 12,
  palette: { k: K, b: "#cfd8e6", h: "#5a4232", g: "#8a93a6" },
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          ".........kb.",
          "........kbbk".slice(0, 12),
          ".......kbbk.",
          "......kbbk..",
          ".....kbbk...",
          "....kbbk....",
          "...kggk.....",
          "..khhk......",
          ".khhk.......",
          ".khk........",
          ".kk.........",
          "............",
        ],
      ],
    },
  },
});

const crowbarArt = defineArt({
  id: "it_crowbar",
  w: 12,
  h: 12,
  palette: { k: K, r: "#c23b3b" },
  animations: {
    idle: {
      fps: 1,
      frames: [
        [
          ".......krrk.",
          "......krrk..",
          ".....krrk...",
          "....krrk....",
          "...krrk.....",
          "..krrk......",
          ".krrk.......",
          ".krrk.......",
          ".krrrk......",
          "..krrk......",
          "..kkk.......",
          "............",
        ],
      ],
    },
  },
});

// ---------- Ледяной носорог (процедурный кадр, крупный) ----------
const drawRhino = ({ eye = "#ff4757", step = 0 } = {}) => (p) => {
  const K = "#141a26", P = "#c7d3e8", M = "#93a5c4", H = "#d6f6ff", C = "#6fd6ff";
  // четыре ноги-колонны; step поднимает опорную пару (нога короче)
  const leg = (x, lift) => {
    p.rect(x, 14, 3, 6 - lift * 2, K);
    p.rect(x + 1, 15, 1, 4 - lift * 2, P);
  };
  const s = step ? 1 : 0;
  leg(7, s); leg(10, 1 - s); leg(14, s); leg(17, 1 - s);
  // туловище-бочонок
  p.rect(6, 5, 13, 11, K);
  p.rect(7, 6, 11, 9, P);
  p.rect(7, 12, 11, 3, M);
  // ледяные кристаллы на спине
  const spike = (x, y) => {
    p.px(x, y, K); p.px(x + 1, y, K); p.px(x + 2, y, K);
    p.px(x, y - 1, C); p.px(x + 1, y - 1, C); p.px(x + 2, y - 1, C);
    p.px(x + 1, y - 2, C);
  };
  spike(9, 5); spike(13, 4); spike(16, 5);
  // голова
  p.rect(1, 7, 7, 7, K);
  p.rect(2, 8, 5, 5, P);
  // морда
  p.rect(0, 11, 3, 3, K);
  p.px(1, 12, M);
  // рог изо льда
  p.rect(0, 3, 3, 9, K);
  p.rect(1, 4, 1, 7, H);
  p.px(1, 3, H);
  // ухо
  p.px(7, 6, K); p.px(8, 6, K); p.px(8, 7, P);
  // глаз
  p.px(5, 9, eye); p.px(6, 9, eye);
};

const rhinoArt = defineArt({
  id: "rhino",
  w: 20,
  h: 20,
  palette: {},
  animations: {
    idle: { fps: 2, frames: [drawRhino()] },
    walk: { fps: 5, frames: [drawRhino({ step: 0 }), drawRhino({ step: 1 })] },
    windup: { fps: 6, frames: [drawRhino(), drawRhino({ step: 1 })] },
    attack: {
      fps: 8,
      frames: [
        drawRhino({ eye: "#d6f6ff", step: 1 }),
        drawRhino({ eye: "#d6f6ff" }),
      ],
    },
  },
});

// ---------- мышь-мутант (крошечная, пищит на 12 кГц) ----------
const PAL_MOUSE = { k: "#1c2430", m: "#b9c3d6", p: "#f2a0b0", e: "#10151f" };
const M_A = [
  "............",
  "..kk....kk..",
  ".kppk..kppk.",
  ".kpmk..kmpk.",
  "..kmmkkmmk..",
  ".kmmmmmmmmk.",
  ".kmemmmmemk.",
  ".kmmmmmpmmk.",
  "..kmmmmmmk.k",
  "...kkkkkk.kk",
  ".........kpk",
];
const M_B = [
  "............",
  "..kk....kk..",
  ".kppk..kppk.",
  ".kpmk..kmpk.",
  "..kmmkkmmk..",
  ".kmmmmmmmmk.",
  ".kmemmmmemk.",
  ".kmmmmmpmmk.",
  "..kmmmmmmkk.",
  "...kkkkkkk..",
  "........kpkk",
];
const mouseArt = defineArt({
  id: "mouse",
  w: 12,
  h: 11,
  palette: PAL_MOUSE,
  animations: {
    idle: { fps: 3, frames: [M_A, M_B] },
    walk: { fps: 14, frames: [M_A, M_B] },
    windup: { fps: 6, frames: [M_B] },
    attack: { fps: 10, frames: [M_B, M_A] },
  },
});

// ---------- Ледяной голем (в 10 раз больше героя, рычит на 60 Гц) ----------
const drawGolem = ({ eye = "#6fd6ff", raise = 0, step = 0 } = {}) => (p) => {
  const K = "#0d1220", D = "#2e3f5c", B = "#4a6288", M = "#6f8cb4",
    H = "#a9c4e4", C = "#6fd6ff";

  // ===== руки (за туловищем) =====
  const aTop = raise ? 8 : 15;
  const aLen = 17;
  p.rect(4, aTop, 6, aLen, K);
  p.rect(5, aTop + 1, 4, aLen - 2, B);
  p.rect(5, aTop + 1, 2, aLen - 2, M);
  p.rect(3, aTop + aLen - 2, 8, 5, K);
  p.rect(4, aTop + aLen - 1, 6, 3, D);
  p.px(4, aTop + aLen - 1, C);
  p.rect(30, aTop + 1, 6, aLen, K);
  p.rect(31, aTop + 2, 4, aLen - 2, D);
  p.rect(29, aTop + aLen - 1, 8, 5, K);
  p.rect(30, aTop + aLen, 6, 3, D);

  // ===== ноги =====
  p.rect(10, 28, 8, 10, K);
  p.rect(11, 29, 6, 9, B);
  p.rect(11, 29, 2, 9, M);
  p.rect(22, 28, 8, 10, K);
  p.rect(23, 29, 6, 9, D);
  p.rect(8, 37, 11, 2, K);
  p.rect(21, 37, 11, 2, K);
  if (step) p.px(8, 36, H);
  else p.px(31, 36, H);

  // ===== туловище =====
  p.rect(8, 12, 24, 18, K);
  p.rect(9, 13, 22, 16, B);
  p.rect(9, 13, 6, 16, M);
  p.rect(9, 13, 22, 4, H);
  p.rect(27, 13, 4, 16, D);
  // ледяное ядро в груди
  p.rect(18, 17, 2, 7, C);
  p.rect(16, 19, 6, 2, C);
  p.px(19, 18, "#dfeaf7");
  p.rect(12, 25, 16, 1, D);
  p.rect(12, 27, 16, 1, D);

  // ===== плечи =====
  p.rect(5, 11, 30, 6, K);
  p.rect(6, 12, 28, 4, M);
  p.rect(6, 12, 28, 2, H);
  p.rect(5, 7, 5, 5, K);
  p.rect(6, 8, 3, 3, C);
  p.px(7, 7, "#dfeaf7");
  p.rect(30, 7, 5, 5, K);
  p.rect(31, 8, 3, 3, C);
  p.px(32, 7, "#dfeaf7");

  // ===== голова =====
  p.rect(14, 2, 12, 10, K);
  p.rect(15, 3, 10, 8, B);
  p.rect(15, 3, 3, 8, M);
  p.rect(15, 3, 10, 2, H);
  p.rect(23, 3, 2, 8, D);
  p.rect(15, 5, 10, 1, D);
  p.px(16, 7, eye); p.px(17, 7, eye);
  p.px(21, 7, eye); p.px(22, 7, eye);
  p.rect(16, 10, 8, 2, D);
  // ледяная корона
  p.rect(18, 0, 3, 3, K);
  p.px(18, 1, C); p.px(19, 1, "#dfeaf7"); p.px(20, 1, C);
  p.px(19, 0, C);
};

const golemArt = defineArt({
  id: "golem",
  w: 40,
  h: 40,
  palette: {},
  animations: {
    idle: { fps: 2, frames: [drawGolem()] },
    walk: { fps: 3, frames: [drawGolem({ step: 0 }), drawGolem({ step: 1 })] },
    windup: { fps: 6, frames: [drawGolem({ raise: 1, eye: "#a9e8ff" })] },
    attack: {
      fps: 8,
      frames: [
        drawGolem({ raise: 1, eye: "#d6f6ff" }),
        drawGolem({ raise: 0, eye: "#d6f6ff", step: 1 }),
      ],
    },
  },
});

export const ART_MODULES = [
  playerArt,
  wolfArt,
  boarArt,
  bruteArt,
  rhinoArt,
  mouseArt,
  golemArt,
  treeArt,
  hatArt,
  jacketArt,
  pantsArt,
  bootsArt,
  mittensArt,
  knifeArt,
  crowbarArt,
];
