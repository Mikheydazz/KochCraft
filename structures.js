import {
  AIR, PLANKS, LOG, GLASS,
  WORLD_HEIGHT, CS, SEA_LEVEL, BIOME_PLAINS
} from './constants.js';
import { hash2 } from './noise.js';

const HOUSE_CHANCE = 0.10;
const HOUSE_HALF = 3;      // 7×7 стены, 5×5 внутри
const ROOF_OVERHANG = 1;   // крыша 9×9

/* Локальная запись блока в чанк (за границами — молча игнорируем). */
function setBlock(chunk, wx, wy, wz, v) {
  const lx = wx - chunk.cx * CS;
  const lz = wz - chunk.cz * CS;
  if (lx < 0 || lx >= CS || lz < 0 || lz >= CS) return;
  if (wy < 0 || wy >= WORLD_HEIGHT) return;
  chunk.blocks[chunk.idx(lx, wy, lz)] = v;
}

/* ============================================================
   Точка входа — вызывается из generateChunk ПОСЛЕ деревьев,
   но ДО наложения сохранённых изменений.
   ============================================================ */
export function tryPlaceStructures(chunk, terrainHeight, biomeAt) {
  const { cx, cz } = chunk;

  // 1) шанс 10% на чанк
  const roll = hash2(cx * 101 + 17, cz * 103 + 23);
  if (roll >= HOUSE_CHANCE) return;

  // 2) позиция центра дома внутри чанка.
  //    Полуразмер крыши = HOUSE_HALF + ROOF_OVERHANG = 4,
  //    поэтому центр ставим в 4..11, чтобы крыша не вылезла за чанк.
  const rx = 4 + Math.floor(hash2(cx + 999, cz - 111) * 8);   // 4..11
  const rz = 4 + Math.floor(hash2(cx - 777, cz + 333) * 8);   // 4..11
  const wx0 = cx * CS + rx;
  const wz0 = cz * CS + rz;

  // 3) биом и высота в центре
  const h0 = terrainHeight(wx0, wz0);
  if (h0 <= SEA_LEVEL + 1) return;
  if (biomeAt(wx0, wz0, h0) !== BIOME_PLAINS) return;

  // 4) площадка должна быть плоской (иначе дом повиснет в воздухе)
  for (let dz = -HOUSE_HALF; dz <= HOUSE_HALF; dz++) {
    for (let dx = -HOUSE_HALF; dx <= HOUSE_HALF; dx++) {
      if (terrainHeight(wx0 + dx, wz0 + dz) !== h0) return;
    }
  }

  buildHouse(chunk, wx0, wz0, h0);
}

/* ============================================================
   Домик 7×7 с плоской крышей 9×9
   ============================================================ */
function buildHouse(chunk, wx0, wz0, baseY) {
  const H = HOUSE_HALF;

  // --- 1. Пол и расчистка неба над домом ---
  for (let dz = -H; dz <= H; dz++) {
    for (let dx = -H; dx <= H; dx++) {
      const wx = wx0 + dx, wz = wz0 + dz;
      // убираем всё, что выше уровня пола: листву, стволы, снег и т.п.
      for (let y = baseY + 1; y < WORLD_HEIGHT; y++) {
        setBlock(chunk, wx, y, wz, AIR);
      }
      // пол из досок
      setBlock(chunk, wx, baseY, wz, PLANKS);
    }
  }

  // --- 2. Стены: периметр 7×7, высота 3 ---
  for (let dz = -H; dz <= H; dz++) {
    for (let dx = -H; dx <= H; dx++) {
      const onEdge = (Math.abs(dx) === H || Math.abs(dz) === H);
      if (!onEdge) continue;

      const isCorner = (Math.abs(dx) === H && Math.abs(dz) === H);
      const wx = wx0 + dx, wz = wz0 + dz;
      for (let y = baseY + 1; y <= baseY + 3; y++) {
        setBlock(chunk, wx, y, wz, isCorner ? LOG : PLANKS);
      }
    }
  }

  // --- 3. Дверь: центр стороны -Z, высота 2 ---
  for (let y = baseY + 1; y <= baseY + 2; y++) {
    setBlock(chunk, wx0, y, wz0 - H, AIR);
  }

  // --- 4. Окна: 8 стёкол на уровне baseY+2 ---
  // стороны -Z / +Z
  setBlock(chunk, wx0 - 2, baseY + 2, wz0 - H, GLASS);
  setBlock(chunk, wx0 + 2, baseY + 2, wz0 - H, GLASS);
  setBlock(chunk, wx0 - 2, baseY + 2, wz0 + H, GLASS);
  setBlock(chunk, wx0 + 2, baseY + 2, wz0 + H, GLASS);
  // стороны -X / +X
  setBlock(chunk, wx0 - H, baseY + 2, wz0 - 2, GLASS);
  setBlock(chunk, wx0 - H, baseY + 2, wz0 + 2, GLASS);
  setBlock(chunk, wx0 + H, baseY + 2, wz0 - 2, GLASS);
  setBlock(chunk, wx0 + H, baseY + 2, wz0 + 2, GLASS);

  // --- 5. Крыша: плоские доски 9×9 с выступом 1 блок ---
  const R = H + ROOF_OVERHANG;   // 4
  for (let dz = -R; dz <= R; dz++) {
    for (let dx = -R; dx <= R; dx++) {
      setBlock(chunk, wx0 + dx, baseY + 4, wz0 + dz, PLANKS);
    }
  }
}