import {
  GRASS, DIRT, STONE, SAND, LOG, LEAVES, COAL, IRON, COPPER, GOLD,
  DIAMOND, BEDROCK, PLANKS, CRAFTING_TABLE, FURNACE,
  STICK, IRON_INGOT, COPPER_INGOT, GOLD_INGOT,
  WOODEN_PICKAXE, WOODEN_AXE, WOODEN_SHOVEL, WOODEN_SWORD,
  STONE_PICKAXE, STONE_AXE, STONE_SHOVEL, STONE_SWORD,
  COPPER_PICKAXE, COPPER_AXE, COPPER_SHOVEL, COPPER_SWORD,
  IRON_PICKAXE, IRON_AXE, IRON_SHOVEL, IRON_SWORD,
  GOLD_PICKAXE, GOLD_AXE, GOLD_SHOVEL, GOLD_SWORD,
  DIAMOND_PICKAXE, DIAMOND_AXE, DIAMOND_SHOVEL, DIAMOND_SWORD,
  BEEF, PORK,
  WATER
} from './constants.js';

/* Цвета для UI */
export const ITEM_COLORS = {
  [GRASS]: '#5c9e3a', [DIRT]: '#86603c', [STONE]: '#808084', [SAND]: '#e0d49c',
  [WATER]: '#2e6ac8', [LOG]: '#684c28', [LEAVES]: '#3a7a28', [COAL]: '#1c1c20',
  [IRON]: '#ceb0a0', [COPPER]: '#ce7a3e', [GOLD]: '#f4d04c', [DIAMOND]: '#5ce8e0',
  [BEDROCK]: '#3e3e42', [PLANKS]: '#b28a54',
  [CRAFTING_TABLE]: '#a67848', [FURNACE]: '#6b6b6f',
  [STICK]: '#8a5a2a', [IRON_INGOT]: '#d8d8d8',
  [COPPER_INGOT]: '#c87533', [GOLD_INGOT]: '#ffd700',
  [BEEF]: '#8b2f2f', [PORK]: '#e8a0a0'
};

const MAT_COLOR = {
  wood: '#8a5a2a', stone: '#808080',
  copper: '#c87533', iron: '#d8d8d8',
  gold: '#ffd700', diamond: '#5ce8e0'
};

/* Генерируем таблицу инструментов */
function tool(id, type, material, tier, durability, damage, speed) {
  return { id, type, material, tier, durability, damage, speed,
           color: MAT_COLOR[material] };
}
export const TOOLS = {};
(function () {
  const defs = [
    ['wood',    WOODEN_PICKAXE,  WOODEN_AXE,  WOODEN_SHOVEL,  WOODEN_SWORD,
                60,   {pickaxe:2,  axe:2,  shovel:2,  sword:1}, 1, 2],
    ['stone',   STONE_PICKAXE,   STONE_AXE,   STONE_SHOVEL,   STONE_SWORD,
                132,  {pickaxe:3,  axe:3,  shovel:3,  sword:1}, 2, 3],
    ['copper',  COPPER_PICKAXE,  COPPER_AXE,  COPPER_SHOVEL,  COPPER_SWORD,
                180,  {pickaxe:4,  axe:4,  shovel:4,  sword:1}, 3, 4],
    ['iron',    IRON_PICKAXE,    IRON_AXE,    IRON_SHOVEL,    IRON_SWORD,
                250,  {pickaxe:5,  axe:5,  shovel:5,  sword:1}, 3, 5],
    ['gold',    GOLD_PICKAXE,    GOLD_AXE,    GOLD_SHOVEL,    GOLD_SWORD,
                32,   {pickaxe:7,  axe:7,  shovel:7,  sword:1}, 3, 5],
    ['diamond', DIAMOND_PICKAXE, DIAMOND_AXE, DIAMOND_SHOVEL, DIAMOND_SWORD,
                1561, {pickaxe:8,  axe:8,  shovel:8,  sword:1}, 4, 7]
  ];
  for (const [mat, pId, aId, sId, swId, dur, spd, tier, dmg] of defs) {
    TOOLS[pId]  = tool(pId,  'pickaxe', mat, tier, dur, dmg, spd.pickaxe);
    TOOLS[aId]  = tool(aId,  'axe',     mat, tier, dur, dmg + 1, spd.axe);
    TOOLS[sId]  = tool(sId,  'shovel',  mat, tier, dur, dmg, spd.shovel);
    TOOLS[swId] = tool(swId, 'sword',   mat, tier, dur, dmg + 2, spd.sword);
  }
})();

export function isTool(id) { return !!TOOLS[id]; }
export function getTool(id) { return TOOLS[id] || null; }

/* Человекочитаемое имя */
export function itemName(id) {
  const names = {
    [GRASS]: 'Трава', [DIRT]: 'Земля', [STONE]: 'Камень', [SAND]: 'Песок',
    [LOG]: 'Бревно', [LEAVES]: 'Листва', [COAL]: 'Уголь', [IRON]: 'Железная руда',
    [COPPER]: 'Медная руда', [GOLD]: 'Золотая руда', [DIAMOND]: 'Алмазная руда',
    [BEDROCK]: 'Бедрок', [PLANKS]: 'Доски', [CRAFTING_TABLE]: 'Верстак',
    [FURNACE]: 'Печь', [STICK]: 'Палка', [IRON_INGOT]: 'Железный слиток',
    [COPPER_INGOT]: 'Медный слиток', [GOLD_INGOT]: 'Золотой слиток',
    [BEEF]: 'Говядина', [PORK]: 'Свинина'
  };
  if (names[id]) return names[id];
  const t = TOOLS[id];
  if (t) {
    const typeName = { pickaxe: 'Кирка', axe: 'Топор', shovel: 'Лопата', sword: 'Меч' }[t.type];
    const matName = { wood: 'деревянный', stone: 'каменный', copper: 'медный',
                      iron: 'железный', gold: 'золотой', diamond: 'алмазный' }[t.material];
    return `${typeName} (${matName})`;
  }
  return '?';
}

/* Список всего, что показываем в творческом режиме */
export const CREATIVE_ITEMS = [
  GRASS, DIRT, STONE, SAND, LOG, LEAVES, PLANKS,
  CRAFTING_TABLE, FURNACE,
  COAL, IRON, COPPER, GOLD, DIAMOND,
  STICK, IRON_INGOT, COPPER_INGOT, GOLD_INGOT,
  WOODEN_PICKAXE, STONE_PICKAXE, COPPER_PICKAXE, IRON_PICKAXE,
  GOLD_PICKAXE, DIAMOND_PICKAXE,
  WOODEN_AXE, STONE_AXE, COPPER_AXE, IRON_AXE, GOLD_AXE, DIAMOND_AXE,
  WOODEN_SHOVEL, STONE_SHOVEL, COPPER_SHOVEL, IRON_SHOVEL,
  GOLD_SHOVEL, DIAMOND_SHOVEL,
  WOODEN_SWORD, STONE_SWORD, COPPER_SWORD, IRON_SWORD,
  GOLD_SWORD, DIAMOND_SWORD,
  BEEF, PORK
];