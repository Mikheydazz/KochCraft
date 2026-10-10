import { getByKey } from '../registry.js';

const id = (key) => getByKey(key).id;

/* ---- Shaped-крафты (сетка 2×2 или 3×3) ---- */
export const RECIPES = [];
function shaped(size, pattern, outKey, count = 1) {
  RECIPES.push({ size, pattern, output: { id: id(outKey), count } });
}

/* Базовые */
shaped(2, [[id('log')]], 'planks', 4);
shaped(2, [[id('planks')], [id('planks')]], 'stick', 4);
shaped(2, [[id('planks'), id('planks')], [id('planks'), id('planks')]], 'crafting_table', 1);
shaped(3, [
  [id('stone'), id('stone'), id('stone')],
  [id('stone'), null,        id('stone')],
  [id('stone'), id('stone'), id('stone')]
], 'furnace', 1);
shaped(2, [[id('brick'), id('brick')], [id('brick'), id('brick')]], 'brick_block', 1);

// сундук: 8 досок вокруг центра
shaped(3, [
  [id('planks'), id('planks'), id('planks')],
  [id('planks'), null,         id('planks')],
  [id('planks'), id('planks'), id('planks')]
], 'chest', 1);

/* Инструменты для каждого материала */
const TOOL_MATS = [
  { mat: 'planks',       set: ['wood_pickaxe',    'wood_axe',    'wood_shovel',    'wood_sword'] },
  { mat: 'stone',        set: ['stone_pickaxe',   'stone_axe',   'stone_shovel',   'stone_sword'] },
  { mat: 'copper_ingot', set: ['copper_pickaxe',  'copper_axe',  'copper_shovel',  'copper_sword'] },
  { mat: 'iron_ingot',   set: ['iron_pickaxe',    'iron_axe',    'iron_shovel',    'iron_sword'] },
  { mat: 'gold_ingot',   set: ['gold_pickaxe',    'gold_axe',    'gold_shovel',    'gold_sword'] },
  { mat: 'diamond_ore_dummy', set: [] } // заполняется ниже
];
// алмаз — материал это предмет DIAMOND (руда-блок) по текущей схеме
TOOL_MATS[5].mat = 'diamond_ore';   // просто id нужен; используем тот же id что у блока DIAMOND
TOOL_MATS[5].set = ['diamond_pickaxe', 'diamond_axe', 'diamond_shovel', 'diamond_sword'];

const STICK = id('stick');
for (const tm of TOOL_MATS) {
  const matId = id(tm.mat);
  const [pickaxe, axe, shovel, sword] = tm.set;
  shaped(3, [
    [matId, matId, matId],
    [null,  STICK, null],
    [null,  STICK, null]
  ], pickaxe);
  shaped(3, [
    [matId, matId, null],
    [matId, STICK, null],
    [null,  STICK, null]
  ], axe);
  shaped(3, [
    [null,  matId, null],
    [null,  STICK, null],
    [null,  STICK, null]
  ], shovel);
  shaped(3, [
    [null,  matId, null],
    [null,  matId, null],
    [null,  STICK, null]
  ], sword);
}

/* ---- Плавка в печи ---- */
export const SMELTING = {};
SMELTING[id('iron_ore')]   = { id: id('iron_ingot'),   time: 5 };
SMELTING[id('copper_ore')] = { id: id('copper_ingot'), time: 5 };
SMELTING[id('gold_ore')]   = { id: id('gold_ingot'),   time: 5 };
SMELTING[id('sand')]       = { id: id('glass'),        time: 5 };
SMELTING[id('clay')]       = { id: id('brick'),        time: 5 };

/* ---- Топливо ---- */
export const FUEL_VALUE = {};
FUEL_VALUE[id('coal')] = 8;