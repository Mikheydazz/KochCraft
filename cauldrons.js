/* ============================================================
   Состояние чанов (котлов)
   Состояние воды хранится в ID блока (CAULDRON / CAULDRON_WATER).
   Содержимое — в этой Map: "x,y,z" → { contents: { id, count } | null }.
   ============================================================ */
const vats = new Map();
const key = (x, y, z) => x + ',' + y + ',' + z;

export function getVatContents(x, y, z) {
  return vats.get(key(x, y, z)) || { contents: null };
}

export function setVatContents(x, y, z, contents) {
  if (!contents) vats.delete(key(x, y, z));
  else vats.set(key(x, y, z), { contents });
}

export function deleteVat(x, y, z) {
  vats.delete(key(x, y, z));
}

export function getAllVats() {
  const out = [];
  for (const [k, v] of vats) {
    if (!v.contents) continue;
    const [x, y, z] = k.split(',').map(Number);
    out.push({ x, y, z, contents: { id: v.contents.id, count: v.contents.count } });
  }
  return out;
}

export function loadVats(data) {
  vats.clear();
  if (!Array.isArray(data)) return;
  for (const c of data) {
    if (!c || !c.contents) continue;
    vats.set(key(c.x, c.y, c.z), {
      contents: { id: c.contents.id, count: c.contents.count }
    });
  }
}