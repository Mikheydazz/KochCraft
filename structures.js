import {
  AIR, PLANKS, LOG, GLASS, BRICK_BLOCK,
  WOODEN_STAIRS,
  WORLD_HEIGHT, CS, SEA_LEVEL, BIOME_PLAINS
} from './constants.js';
import { hash2 } from './noise.js';

/* ============================================================
   Данные структуры «Школа» из school.json
   ============================================================ */
let SCHOOL_DATA = null;

export function setSchoolData(data) {
  if (!data || !Array.isArray(data.blocks) || !Array.isArray(data.size)) {
    SCHOOL_DATA = null;
    return;
  }
  SCHOOL_DATA = data;
}
export function hasSchoolData() { return !!SCHOOL_DATA; }

/* ============================================================
   ШКОЛА — размещение через чанки
   ============================================================ */

/* Определяет, должна ли существовать школа с «якорным» чанком (ocx, ocz).
   Возвращает { wx0, wy0, wz0, W, H, D } или null. */
function computeSchoolInfo(ocx, ocz, terrainHeight, biomeAt) {
  if (!SCHOOL_DATA) return null;

  const roll = hash2(ocx * 211 + 53, ocz * 217 + 97);
  if (roll >= SCHOOL_CHANCE) return null;

  const [W, H, D] = SCHOOL_DATA.size;

  // Позиция левого-нижнего-заднего угла внутри якорного чанка
  const rx = 4 + Math.floor(hash2(ocx + 1111, ocz - 2222) * 8);   // 4..11
  const rz = 4 + Math.floor(hash2(ocx - 3333, ocz + 4444) * 8);   // 4..11
  const wx0 = ocx * CS + rx;
  const wz0 = ocz * CS + rz;

  const h0 = terrainHeight(wx0, wz0);
  if (h0 <= SEA_LEVEL + 1) return null;
  if (biomeAt(wx0, wz0, h0) !== BIOME_PLAINS) return null;

  // Плоскостность: только углы и середина каждой стороны —
  // чтобы не отсеивать из-за одной мелкой кочки.
  const cxw = wx0 + (W >> 1);
  const czw = wz0 + (D >> 1);
  const samples = [
    [wx0,       wz0],
    [wx0 + W-1, wz0],
    [wx0,       wz0 + D-1],
    [wx0 + W-1, wz0 + D-1],
    [cxw,       czw],
    [cxw,       wz0],
    [cxw,       wz0 + D-1],
    [wx0,       czw],
    [wx0 + W-1, czw]
  ];
  for (const [sx, sz] of samples) {
    if (terrainHeight(sx, sz) !== h0) return null;
  }

  return { wx0, wy0: h0, wz0, W, H, D };
}

/* Пишет в chunk ту часть школы, которая в него попадает. */
function applySchoolToChunk(chunk, info) {
  const { wx0, wy0, wz0, W, H, D } = info;
  const cx = chunk.cx, cz = chunk.cz;

  const lx0 = wx0 - cx * CS;
  const lz0 = wz0 - cz * CS;
  const lx1 = lx0 + W;
  const lz1 = lz0 + D;

  // нет пересечения — выходим
  if (lx1 <= 0 || lx0 >= CS || lz1 <= 0 || lz0 >= CS) return false;

  const clampX0 = Math.max(0, lx0);
  const clampX1 = Math.min(CS, lx1);
  const clampZ0 = Math.max(0, lz0);
  const clampZ1 = Math.min(CS, lz1);

  // 1) чистим пересечение bounding box (сверху вниз)
  for (let dy = 0; dy < H; dy++) {
    const wy = wy0 + dy;
    if (wy < 0 || wy >= WORLD_HEIGHT) continue;
    for (let z = clampZ0; z < clampZ1; z++) {
      const base = wy * CS * CS + z * CS;
      for (let x = clampX0; x < clampX1; x++) {
        chunk.blocks[base + x] = AIR;
      }
    }
  }

  // 2) кладём блоки школы, попавшие в этот чанк
  for (const entry of SCHOOL_DATA.blocks) {
    if (!Array.isArray(entry) || entry.length < 4) continue;
    const [dx, dy, dz, id] = entry;
    const lx = lx0 + dx;
    const lz = lz0 + dz;
    if (lx < 0 || lx >= CS || lz < 0 || lz >= CS) continue;
    const wy = wy0 + dy;
    if (wy < 0 || wy >= WORLD_HEIGHT) continue;
    chunk.blocks[wy * CS * CS + lz * CS + lx] = id;
  }

  return true;
}

