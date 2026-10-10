export const GameMode = { CREATIVE: 'creative', SURVIVAL: 'survival' };
let currentMode = GameMode.CREATIVE;
export function getMode() { return currentMode; }
export function setMode(m) { currentMode = m; }

export const HOTBAR_SIZE = 9;
export const INVENTORY_SIZE = 36;
export const STACK_MAX = 64;

export const slots = new Array(INVENTORY_SIZE).fill(null);
export const heldItem = { value: null };

export function invClear() {
  for (let i = 0; i < INVENTORY_SIZE; i++) slots[i] = null;
}
export function invCount(id) {
  let n = 0;
  for (const s of slots) if (s && s.id === id) n += s.count;
  return n;
}
export function invAdd(id, n = 1, opts = {}) {
  const noStack = !!opts.noStack;
  if (!noStack) {
    for (let i = 0; i < INVENTORY_SIZE && n > 0; i++) {
      const s = slots[i];
      if (s && s.id === id && s.count < STACK_MAX && s.durability === undefined) {
        const add = Math.min(n, STACK_MAX - s.count);
        s.count += add;
        n -= add;
      }
    }
  }
  for (let i = 0; i < INVENTORY_SIZE && n > 0; i++) {
    if (!slots[i]) {
      const add = noStack ? 1 : Math.min(n, STACK_MAX);
      slots[i] = { id, count: add };
      if (opts.durability !== undefined) slots[i].durability = opts.durability;
      n -= add;
    }
  }
  return n === 0;
}
export function invRemoveFromSlot(i, n = 1) {
  const s = slots[i];
  if (!s || s.count < n) return false;
  s.count -= n;
  if (s.count <= 0) slots[i] = null;
  return true;
}

export function loadInventory(arr) {
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    const s = arr ? arr[i] : null;
    slots[i] = s ? { id: s.id, count: s.count, durability: s.durability } : null;
  }
}

export function getInventorySnapshot() {
  return slots.map(s => s ? { id: s.id, count: s.count, durability: s.durability } : null);
}