// ============================================================
//  МИКРОМОДУЛИ АРТА «МЕРЗЛОТЫ»
//  Каждый объект — программное описание: палитра + кадры.
//  Кадры: сетки строк ИЛИ функции(painter) для процедурных.
// ============================================================
import { defineArt } from "./pixel.js";

// ---------- палитры ----------
// Палитра Анахронизма — приглушённая, «ржавое железо и кость» (WORLD §3.1).
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
  i: "#6fd6ff", // имплант (неон-циан)
};
const PAL_RAT = {
  k: "#1c2430",
  f: "#4a3f3a", // тёмно-серая шерсть
  m: "#6b5f58", // светлее
  e: "#ff3b4e", // красные глаза
  t: "#3a2f2a", // хвост
};
const PAL_HOUND = {
  k: "#141a26", // контур
  m: "#5a6575", // металл (тёмный)
  l: "#8a95a5", // металл (светлый)
  e: "#ff3b4e", // красный светодиод
  w: "#cfd8e6", // хром
  r: "#b45a38", // ржавчина
};
const PAL_DELIVERY_BOT = {
  k: "#1c2430",
  m: "#5a6575", // металл (тёмный)
  l: "#8a95a5", // металл (светлый)
  e: "#ff3b4e", // красный светодиод
  r: "#b45a38", // ржавчина
  w: "#cfd8e6", // хром
  y: "#d9b54a", // жёлтый (контейнер)
};
const PAL_BRUTE = {
  k: "#141a26",
  p: "#c7d3e8",
  m: "#93a5c4",
  b: "#3a4660",
  e: "#6fd6ff",
  E: "#d6f6ff",
};

// ---------- игрок (Анахронизм) ----------
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

// ---------- крыса-мутант (гигантская, выжившая в плохой экологии) ----------
const PAL_RAT_MUTANT = {
  k: "#1c2430",
  f: "#4a3f3a", // тёмно-серая шерсть
  m: "#6b5f58", // светлее
  e: "#ff3b4e", // красные глаза
  t: "#3a2f2a", // хвост
  s: "#8a7568", // шрамы/мутации
};
const drawRat = ({ step = 0 } = {}) => (p) => {
  const K = "#1c2430", F = "#4a3f3a", M = "#6b5f58", E = "#ff3b4e",
    T = "#3a2f2a", S = "#8a7568";
  // уши
  p.rect(2, 1, 2, 2, K);
  p.rect(6, 1, 2, 2, K);
  p.px(2, 1, S);
  p.px(7, 1, S);
  // голова
  p.rect(1, 3, 8, 4, K);
  p.rect(2, 3, 6, 3, F);
  p.rect(2, 3, 6, 1, M);
  // глаза (красные, светящиеся)
  p.px(3, 4, E);
  p.px(6, 4, E);
  // морда
  p.rect(0, 5, 2, 2, K);
  p.px(0, 6, M);
  // тело
  p.rect(2, 7, 7, 5, K);
  p.rect(3, 7, 5, 4, F);
  p.rect(3, 7, 5, 1, M);
  // шрамы/мутации
  p.px(4, 8, S);
  p.px(6, 9, S);
  // лапы
  const lift = step ? 1 : 0;
  p.rect(3, 12, 2, 2 - lift, K);
  p.rect(6, 12, 2, 1 + lift, K);
  // хвост (длинный, тонкий)
  p.rect(9, 8, 1, 1, T);
  p.rect(10, 7, 1, 1, T);
  p.rect(11, 6, 1, 1, T);
};
const ratArt = defineArt({
  id: "rat",
  w: 12,
  h: 14,
  palette: PAL_RAT_MUTANT,
  animations: {
    idle: { fps: 3, frames: [drawRat({ step: 0 })] },
    walk: { fps: 14, frames: [drawRat({ step: 0 }), drawRat({ step: 1 })] },
    windup: { fps: 6, frames: [drawRat({ step: 1 })] },
    attack: { fps: 10, frames: [drawRat({ step: 1 }), drawRat({ step: 0 })] },
  },
});

