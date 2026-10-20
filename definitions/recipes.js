import { getByKey, getById } from '../registry.js';

const id = (key) => getByKey(key).id;

/* ---- Shaped-крафты (сетка 2×2 или 3×3) ---- */
export const RECIPES = [];

function trimPattern(p) {
  let minX = p[0].length, minY = p.length, maxX = -1, maxY = -1;
  for (let y = 0; y < p.length; y++)
    for (let x = 0; x < p[y].length; x++) {
      if (p[y][x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  if (maxX < 0) return [[]];
  const out = [];
  for (let y = minY; y <= maxY; y++) out.push(p[y].slice(minX, maxX + 1));
  return out;
}

function shaped(size, pattern, outKey, count = 1) {
  RECIPES.push({
    size,
    pattern: trimPattern(pattern),
    output: { id: id(outKey), count }
  });
}

/* ---- Ведро: 3 железных слитка буквой V ---- */
shaped(3, [
  [id('iron_ingot'), null,             id('iron_ingot')],
  [null,             id('iron_ingot'), null]
], 'bucket', 1);

/* ---- Опилки: бревно + топор. Топор не расходуется, а теряет прочность. ---- */
shaped(2, [[{ tool: 'axe' }, id('log')]], 'sawdust', 1);
shaped(2, [[{ tool: 'axe' }], [id('log')]], 'sawdust', 1);

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

/* Ступеньки: 6 блоков в два ряда по 3 → 4 ступеньки */
function stairsRecipe(matKey, outKey) {
  shaped(3, [
    [id(matKey), id(matKey), id(matKey)],
    [id(matKey), id(matKey), id(matKey)]
  ], outKey, 4);
}
stairsRecipe('stone',  'stone_stairs_n');
stairsRecipe('planks', 'wood_stairs_n');
stairsRecipe('brick',  'brick_stairs_n');
/* ---- Чернила и ручка ---- */
shaped(2, [[id('coal')]], 'ink', 1);

shaped(3, [
  [null,           id('iron_ingot'), null],
  [null,           id('ink'),        null],
  [null,           id('stick'),      null]
], 'pen', 1);

/* ---- Чан (котёл): 7 железных слитков буквой U ---- */
shaped(3, [
  [id('iron_ingot'), null,             id('iron_ingot')],
  [id('iron_ingot'), null,             id('iron_ingot')],
  [id('iron_ingot'), id('iron_ingot'), id('iron_ingot')]
], 'cauldron', 1);

/* ---- Бумага: 3 целлюлозы в ряд → 3 листа ---- */
shaped(3, [
  [id('cellulose'), id('cellulose'), id('cellulose')]
], 'paper', 3);

/* ---- Книга: 6 бумаги в 2 ряда по 3 → 1 книга ---- */
shaped(3, [
  [id('paper'), id('paper'), id('paper')],
  [id('paper'), id('paper'), id('paper')]
], 'book', 1);

/* ---- Парта: 4 доски + книга ---- */
shaped(3, [
  [id('planks'), id('planks'), id('planks')],
  [null,         id('book'),   null],
  [null,         id('planks'), null]
], 'school_desk', 1);

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