/* ============================================================
   Состояние парт: "x,y,z" → { text, count }
   ============================================================ */
const desks = new Map();
const key = (x, y, z) => x + ',' + y + ',' + z;

export function getDesk(x, y, z) {
  return desks.get(key(x, y, z)) || null;
}

export function setDesk(x, y, z, book) {
  if (!book) { desks.delete(key(x, y, z)); return; }
  desks.set(key(x, y, z), { text: book.text || '', count: book.count || 1 });
}

export function deleteDesk(x, y, z) {
  desks.delete(key(x, y, z));
}

export function getAllDesks() {
  const out = [];
  for (const [k, v] of desks) {
    if (!v) continue;
    const [x, y, z] = k.split(',').map(Number);
    out.push({ x, y, z, text: v.text || '', count: v.count || 1 });
  }
  return out;
}

export function loadDesks(data) {
  desks.clear();
  if (!Array.isArray(data)) return;
  for (const d of data) {
    if (!d) continue;
    desks.set(key(d.x, d.y, d.z), { text: d.text || '', count: d.count || 1 });
  }
}