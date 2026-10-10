import {
  GRASS, DIRT, STONE, SAND, WATER, LOG, LEAVES, COAL, IRON,
  COPPER, GOLD, DIAMOND, BEDROCK, PLANKS, CRAFTING_TABLE, FURNACE,
  GLASS, BRICK_BLOCK, CHEST,
  FLOWING_WATER_1, FLOWING_WATER_2, FLOWING_WATER_3, FLOWING_WATER_4, FLOWING_WATER_5,
  STICK, IRON_INGOT, COPPER_INGOT, GOLD_INGOT, BEEF, PORK, COAL_ITEM, CLAY, BRICK,
  T
} from './definitions/index.js';
import { allBlocks, getById } from './registry.js';

export {
  GRASS, DIRT, STONE, SAND, WATER, LOG, LEAVES, COAL, IRON,
  COPPER, GOLD, DIAMOND, BEDROCK, PLANKS, CRAFTING_TABLE, FURNACE,
  GLASS, BRICK_BLOCK, CHEST,
  FLOWING_WATER_1, FLOWING_WATER_2, FLOWING_WATER_3, FLOWING_WATER_4, FLOWING_WATER_5,
  STICK, IRON_INGOT, COPPER_INGOT, GOLD_INGOT, BEEF, PORK, COAL_ITEM, CLAY, BRICK,
  T
};

export * from './definitions/tools.js';

export const AIR = 0;

/* ---- Атлас ---- */
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;

/* ---- Мир ---- */
export const CS = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 26;
export const RD_GEN = 5;
export const RD_MESH = 4;

export const BIOME_PLAINS = 0, BIOME_FOREST = 1, BIOME_OCEAN = 2;

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

export const isWaterBlock = (b) =>
  b === WATER || (b >= FLOWING_WATER_1 && b <= FLOWING_WATER_5);

export const isSolid = (b) => b !== AIR && !isWaterBlock(b);
export const isBlock = (id) => {
  const d = getById(id);
  return !!d && d.type === 'block';
};