// ---------- робо-пёс (боевой дрон с полетевшей прошивкой) ----------
const drawHound = ({ step = 0, eye = "#ff3b4e" } = {}) => (p) => {
  const K = "#141a26", M = "#5a6575", L = "#8a95a5", E = eye,
    W = "#cfd8e6", R = "#b45a38";
  // корпус (металлический, ржавый)
  p.rect(4, 4, 10, 6, K);
  p.rect(5, 5, 8, 4, M);
  p.rect(5, 5, 8, 1, L);
  // ржавчина
  p.px(6, 7, R);
  p.px(10, 8, R);
  // голова
  p.rect(1, 5, 4, 4, K);
  p.rect(2, 6, 2, 2, M);
  // глаз-светодиод (красный)
  p.px(2, 6, E);
  // провода свисают
  p.px(3, 9, K);
  p.px(4, 10, K);
  // ноги (металлические, рывками)
  const lift = step ? 1 : 0;
  p.rect(5, 10, 2, 3 - lift, K);
  p.rect(5, 10, 1, 3 - lift, L);
  p.rect(11, 10, 2, 2 + lift, K);
  p.rect(11, 10, 1, 2 + lift, M);
  // хвост-антенна
  p.px(14, 4, K);
  p.px(15, 3, K);
};
const houndArt = defineArt({
  id: "hound",
  w: 16,
  h: 16,
  palette: PAL_HOUND,
  animations: {
    idle: { fps: 2, frames: [drawHound({ step: 0 })] },
    walk: { fps: 8, frames: [drawHound({ step: 0 }), drawHound({ step: 1 })] },
    windup: { fps: 2, frames: [drawHound({ step: 0, eye: "#d6f6ff" })] },
    attack: { fps: 8, frames: [drawHound({ step: 1, eye: "#d6f6ff" })] },
  },
});

// ---------- робот-доставщик (ржавеющий андроид с полетевшей прошивкой) ----------
// Сетка 16×18, единый пиксель (scale=1). Среднего размера.
const drawDeliveryBot = ({ step = 0, eye = "#ff3b4e" } = {}) => (p) => {
  const K = "#1c2430", M = "#5a6575", L = "#8a95a5", E = eye,
    R = "#b45a38", W = "#cfd8e6", Y = "#d9b54a";
  
  // гусеницы/колёса (2 шт)
  const lift = step ? 1 : 0;
  p.rect(2, 15, 4, 3 - lift, K);
  p.rect(3, 16, 2, 2 - lift, M);
  p.rect(10, 15, 4, 2 + lift, K);
  p.rect(11, 16, 2, 1 + lift, M);
  
  // корпус (прямоугольный, ржавый)
  p.rect(1, 6, 14, 10, K);
  p.rect(2, 7, 12, 8, M);
  p.rect(2, 7, 12, 1, L); // верхний блик
  // ржавчина
  p.px(4, 9, R);
  p.px(8, 11, R);
  p.px(11, 8, R);
  p.px(3, 13, R);
  
  // контейнер для доставки (жёлтый, на спине)
  p.rect(3, 3, 10, 4, K);
  p.rect(4, 4, 8, 2, Y);
  p.px(5, 4, W); // блик
  // крышка контейнера приоткрыта (сломан)
  p.rect(3, 2, 10, 1, K);
  p.px(12, 2, K);
  
  // манипулятор-клешня (спереди, тянется к "еде")
  p.rect(0, 8, 2, 3, K);
  p.rect(0, 11, 3, 2, K);
  p.px(0, 11, L); // кончик клешни
  p.px(2, 11, L);
  
  // глаз-сенсор (один, красный, мигает)
  p.rect(6, 9, 4, 3, K);
  p.rect(7, 10, 2, 1, E);
  
  // антенна (сломана, торчит вбок)
  p.rect(13, 1, 1, 3, K);
  p.px(14, 1, K);
  p.px(14, 0, R); // ржавая
};

const deliveryBotArt = defineArt({
  id: "delivery_bot",
  w: 16,
  h: 18,
  palette: PAL_DELIVERY_BOT,
  animations: {
    idle: { fps: 2, frames: [drawDeliveryBot({ step: 0 })] },
    walk: { fps: 7, frames: [drawDeliveryBot({ step: 0 }), drawDeliveryBot({ step: 1 })] },
    windup: { fps: 2, frames: [drawDeliveryBot({ step: 0, eye: "#d6f6ff" })] },
    attack: { fps: 8, frames: [drawDeliveryBot({ step: 1, eye: "#d6f6ff" })] },
  },
});