/* Вызывается из generateChunk ПОСЛЕ tryPlaceStructures.
   Сканирует 5×5 окрестность якорных чанков и применяет школы. */
export function applySchoolsToChunk(chunk, terrainHeight, biomeAt) {
  if (!SCHOOL_DATA) return false;
  let placed = false;
  for (let dcz = -2; dcz <= 2; dcz++) {
    for (let dcx = -2; dcx <= 2; dcx++) {
      const info = computeSchoolInfo(chunk.cx + dcx, chunk.cz + dcz,
                                     terrainHeight, biomeAt);
      if (info && applySchoolToChunk(chunk, info)) {
        placed = true;
        if (dcx === 0 && dcz === 0) {
          console.log('[school] построена на', info.wx0, info.wy0, info.wz0,
                      'размер', info.W, '×', info.H, '×', info.D);
        }
      }
    }
  }
  return placed;
}

const HOUSE_CHANCE = 0.10;
const HOUSE_HALF = 3;      // 7×7 стены, 5×5 внутри
const ROOF_OVERHANG = 1;   // крыша 9×9
const SCHOOL_CHANCE  = 0.02;   // 2% на чанк
const SCHOOL_HALF_X  = 6;      // ширина 13 блоков (X: -6..6)
const SCHOOL_HALF_Z  = 4;      // глубина 9 блоков (Z: -4..4)
const SCHOOL_OVERHANG_X = 1;   // свес крыши на 1 блок по X

/* Локальная запись блока в чанк (за границами — молча игнорируем). */
function setBlock(chunk, wx, wy, wz, v) {
  const lx = wx - chunk.cx * CS;
  const lz = wz - chunk.cz * CS;
  if (lx < 0 || lx >= CS || lz < 0 || lz >= CS) return;
  if (wy < 0 || wy >= WORLD_HEIGHT) return;
  chunk.blocks[chunk.idx(lx, wy, lz)] = v;
}

function computeHouseInfo(cx, cz, terrainHeight, biomeAt) {
  const roll = hash2(cx * 101 + 17, cz * 103 + 23);
  if (roll >= HOUSE_CHANCE) return null;

  const rx = 4 + Math.floor(hash2(cx + 999, cz - 111) * 8);
  const rz = 4 + Math.floor(hash2(cx - 777, cz + 333) * 8);
  const wx0 = cx * CS + rx;
  const wz0 = cz * CS + rz;

  const h0 = terrainHeight(wx0, wz0);
  if (h0 <= SEA_LEVEL + 1) return null;
  if (biomeAt(wx0, wz0, h0) !== BIOME_PLAINS) return null;

  for (let dz = -HOUSE_HALF; dz <= HOUSE_HALF; dz++)
    for (let dx = -HOUSE_HALF; dx <= HOUSE_HALF; dx++)
      if (terrainHeight(wx0 + dx, wz0 + dz) !== h0) return null;

  return { wx0, wy0: h0, wz0 };
}

/* ============================================================
   Точка входа — вызывается из generateChunk ПОСЛЕ деревьев,
   но ДО наложения сохранённых изменений.
   ============================================================ */
export function tryPlaceStructures(chunk, terrainHeight, biomeAt) {
  const info = computeHouseInfo(chunk.cx, chunk.cz, terrainHeight, biomeAt);
  if (info) buildHouse(chunk, info.wx0, info.wz0, info.wy0);
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

export function findNearestStructure(px, pz, type, maxChunks, terrainHeight, biomeAt) {
  const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
  const compute = (type === 'school') ? computeSchoolInfo : computeHouseInfo;

  for (let r = 0; r <= maxChunks; r++) {
    let best = null, bestD = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const cx = pcx + dx, cz = pcz + dz;
        const info = compute(cx, cz, terrainHeight, biomeAt);
        if (!info) continue;
        const d = Math.hypot(info.wx0 - px, info.wz0 - pz);
        if (d < bestD) { bestD = d; best = info; }
      }
    }
    if (best) return { x: best.wx0, z: best.wz0 };
  }
  return null;
}