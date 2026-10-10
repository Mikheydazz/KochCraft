import {
  AIR, WATER, WORLD_HEIGHT,
  FLOWING_WATER_1, FLOWING_WATER_2, FLOWING_WATER_3, FLOWING_WATER_4, FLOWING_WATER_5
} from './constants.js';

const MAX_LEVEL = 5;
const FLOW_IDS = [null,
  FLOWING_WATER_1, FLOWING_WATER_2, FLOWING_WATER_3, FLOWING_WATER_4, FLOWING_WATER_5];

let worldRef = null;
export function setWaterWorld(w) { worldRef = w; }

export function isSource(b) { return b === WATER; }
export function isFlowing(b) { return b >= FLOWING_WATER_1 && b <= FLOWING_WATER_5; }
export function isWater(b)  { return isSource(b) || isFlowing(b); }

function getLevel(b) {
  if (isSource(b)) return 0;
  if (isFlowing(b)) return b - FLOWING_WATER_1 + 1;
  return -1;
}
function levelToId(l) {
  if (l === 0) return WATER;
  if (l >= 1 && l <= MAX_LEVEL) return FLOW_IDS[l];
  return AIR;
}

/* ---- Очередь обновлений ---- */
const queue = new Map();  // "x,y,z" → [x, y, z]

export function enqueueWater(x, y, z) {
  if (!worldRef) return;
  if (y < 0 || y >= WORLD_HEIGHT) return;
  queue.set(x + ',' + y + ',' + z, [x, y, z]);
}
export function enqueueAround(x, y, z) {
  enqueueWater(x, y, z);
  enqueueWater(x + 1, y, z);
  enqueueWater(x - 1, y, z);
  enqueueWater(x, y, z + 1);
  enqueueWater(x, y, z - 1);
  enqueueWater(x, y + 1, z);
  enqueueWater(x, y - 1, z);
}

export function clearWaterQueue() { queue.clear(); }

export function tickWater(maxCells = 100) {
  if (!worldRef) return;
  let n = 0;
  for (const [key, pos] of queue) {
    if (n++ >= maxCells) break;
    queue.delete(key);
    processCell(pos[0], pos[1], pos[2]);
  }
}

/* ============================================================
   Логика одной клетки
   ============================================================ */
function processCell(x, y, z) {
  const world = worldRef;
  const b = world.getBlock(x, y, z);

  if (isSource(b)) {
    checkInfiniteSource(x, y, z);
    spreadFrom(x, y, z, 0);
    return;
  }

  if (isFlowing(b)) {
    checkInfiniteSource(x, y, z);
    // перепроверяем — возможно стало источником
    const b2 = world.getBlock(x, y, z);
    if (isSource(b2)) { spreadFrom(x, y, z, 0); return; }

    const L = getLevel(b2);
    const ideal = computeIdealLevel(x, y, z);

    if (ideal < 1 || ideal > MAX_LEVEL) {
      // высохнуть
      world.setBlock(x, y, z, AIR);
      enqueueAround(x, y, z);
      return;
    }
    if (ideal !== L) {
      world.setBlock(x, y, z, levelToId(ideal));
      enqueueAround(x, y, z);
      spreadFrom(x, y, z, ideal);
      return;
    }
    spreadFrom(x, y, z, L);
    return;
  }

  // не вода
  if (b !== AIR) return;

  const ideal = computeIdealLevel(x, y, z);
  if (ideal >= 1 && ideal <= MAX_LEVEL) {
    world.setBlock(x, y, z, levelToId(ideal));
    enqueueAround(x, y, z);
  }
}

/* Какой уровень воды должен быть в клетке, если судить по соседям.
   -1  = воды здесь быть не должно. */
function computeIdealLevel(x, y, z) {
  const world = worldRef;

  // вода сверху → падающая вода, всегда уровень 1
  if (isWater(world.getBlock(x, y + 1, z))) return 1;

  let best = Infinity;
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nb = world.getBlock(x + dx, y, z + dz);
    if (isSource(nb)) { best = 0; break; }
    if (isFlowing(nb)) {
      const l = getLevel(nb);
      if (l < best) best = l;
    }
  }
  if (best === Infinity) return -1;
  return best + 1;
}

/* Разлить воду из текущей клетки уровня L */
function spreadFrom(x, y, z, L) {
  const world = worldRef;

  // 1) вниз — приоритетно
  if (y > 0) {
    const below = world.getBlock(x, y - 1, z);
    if (below === AIR || (isFlowing(below) && getLevel(below) > 1)) {
      world.setBlock(x, y - 1, z, levelToId(1));
      enqueueAround(x, y - 1, z);
      return;  // пока течёт вниз, по горизонтали не растекается
    }
  }

  // 2) по горизонтали
  const nextL = L + 1;
  if (nextL > MAX_LEVEL) return;
  for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = x + dx, nz = z + dz;
    const nb = world.getBlock(nx, y, nz);
    if (nb === AIR || (isFlowing(nb) && getLevel(nb) > nextL)) {
      world.setBlock(nx, y, nz, levelToId(nextL));
      enqueueAround(nx, y, nz);
    }
  }
}

/* Правило 2×2: если диагонали — источники, остальные клетки тоже становятся источниками */
function checkInfiniteSource(x, y, z) {
  const world = worldRef;
  for (const [dx, dz] of [[0,0],[-1,0],[0,-1],[-1,-1]]) {
    const x0 = x + dx, z0 = z + dz;
    const b0 = world.getBlock(x0,     y, z0);
    const b1 = world.getBlock(x0 + 1, y, z0);
    const b2 = world.getBlock(x0,     y, z0 + 1);
    const b3 = world.getBlock(x0 + 1, y, z0 + 1);

    // диагональ 0-3 — источники
    if (isSource(b0) && isSource(b3)) {
      if (isFlowing(b1)) { world.setBlock(x0 + 1, y, z0, WATER); enqueueAround(x0 + 1, y, z0); }
      if (isFlowing(b2)) { world.setBlock(x0, y, z0 + 1, WATER); enqueueAround(x0, y, z0 + 1); }
    }
    // диагональ 1-2 — источники
    if (isSource(b1) && isSource(b2)) {
      if (isFlowing(b0)) { world.setBlock(x0, y, z0, WATER); enqueueAround(x0, y, z0); }
      if (isFlowing(b3)) { world.setBlock(x0 + 1, y, z0 + 1, WATER); enqueueAround(x0 + 1, y, z0 + 1); }
    }
  }
}