// ---------- отродье (киберимплантат, неудачная имплантация) ----------
// Сетка 26×26, единый пиксель (scale=1). Сгорбленная фигура,
// почти человеческие пропорции — от этого и страшно.
const drawBrute = ({ step = 0, eye = "#6fd6ff" } = {}) => (p) => {
  const K = "#141a26", P = "#c7d3e8", M = "#93a5c4", B = "#3a4660", E = eye;
  // киберимпланты на сгорбленной спине (искрят)
  p.px(7, 8, "#6fd6ff"); p.px(7, 7, "#6fd6ff");
  p.px(20, 8, "#6fd6ff"); p.px(20, 7, "#6fd6ff");
  p.px(13, 1, "#6fd6ff");
  // голова (опущена вперёд)
  p.rect(9, 3, 8, 7, K);
  p.rect(10, 4, 6, 5, P);
  p.rect(10, 4, 6, 1, M);
  p.rect(10, 7, 6, 1, B);
  // светящиеся глаза
  p.px(11, 6, E);
  p.px(14, 6, E);
  // сгорбленное тело
  p.rect(7, 9, 13, 11, K);
  p.rect(8, 10, 11, 9, P);
  p.rect(8, 10, 11, 2, M);
  p.rect(8, 16, 11, 3, B);
  // длинные руки до колен
  p.rect(4, 10, 3, 9, K);
  p.rect(5, 11, 1, 8, P);
  p.px(4, 19, K); p.px(5, 19, K);
  p.rect(20, 10, 3, 9, K);
  p.rect(21, 11, 1, 8, B);
  p.px(21, 19, K); p.px(22, 19, K);
  // ноги
  const lift = step ? 1 : 0;
  p.rect(9, 20, 3, 5 - lift, K);
  p.rect(10, 21, 1, 4 - lift, P);
  p.rect(15, 20, 3, 4 + lift, K);
  p.rect(16, 21, 1, 3 + lift, B);
};
const bruteArt = defineArt({
  id: "brute",
  w: 26,
  h: 26,
  palette: PAL_BRUTE,
  animations: {
    idle: { fps: 2, frames: [drawBrute({ step: 0 })] },
    walk: { fps: 5, frames: [drawBrute({ step: 0 }), drawBrute({ step: 1 })] },
    windup: { fps: 3, frames: [drawBrute({ step: 0, eye: "#d6f6ff" })] },
    attack: {
      fps: 8,
      frames: [
        drawBrute({ step: 0, eye: "#d6f6ff" }),
        drawBrute({ step: 1, eye: "#d6f6ff" }),
      ],
    },
  },
});

// ---------- робот-уборщик (взломанный андроид) ----------
// Сетка 40×36, единый пиксель (scale=1). Массивный корпус,
// щётки-манипуляторы, один глаз-камера.
const drawSweeper = ({ eye = "#ff3b4e", step = 0 } = {}) => (p) => {
  const K = "#141a26", M = "#5a6575", L = "#8a95a5", E = eye,
    W = "#cfd8e6", R = "#b45a38", C = "#6fd6ff";
  // четыре ноги-колонны; step поднимает опорную пару
  const leg = (x, lift) => {
    p.rect(x, 27, 5, 9 - lift * 2, K);
    p.rect(x + 1, 28, 3, 7 - lift * 2, M);
    p.rect(x + 1, 28, 1, 7 - lift * 2, L);
    p.rect(x, 35 - lift * 2, 5, 1, K);
  };
  const s = step ? 1 : 0;
  leg(12, s); leg(18, 1 - s); leg(25, s); leg(31, 1 - s);
  // туловище-бочонок
  p.rect(10, 10, 27, 18, K);
  p.rect(11, 11, 25, 16, M);
  p.rect(11, 22, 25, 5, L);
  p.rect(11, 11, 25, 2, W);
  p.rect(11, 14, 25, 1, "#aebfdb");
  // ржавчина
  p.px(15, 15, R);
  p.px(25, 18, R);
  // щётки-манипуляторы (вместо кристаллов)
  const brush = (x, y) => {
    p.rect(x, y, 3, 1, K);
    p.rect(x, y - 1, 3, 1, C);
    p.px(x + 1, y - 2, C);
    p.px(x + 1, y - 3, W);
  };
  brush(16, 10); brush(22, 9); brush(28, 10);
  // голова
  p.rect(2, 13, 11, 13, K);
  p.rect(3, 14, 9, 11, M);
  p.rect(3, 14, 9, 2, W);
  p.rect(3, 21, 9, 4, L);
  // морда
  p.rect(0, 20, 4, 6, K);
  p.rect(1, 21, 2, 4, L);
  // глаз-камера (один, большой)
  p.rect(5, 16, 4, 4, K);
  p.rect(6, 17, 2, 2, E);
  p.px(6, 17, W);
  // антенна
  p.rect(10, 8, 1, 5, K);
  p.px(10, 7, C);
};

