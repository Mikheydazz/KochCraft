import {
  LOG, PLANKS, STICK, CRAFTING_TABLE, FURNACE, COAL,
  IRON, COPPER, GOLD, IRON_INGOT, COPPER_INGOT, GOLD_INGOT,
  STONE, DIAMOND,
  WOODEN_PICKAXE, WOODEN_AXE, WOODEN_SHOVEL, WOODEN_SWORD,
  STONE_PICKAXE, STONE_AXE, STONE_SHOVEL, STONE_SWORD,
  COPPER_PICKAXE, COPPER_AXE, COPPER_SHOVEL, COPPER_SWORD,
  IRON_PICKAXE, IRON_AXE, IRON_SHOVEL, IRON_SWORD,
  GOLD_PICKAXE, GOLD_AXE, GOLD_SHOVEL, GOLD_SWORD,
  DIAMOND_PICKAXE, DIAMOND_AXE, DIAMOND_SHOVEL, DIAMOND_SWORD
} from './constants.js';

/* Формат рецепта:
   { size: 2|3, pattern: [[...]], output: { id, count } }
   null = пустая ячейка */

function shaped(size, pattern, out, count = 1) {
  return { size, pattern, output: { id: out, count } };
}

const TOOL_MATS = [
  { mat: PLANKS,       pickaxe: WOODEN_PICKAXE,  axe: WOODEN_AXE,  shovel: WOODEN_SHOVEL,  sword: WOODEN_SWORD },
  { mat: STONE,        pickaxe: STONE_PICKAXE,   axe: STONE_AXE,   shovel: STONE_SHOVEL,   sword: STONE_SWORD },
  { mat: COPPER_INGOT, pickaxe: COPPER_PICKAXE,  axe: COPPER_AXE,  shovel: COPPER_SHOVEL,  sword: COPPER_SWORD },
  { mat: IRON_INGOT,   pickaxe: IRON_PICKAXE,    axe: IRON_AXE,    shovel: IRON_SHOVEL,    sword: IRON_SWORD },
  { mat: GOLD_INGOT,   pickaxe: GOLD_PICKAXE,    axe: GOLD_AXE,    shovel: GOLD_SHOVEL,    sword: GOLD_SWORD },
  { mat: DIAMOND,      pickaxe: DIAMOND_PICKAXE, axe: DIAMOND_AXE, shovel: DIAMOND_SHOVEL, sword: DIAMOND_SWORD }
];

/* ---- Базовые рецепты ---- */
export const RECIPES = [
  // 1 бревно -> 4 доски (shaped, одна ячейка)
  shaped(2, [[LOG]], PLANKS, 4),

  // 2 доски (вертикально) -> 4 палки
  shaped(2, [[PLANKS], [PLANKS]], STICK, 4),

  // 4 доски -> верстак
  shaped(2, [[PLANKS, PLANKS], [PLANKS, PLANKS]], CRAFTING_TABLE, 1),

  // 8 камня вокруг центра -> печь
  shaped(3, [
    [STONE, STONE, STONE],
    [STONE, null,  STONE],
    [STONE, STONE, STONE]
  ], FURNACE, 1)
];

/* ---- Инструменты (генерируем) ---- */
for (const m of TOOL_MATS) {
  // Кирка
  RECIPES.push(shaped(3, [
    [m.mat, m.mat, m.mat],
    [null,  STICK, null],
    [null,  STICK, null]
  ], m.pickaxe));
  // Топор
  RECIPES.push(shaped(3, [
    [m.mat, m.mat, null],
    [m.mat, STICK, null],
    [null,  STICK, null]
  ], m.axe));
  // Лопата
  RECIPES.push(shaped(3, [
    [null,  m.mat, null],
    [null,  STICK, null],
    [null,  STICK, null]
  ], m.shovel));
  // Меч
  RECIPES.push(shaped(3, [
    [null,  m.mat, null],
    [null,  m.mat, null],
    [null,  STICK, null]
  ], m.sword));
}

/* ---- Плавка в печи ---- */
export const SMELTING = {
  [IRON]:   { id: IRON_INGOT,   time: 5 },
  [COPPER]: { id: COPPER_INGOT, time: 5 },
  [GOLD]:   { id: GOLD_INGOT,   time: 5 }
};
export const FUEL_VALUE = { [COAL]: 8 };  // 1 уголь = 8 операций

/* ============================================================
   Поиск рецепта по сетке крафта
   ============================================================ */
function normalizePattern(grid, size) {
  // grid — массив size*size с {id,count} | null
  // Возвращает 2D массив id|0 и границы "непустой" области
  const p = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const s = grid[y * size + x];
      row.push(s ? s.id : 0);
    }
    p.push(row);
  }
  // обрезаем пустые строки/столбцы
  let minX = size, minY = size, maxX = -1, maxY = -1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (p[y][x]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  const cut = [];
  for (let y = minY; y <= maxY; y++) cut.push(p[y].slice(minX, maxX + 1));
  return cut;
}

export function findRecipe(grid, size) {
  const cut = normalizePattern(grid, size);
  if (!cut) return null;
  const h = cut.length, w = cut[0].length;
  for (const r of RECIPES) {
    if (r.size > size) continue;
    const ph = r.pattern.length, pw = r.pattern[0].length;
    if (ph !== h || pw !== w) continue;
    let ok = true;
    for (let y = 0; y < h && ok; y++) {
      for (let x = 0; x < w && ok; x++) {
        const a = cut[y][x];
        const b = r.pattern[y][x] || 0;
        if (a !== b) ok = false;
      }
    }
    if (ok) return r;
  }
  return null;
}