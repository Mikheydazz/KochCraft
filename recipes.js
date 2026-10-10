/* Тонкая обёртка — вся работа в definitions/recipes.js. */
export { RECIPES, SMELTING, FUEL_VALUE } from './definitions/recipes.js';

/* --- Логика поиска (без изменений) --- */
function normalizePattern(grid, size) {
  const p = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      const s = grid[y * size + x];
      row.push(s ? s.id : 0);
    }
    p.push(row);
  }
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

import { RECIPES } from './definitions/recipes.js';

export function findRecipe(grid, size) {
  const cut = normalizePattern(grid, size);
  if (!cut) return null;
  const h = cut.length, w = cut[0].length;
  for (const r of RECIPES) {
    const ph = r.pattern.length, pw = r.pattern[0].length;
    if (ph !== h || pw !== w) continue;
    if (ph > size || pw > size) continue;
    let ok = true;
    for (let y = 0; y < h && ok; y++)
      for (let x = 0; x < w && ok; x++) {
        const a = cut[y][x];
        const b = r.pattern[y][x] || 0;
        if (a !== b) ok = false;
      }
    if (ok) return r;
  }
  return null;
}