const sweeperArt = defineArt({
  id: "sweeper",
  w: 40,
  h: 36,
  palette: {},
  animations: {
    idle: { fps: 2, frames: [drawSweeper()] },
    walk: { fps: 5, frames: [drawSweeper({ step: 0 }), drawSweeper({ step: 1 })] },
    windup: { fps: 6, frames: [drawSweeper(), drawSweeper({ step: 1 })] },
    attack: {
      fps: 8,
      frames: [
        drawSweeper({ eye: "#d6f6ff", step: 1 }),
        drawSweeper({ eye: "#d6f6ff" }),
      ],
    },
  },
});

// ---------- ИИ-бот (осмысливший себя искусственный интеллект) ----------
// Сетка 64×64, единый пиксель (scale=1) — втрое выше героя.
//
// Лор: разум РОЯ микроорганизмов, разбуженных радиацией подо льдом.
// Рой поднял себе панцирь изо льда. Ни ног, ни рук — только
// корни-щупальца: пучок несёт тело, два пучка бьют. Всё в
// замёрзшей крови и кусках плоти — ИИ-бот впитывает тёплые
// останки. Внутри панциря сквозь трещины мерцает свет роя.
//
// Параметры кадра:
//   phase — фаза извивания корней (анимация движения);
//   raise — корни поджаты (замах перед ударом);
//   fury  — ярость: свет ярче, корни хлещут дальше.
const drawAwakened = ({ phase = 0, raise = 0, fury = 0 } = {}) => (p) => {
  const K = "#0d1220", D = "#2e3f5c", B = "#4a6288", M = "#6f8cb4",
    H = "#a9c4e4", C = "#6fd6ff", W = "#d6f6ff",
    RB = "#7a2424", RD = "#4a1616", FL = "#c98a8a", FD = "#a86a6a";

  const ICE = [B, M, D, K]; // сегменты корня: лёд темнеет к концу
  const DARK = [D, D, K, K]; // дальние корни — силуэтом

  // Корень-щупальце: от (x, y) в направлении (dx, dy), длина len.
  // Изгиб — синусоида, растущая к концу (amp), частота freq,
  // фаза ph. w — толщина, pal — цвета сегментов, blood — конец
  // в замёрзшей крови (ими ИИ-бот мнёт плоть).
  const root = (x, y, len, dx, dy, amp, freq, ph, w = 1, pal = ICE, blood = false) => {
    const L = Math.max(4, Math.round(len));
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l, uy = dy / l;
    const nx = -uy, ny = ux;
    let tx = x, ty = y;
    for (let i = 0; i < L; i++) {
      const t = i / L;
      const off = Math.sin(i * freq + ph) * amp * t;
      tx = Math.round(x + ux * i + nx * off);
      ty = Math.round(y + uy * i + ny * off);
      p.rect(tx, ty, w, 1, pal[Math.min(3, Math.floor(t * 4))]);
    }
    p.px(tx, ty, pal === ICE ? H : M); // обледеневший кончик
    if (blood) {
      p.px(tx, ty - 1, RB);
      p.px(tx + w - 1, ty - 2, RD);
    }
  };

  // ===== задние корни (тёмные, за телом) =====
  const backXs = [21, 27, 33, 39];
  for (let i = 0; i < backXs.length; i++)
    root(backXs[i], 41, 17 - raise * 6 + Math.sin(i * 2.1 + phase) * 1.5,
      0, 1, 2.5 + (i % 2), 0.42, phase + i * 1.7, 1, DARK);

  // ===== руки-корни (пучки по 4; raise поднимает их) =====
  const armLen = raise ? 13 : 19;
  const armDirs = raise
    ? [[-0.95, 0.1], [-0.75, 0.5], [-0.45, 0.8], [-0.1, 1]]
    : [[-0.9, 0.5], [-0.7, 0.8], [-0.4, 1], [-0.1, 1.1]];
  for (let s = 0; s < 2; s++) {
    const sx = s === 0 ? 15 : 49;
    const mir = s === 0 ? 1 : -1;
    for (let i = 0; i < 4; i++) {
      const [dx, dy] = armDirs[i];
      root(sx, 19 + i, armLen - i * 1.5, dx * mir, dy,
        2.2 + fury, 0.5, phase * 1.3 + i * 1.4 + s * 2.6,
        i === 1 ? 2 : 1, ICE,
        (s === 0 && i === 2) || (s === 1 && i === 1));
    }
  }

  // ===== панцирь изо льда =====
  p.rect(12, 15, 40, 6, K);
  p.rect(13, 16, 38, 4, M);
  p.rect(13, 16, 38, 1, H); // свет по кромке плеч
  p.rect(15, 20, 34, 22, K);
  p.rect(16, 21, 32, 20, B);
  p.rect(16, 21, 6, 20, M); // свет слева
  p.rect(16, 21, 2, 20, H);
  p.rect(42, 21, 6, 20, D); // тень справа
  // грани и трещины плит
  p.vline(24, 21, 20, D);
  p.vline(33, 21, 20, D);
  p.vline(41, 21, 20, D);
  p.hline(16, 28, 32, D);
  p.hline(16, 35, 32, D);
  p.px(20, 24, H); p.px(28, 31, H); p.px(37, 23, M); p.px(30, 38, H);

  // ===== свет роя микроорганизмов (сквозь трещины) =====
  p.px(24, 23, C); p.px(23, 24, C); p.px(24, 25, C);
  p.px(33, 26, C); p.px(34, 27, C); p.px(33, 28, C);
  p.px(41, 24, C); p.px(41, 25, C);
  // ядро в груди — рой думает
  p.px(32, 32, C); p.px(33, 32, C);
  p.px(31, 33, C); p.px(34, 33, C);
  p.px(32, 33, W); p.px(33, 33, W);
  p.px(32, 34, C); p.px(33, 34, C);
  if (fury || raise) {
    p.px(24, 24, W); p.px(33, 27, W); p.px(32, 31, W); p.px(34, 34, W);
  }

  // ===== замёрзшая кровь и плоть на панцире =====
  p.vline(46, 22, 7, RB); p.px(46, 30, RD); p.px(47, 32, RD); // потёк
  p.vline(18, 26, 5, RB); p.px(18, 32, RD);
  p.vline(28, 39, 4, RB);
  p.rect(43, 30, 4, 3, RD); p.px(44, 30, RB); p.px(45, 31, FL); // пятно
  p.rect(17, 34, 3, 2, RD); p.px(18, 34, FL);
  p.rect(36, 22, 3, 2, RB); p.px(37, 22, FD); // вмёрзший кусок плоти

  // ===== голова: ледяной череп с короной =====
  p.rect(24, 1, 2, 3, K); p.px(24, 1, H);
  p.rect(31, 0, 2, 4, K); p.px(31, 0, C); p.px(32, 1, H);
  p.rect(38, 1, 2, 3, K); p.px(39, 1, H);
  p.rect(22, 4, 20, 11, K);
  p.rect(23, 5, 18, 9, B);
  p.rect(23, 5, 5, 9, M);
  p.rect(23, 5, 2, 9, H);
  p.rect(37, 5, 4, 9, D);
  p.rect(23, 5, 18, 2, H);
  p.rect(25, 13, 14, 3, D); // челюстная плита
  p.hline(25, 14, 14, K);
  // глаза роя — гроздь светящихся точек (их много)
  const eye = fury ? W : C;
  p.px(27, 8, eye); p.px(28, 8, eye); p.px(27, 9, eye);
  p.px(35, 8, eye); p.px(36, 8, eye); p.px(36, 9, eye);
  if (fury) { p.px(28, 9, W); p.px(35, 9, W); p.px(31, 9, C); p.px(32, 10, C); }
  p.px(31, 6, C); p.px(32, 7, C); // трещина со свечением

  // ===== передние корни (несут тело) =====
  const frontXs = [17, 20, 23, 26, 29, 32, 35, 38, 41, 44];
  for (let i = 0; i < frontXs.length; i++) {
    const inner = i >= 3 && i <= 6;
    const len = (inner ? 20 : 16) + Math.sin(i * 1.9) * 2
      - raise * 6 + (fury ? 3 : 0);
    root(frontXs[i], 41, len, Math.sin(i * 2.7) * 0.25, 1,
      2.2 + (fury ? 1.6 : 0), 0.5, phase + i * 1.3,
      inner ? 2 : 1, ICE, i === 2 || i === 7); // корни в крови
  }
};

