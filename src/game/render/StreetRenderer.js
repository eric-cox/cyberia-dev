// ============================================================
//  render/StreetRenderer.js — отрисовка улиц
//  Упрощённая версия: один проход вместо 5 слоёв (KISS).
// ============================================================

import { TILE } from "../core/Constants.js";
import { STREET_TYPE, STREET_DIR, CURB_SIDE } from "../world/streetTypes.js";

export function renderStreets(ctx, streetNetwork) {
  for (let y = 0; y < streetNetwork.size; y++) {
    for (let x = 0; x < streetNetwork.size; x++) {
      const idx = y * streetNetwork.size + x;
      const streetType = streetNetwork.streetType[idx];
      const streetDir = streetNetwork.streetDir[idx];
      const px = x * TILE;
      const py = y * TILE;

      // Слой 1: Базовое покрытие
      if (streetType === STREET_TYPE.ROADWAY) {
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(px, py, TILE, TILE);
      } else if (streetType === STREET_TYPE.SIDEWALK) {
        ctx.fillStyle = "#8a8a8a";
        ctx.fillRect(px, py, TILE, TILE);
      } else if (streetType === STREET_TYPE.PLAZA) {
        ctx.fillStyle = "#9a9a9a";
        ctx.fillRect(px, py, TILE, TILE);
      }

      // Слой 2: Разметка
      if (streetType === STREET_TYPE.ROADWAY) {
        if (streetDir === STREET_DIR.HORIZONTAL && y % 2 === 0 && x % 3 !== 0) {
          ctx.fillStyle = "#ffcc00";
          ctx.fillRect(px, py + TILE / 2 - 1, TILE, 2);
        } else if (streetDir === STREET_DIR.VERTICAL && x % 2 === 0 && y % 3 !== 0) {
          ctx.fillStyle = "#ffcc00";
          ctx.fillRect(px + TILE / 2 - 1, py, 2, TILE);
        }
      }

      // Слой 3: Бордюры
      const curbSide = streetNetwork.curbSide[idx];
      if (curbSide !== CURB_SIDE.NONE) {
        ctx.fillStyle = "#4a4a4a";
        if (curbSide & CURB_SIDE.NORTH) ctx.fillRect(px, py, TILE, 2);
        if (curbSide & CURB_SIDE.SOUTH) ctx.fillRect(px, py + TILE - 2, TILE, 2);
        if (curbSide & CURB_SIDE.EAST) ctx.fillRect(px + TILE - 2, py, 2, TILE);
        if (curbSide & CURB_SIDE.WEST) ctx.fillRect(px, py, 2, TILE);
      }

      // Слой 4: Инфраструктура (люки)
      if (streetNetwork.decoration[idx] === 2) {
        ctx.fillStyle = "#3a3a3a";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, TILE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Слой 5: Повреждения (лужи)
      if (streetNetwork.decoration[idx] === 4) {
        ctx.fillStyle = "rgba(100, 150, 200, 0.4)";
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      }
    }
  }
}
