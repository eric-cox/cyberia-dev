// ============================================================
//  render/TerrainPainter — запекание ландшафта в canvas:
//    paintTerrain(map)     → большой offscreen-canvas мира;
//    paintMinimapBase(map) → база миникарты (1px на тайл).
//  Функции от WorldMap: с появлением чанков здесь появится
//  докраска по требованию — симуляцию это не затронет.
// ============================================================
import { TILE, T } from "../core/Constants.js";
import { mulberry32 } from "../core/Rng.js";

const SNOW_BASE = ["#dfe9f5", "#cddcf0", "#b7c9e2", "#9fb4d3"];
const SNOW_SPECK = ["#c9d8ec", "#b9cbe4", "#a5b9d6", "#8da4c6"];
const SNOW_HI = ["#ffffff", "#e6f0fb", "#d5e4f6", "#c9d8ec"];

export function paintTerrain(map) {
  const cv = document.createElement("canvas");
  cv.width = map.widthPx;
  cv.height = map.heightPx;
  const ctx = cv.getContext("2d");
  const rng = mulberry32((map.seed ^ 0x5eedbeef) >>> 0);

  for (let ty = 0; ty < map.size; ty++)
    for (let tx = 0; tx < map.size; tx++) {
      const t = map.get(tx, ty);
      const px = tx * TILE;
      const py = ty * TILE;

      if (t === T.HOLE) {
        ctx.fillStyle = "#0b1a33";
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = "#060f22";
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        // ледяная кромка
        for (let i = 0; i < 7; i++) {
          ctx.fillStyle = rng() < 0.5 ? "#bfe3ff" : "#7fd7ff";
          ctx.fillRect(
            px + Math.floor(rng() * TILE),
            py + (rng() < 0.5 ? 0 : TILE - 1),
            1,
            1
          );
          ctx.fillRect(
            px + (rng() < 0.5 ? 0 : TILE - 1),
            py + Math.floor(rng() * TILE),
            1,
            1
          );
        }
        // трещины
        ctx.fillStyle = "rgba(127,215,255,0.55)";
        let cx = px + 2 + rng() * 6;
        let cy = py + 2;
        for (let s = 0; s < 9; s++) {
          ctx.fillRect(cx | 0, cy | 0, 1, 1);
          cx += rng() * 2 - 0.6;
          cy += 1.1;
        }
        continue;
      }

      // снег (под скалами/деревьями тоже)
      const depth = t <= T.SNOW3 ? t : 1 + Math.floor(rng() * 2);
      ctx.fillStyle = SNOW_BASE[depth];
      ctx.fillRect(px, py, TILE, TILE);
      const n = 5 + Math.floor(rng() * 5);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = rng() < 0.62 ? SNOW_SPECK[depth] : SNOW_HI[depth];
        ctx.fillRect(
          px + Math.floor(rng() * TILE),
          py + Math.floor(rng() * TILE),
          1,
          1
        );
      }
      if (depth === 3) {
        // бархан в сугробе
        ctx.fillStyle = SNOW_HI[3];
        const wy = py + 3 + Math.floor(rng() * 8);
        ctx.fillRect(px + 1, wy, TILE - 2 - Math.floor(rng() * 4), 1);
      }

      if (t === T.ROCK) {
        const o = Math.floor(rng() * 3);
        ctx.fillStyle = "#3d4d6b";
        ctx.fillRect(px + 1, py + 2, 14, 13);
        ctx.fillStyle = "#55688a";
        ctx.fillRect(px + 1 + o, py + 1, 13 - o, 11);
        ctx.fillStyle = "#7d92b5";
        ctx.fillRect(px + 2 + o, py + 2, 6, 3);
        ctx.fillStyle = "#e8f2ff";
        ctx.fillRect(px + 2, py + 1, 9 - o, 2);
        ctx.fillStyle = "#2f3d54";
        ctx.fillRect(px + 2, py + 13, 12, 2);
      } else if (t === T.TREE) {
        // тень дерева (крона рисуется спрайтом в проходе сущностей)
        ctx.fillStyle = "rgba(10,15,30,0.32)";
        ctx.fillRect(px + 2, py + 9, 12, 5);
        ctx.fillStyle = "rgba(10,15,30,0.18)";
        ctx.fillRect(px + 4, py + 7, 8, 2);
      }
    }
  return cv;
}

export function paintMinimapBase(map) {
  const cv = document.createElement("canvas");
  cv.width = map.size;
  cv.height = map.size;
  const ctx = cv.getContext("2d");
  const snow = ["#c9d8ec", "#b0c3de", "#93aad0", "#7b96bf"];
  for (let ty = 0; ty < map.size; ty++)
    for (let tx = 0; tx < map.size; tx++) {
      const t = map.get(tx, ty);
      ctx.fillStyle =
        t === T.ROCK
          ? "#3d4d6b"
          : t === T.HOLE
            ? "#1e4a73"
            : t === T.TREE
              ? "#5a718f"
              : snow[t];
      ctx.fillRect(tx, ty, 1, 1);
    }
  return cv;
}