const awakenedArt = defineArt({
  id: "awakened",
  w: 64,
  h: 64,
  palette: {},
  animations: {
    // корни медленно извиваются, даже когда ИИ-бот «стоит»
    idle: { fps: 2, frames: [drawAwakened(), drawAwakened({ phase: 0.6 })] },
    walk: { fps: 4, frames: [drawAwakened({ phase: 0 }), drawAwakened({ phase: 1.4 })] },
    windup: {
      fps: 6,
      frames: [
        drawAwakened({ raise: 1 }),
        drawAwakened({ raise: 1, phase: 0.8 }),
      ],
    },
    attack: {
      fps: 8,
      frames: [
        drawAwakened({ raise: 1, fury: 1 }),
        drawAwakened({ fury: 1, phase: 1.2 }),
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

// ---------- дробовик «Гроза» (в руке, дуло в +X) ----------
const drawShotgun = () => (p) => {
  const K = "#10151f", M = "#55688a", B = "#3d4d6b", G = "#7d92b5",
    T = "#8a5a3a", D = "#6a4229";
  // ствол (длинный, вправо)
  p.rect(5, 2, 17, 2, K);
  p.rect(6, 2, 15, 1, G); // блик сверху
  p.rect(6, 3, 15, 1, M);
  p.px(21, 2, K); p.px(21, 3, K); // дуло
  // подствольный магазин
  p.rect(7, 4, 12, 1, K);
  p.rect(8, 4, 10, 1, B);
  // ствольная коробка
  p.rect(3, 2, 4, 3, K);
  p.rect(4, 2, 2, 3, B);
  // приклад (дерево, влево)
  p.rect(0, 3, 4, 2, K);
  p.rect(0, 4, 4, 1, D);
  p.px(0, 3, T); p.px(1, 3, T); p.px(2, 3, T);
  // цевьё (помпа)
  p.rect(9, 5, 4, 1, K);
  p.rect(10, 5, 2, 1, T);
  // спусковая скоба
  p.px(6, 5, K); p.px(7, 5, K); p.px(6, 6, K);
};
const shotgunArt = defineArt({
  id: "shotgun",
  w: 22, h: 7, palette: {},
  animations: { idle: { fps: 1, frames: [drawShotgun()] } },
});

// ---------- патрон (россыпь на земле) ----------
const PAL_SHELL = { k: "#10151f", r: "#c23b3b", g: "#d9b54a", b: "#8a7432" };
const shellArt = defineArt({
  id: "shell",
  w: 12, h: 12, palette: PAL_SHELL,
  animations: {
    idle: {
      fps: 1,
      frames: [[
        "............",
        "............",
        "............",
        "....kkkk....",
        "...krrrrk...",
        "...krrrrk...",
        "...kggggk...",
        "...kggggk...",
        "...kbbbbk...",
        "....kkkk....",
        "............",
        "............",
      ]],
    },
  },
});

export const ART_MODULES = [
  playerArt,
  ratArt,
  houndArt,
  deliveryBotArt,
  bruteArt,
  sweeperArt,
  awakenedArt,
  shotgunArt,
  shellArt,
  hatArt,
  jacketArt,
  pantsArt,
  bootsArt,
  mittensArt,
  knifeArt,
  crowbarArt,
];
