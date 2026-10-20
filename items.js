import { allItems, allTools, getById } from './registry.js';
import { isBlock } from './blocks.js';

/* Цвета предметов для UI и как fallback для спрайта в руке */
export const ITEM_COLORS = {};
for (const d of [...allItems(), ...allTools()]) {
  if (d.color) ITEM_COLORS[d.id] = d.color;
}

/* Инструменты — карта id → { type, material, tier, durability, damage, speed, color } */
export const TOOLS = {};
let _toolsBuilt = false;

function ensureTools() {
  if (_toolsBuilt) return;
  _toolsBuilt = true;
  for (const d of allTools()) {
    TOOLS[d.id] = {
      type: d.toolType, material: d.material, tier: d.tier,
      durability: d.durability, damage: d.damage, speed: d.speed,
      color: d.color
    };
  }
}

export const isTool = (id) => { ensureTools(); return TOOLS[id] !== undefined; };
export const getTool = (id) => { ensureTools(); return TOOLS[id] || null; };

/* Человекочитаемое имя */
export function itemName(id) {
  const d = getById(id);
  return d ? d.name : '?';
}

/* Список для творческого инвентаря — берём всё, у чего creative: true.
   Сортируем так: сначала блоки, потом инструменты, потом предметы. */
import { allDefs } from './registry.js';

/* Всё, что помечено "creative: true", автоматически попадает
   в творческий инвентарь. Порядок — по порядку регистрации:
   сначала блоки, потом инструменты, потом предметы. */
export const CREATIVE_ITEMS = (() => {
  const blocks = allDefs().filter(d => d.type === 'block' && d.creative);
  const tools  = allDefs().filter(d => d.type === 'tool');
  const items  = allDefs().filter(d => d.type === 'item');
  return [...blocks, ...tools, ...items].map(d => d.id);
})();