const chests = new Map();   // "x,y,z" -> Array(27) of { id, count, durability } | null

const key = (x, y, z) => x + ',' + y + ',' + z;

export function getChestSlots(x, y, z) {
  const k = key(x, y, z);
  let arr = chests.get(k);
  if (!arr) {
    arr = new Array(27).fill(null);
    chests.set(k, arr);
  }
  return arr;
}

export function chestExists(x, y, z) { return chests.has(key(x, y, z)); }
export function deleteChest(x, y, z) { chests.delete(key(x, y, z)); }

export function getAllChests() {
  const out = [];
  for (const [k, arr] of chests) {
    const [x, y, z] = k.split(',').map(Number);
    out.push({ x, y, z, slots: arr });
  }
  return out;
}

export function loadChests(data) {
  chests.clear();
  if (!Array.isArray(data)) return;
  for (const c of data) {
    if (!c || !Array.isArray(c.slots)) continue;
    const arr = new Array(27).fill(null);
    for (let i = 0; i < 27 && i < c.slots.length; i++) {
      const s = c.slots[i];
      arr[i] = s ? { id: s.id, count: s.count, durability: s.durability } : null;
    }
    chests.set(key(c.x, c.y, c.z), arr);
  }
}