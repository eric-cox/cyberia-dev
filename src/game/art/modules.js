// ============================================================
//  МИКРОМОДУЛИ АРТА «МЕРЗЛОТЫ»
//  Каждый объект — программное описание: палитра + кадры.
//  Кадры: сетки строк ИЛИ функции(painter) для процедурных.
// ============================================================
import { defineArt } from "./pixel.js";

// ---------- палитры ----------
const PAL_PLAYER = {
  k: "#10151f",
  f: "#7a4a3a", // шапка
  g: "#d9c9a8", // мех
  h: "#e0b090", // кожа
  e: "#20242c", // глаза
  c: "#b45a38", // куртка
  d: "#8a4229", // рукава
  p: "#3e4a5e", // штаны
  t: "#262d3a", // сапоги
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

// ---------- игрок ----------
const P_TOP = [
  "................",
  "....kkkkkkkk....",
  "...kffffffffk...",
  "..kfggggggggfk..",
  "..kfhhhhhhhhfk..",
  "..kfhehhhehhfk..",
  "..kfhhhhhhhhfk..",
  "...kffffffffk...",
  "....kccccccck...",
  "..kdccccccccdk..",
  "..kdccccccccdk..",
  "...kccgggccck...",
];
const P_LEGS_A = [
  "...kppppppppk...",
  "...kppk..kppk...",
  "...kttk..kttk...",
  "..ktttk..ktttk..",
];
const P_LEGS_B = [
  "...kppppppppk...",
  "..kppk...kppk...",
  "..kttk....kttk..",
  "..kttk....kttk..",
];
const P_LEGS_C = [
  "...kppppppppk...",
  "...kppk..kppk...",
  "..kttk....kttk..",
  ".kttk......kttk.",
];
const P_ATTK_LEGS = [
  "...kppppppppk...",
  "...kppppppppk...",
  "...kttk..kttk...",
  "..ktttk..ktttk..",
];
const playerFrame = (legs) => P_TOP.concat(legs);
const attackFrame = P_TOP.slice(0, 9)
  .concat([
    ".kdccccccccccdk.",
    ".kdccccccccccdk.",
    "...kccgggccck...",
  ])
  .concat(P_ATTK_LEGS);

const playerArt = defineArt({
  id: "player",
  w: 16,
  h: 16,
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

// ---------- тепловой orb (процедурные кадры) ----------
const orbArt = defineArt({
  id: "orb",
  w: 8,
  h: 8,
  palette: {},
  animations: {
    idle: {
      fps: 6,
      frames: [
        (p) => {
          p.disc(3, 3, 2, "#ffb347");
          p.px(3, 2, "#fff1c9");
          p.px(1, 1, "#ff8c42");
          p.px(5, 5, "#ff8c42");
        },
        (p) => {
          p.disc(3, 3, 2, "#ffb347");
          p.px(2, 3, "#fff1c9");
          p.px(5, 1, "#ffd9ac");
          p.px(4, 5, "#ff8c42");
          p.px(0, 4, "#ff8c42");
        },
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
  treeArt,
  hatArt,
  jacketArt,
  pantsArt,
  bootsArt,
  mittensArt,
  knifeArt,
  crowbarArt,
  orbArt,
];
