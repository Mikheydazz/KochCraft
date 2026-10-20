/* Порядок загрузки: сначала регистрируем всё из definitions/, потом
   строим производные таблицы. Дальше — только собственные константы. */
import './definitions/index.js';
import { allBlocks, getById } from './registry.js';

/* Реэкспортируем всё содержимое реестра — новые блоки, предметы,
   инструменты и биомы появляются здесь автоматически. */
export * from './definitions/index.js';

/* Реэкспорт утилит реестра, чтобы не тянуть их в каждый файл отдельно */
export { getById, getByKey, getBiomeById, getBiomeByKey,
         getBiomeName, findBiomeByAlias,
         allDefs, allBlocks, allItems, allTools, allBiomes,
         isBlock as isBlockType, isTool as isToolType, isItem as isItemType }
       from './registry.js';

export const AIR = 0;

/* ---- Атлас ---- */
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;

/* ---- Мир ---- */
export const CS = 16;
export const WORLD_HEIGHT = 96;
export const SEA_LEVEL = 26;
export const RD_GEN = 5;
export const RD_MESH = 4;

/* ---- Грани куба ---- */
export const FACES = [
  { dir: [1,0,0],  corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], uvs: [[0,1],[0,0],[1,0],[1,1]] },
  { dir: [-1,0,0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], uvs: [[0,1],[0,0],[1,0],[1,1]] },
  { dir: [0,1,0],  corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uvs: [[0,1],[1,1],[1,0],[0,0]] },
  { dir: [0,-1,0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uvs: [[0,1],[1,1],[1,0],[0,0]] },
  { dir: [0,0,1],  corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], uvs: [[0,1],[0,0],[1,0],[1,1]] },
  { dir: [0,0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], uvs: [[0,1],[0,0],[1,0],[1,1]] }
];

/* ---- Производные таблицы (из реестра) ---- */
export const BLOCK_HARDNESS = {};
export const BLOCK_TOOL_REQ = {};
for (const b of allBlocks()) {
  if (b.hardness !== undefined) BLOCK_HARDNESS[b.id] = b.hardness;
  if (b.toolReq) BLOCK_TOOL_REQ[b.id] = b.toolReq;
}

/* ---- Утилиты, специфичные для воды ---- */
export const isWaterBlock = (b) =>
  b !== AIR && (() => {
    const d = getById(b);
    return d && d.liquid;
  })();

export const isSolid = (b) => b !== AIR && !isWaterBlock(b);
export const isBlock = (id) => {
  const d = getById(id);
  return !!d && d.type === 'block';
};