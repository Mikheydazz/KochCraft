import { allItems, allTools, getById } from './registry.js';
import { isBlock } from './blocks.js';

/* Цвета предметов для UI и как fallback для спрайта в руке */
export const ITEM_COLORS = {};
for (const d of [...allItems(), ...allTools()]) {
  if (d.color) ITEM_COLORS[d.id] = d.color;
}

/* Инструменты — карта id → { type, material, tier, durability, damage, speed, color } */
export const TOOLS = {};
for (const d of allTools()) {
  TOOLS[d.id] = {
    type: d.toolType, material: d.material, tier: d.tier,
    durability: d.durability, damage: d.damage, speed: d.speed,
    color: d.color
  };
}

export const isTool = (id) => TOOLS[id] !== undefined;
export const getTool = (id) => TOOLS[id] || null;

/* Человекочитаемое имя */
export function itemName(id) {
  const d = getById(id);
  return d ? d.name : '?';
}

/* Список для творческого инвентаря — берём всё, у чего creative: true.
   Сортируем так: сначала блоки, потом инструменты, потом предметы. */
const _creativeOrder = [];
for (const d of allBlocksCreative()) _creativeOrder.push(d.id);
for (const d of allTools())            _creativeOrder.push(d.id);
for (const d of allItems())            _creativeOrder.push(d.id);

function allBlocksCreative() {
  return [...allBlocks()].filter(d => d.creative);
}
import { allBlocks } from './registry.js';

export const CREATIVE_ITEMS = _creativeOrder;