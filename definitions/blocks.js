import { registerBlock } from '../registry.js';
import { T } from './tiles.js';

export const GRASS = registerBlock({
  id: 1, key: 'grass', name: 'Трава',
  top: T.GRASS_TOP, side: T.GRASS_SIDE, bottom: T.DIRT,
  hardness: 0.7, creative: true
});
export const DIRT = registerBlock({
  id: 2, key: 'dirt', name: 'Земля',
  all: T.DIRT, hardness: 0.7, creative: true
});
export const STONE = registerBlock({
  id: 3, key: 'stone', name: 'Камень',
  all: T.STONE, hardness: 1.6, creative: true,
  toolReq: { tool: 'pickaxe', tier: 1 }
});
export const SAND = registerBlock({
  id: 4, key: 'sand', name: 'Песок',
  all: T.SAND, hardness: 0.6, creative: true
});
export const WATER = registerBlock({
  id: 5, key: 'water', name: 'Вода',
  all: T.WATER, liquid: true, hardness: Infinity
});
export const LOG = registerBlock({
  id: 6, key: 'log', name: 'Бревно',
  top: T.LOG_TOP, bottom: T.LOG_TOP, side: T.LOG_SIDE,
  hardness: 1.3, creative: true
});
export const LEAVES = registerBlock({
  id: 7, key: 'leaves', name: 'Листва',
  all: T.LEAVES, hardness: 0.25, creative: true
});
export const COAL = registerBlock({
  id: 8, key: 'coal_ore', name: 'Угольная руда',
  all: T.COAL, hardness: 1.9, creative: true,
  toolReq: { tool: 'pickaxe', tier: 1 }
});
export const IRON = registerBlock({
  id: 9, key: 'iron_ore', name: 'Железная руда',
  all: T.IRON, hardness: 2.3, creative: true,
  toolReq: { tool: 'pickaxe', tier: 2 }
});
export const COPPER = registerBlock({
  id: 10, key: 'copper_ore', name: 'Медная руда',
  all: T.COPPER, hardness: 2.1, creative: true,
  toolReq: { tool: 'pickaxe', tier: 2 }
});
export const GOLD = registerBlock({
  id: 11, key: 'gold_ore', name: 'Золотая руда',
  all: T.GOLD, hardness: 2.6, creative: true,
  toolReq: { tool: 'pickaxe', tier: 3 }
});
export const DIAMOND = registerBlock({
  id: 12, key: 'diamond_ore', name: 'Алмазная руда',
  all: T.DIAMOND, hardness: 3.2, creative: true,
  toolReq: { tool: 'pickaxe', tier: 3 }
});
export const BEDROCK = registerBlock({
  id: 13, key: 'bedrock', name: 'Бедрок',
  all: T.BEDROCK, hardness: Infinity
});
export const PLANKS = registerBlock({
  id: 14, key: 'planks', name: 'Доски',
  all: T.PLANKS, hardness: 1.1, creative: true
});
export const CRAFTING_TABLE = registerBlock({
  id: 15, key: 'crafting_table', name: 'Верстак',
  top: T.CRAFTING_TOP, bottom: T.PLANKS, side: T.CRAFTING_SIDE,
  hardness: 1.2, creative: true
});
export const FURNACE = registerBlock({
  id: 16, key: 'furnace', name: 'Печь',
  top: T.FURNACE_TOP, bottom: T.FURNACE_TOP, side: T.FURNACE_SIDE, front: T.FURNACE_FRONT,
  hardness: 2.0, creative: true,
  toolReq: { tool: 'pickaxe', tier: 1 }
});
export const GLASS = registerBlock({
  id: 57, key: 'glass', name: 'Стекло',
  all: T.GLASS, hardness: 0.3, creative: true
});
export const BRICK_BLOCK = registerBlock({
  id: 65, key: 'brick_block', name: 'Кирпичный блок',
  all: T.BRICK, hardness: 2.0, creative: true
});
export const CHEST = registerBlock({
  id: 66, key: 'chest', name: 'Сундук',
  top: T.CHEST_TOP, bottom: T.CHEST_TOP,
  side: T.CHEST_FRONT, front: T.CHEST_FRONT,
  hardness: 1.5, creative: true,
  toolReq: { tool: 'axe', tier: 1 }
});

/* ---- Уровни текущей воды (генерируются) ---- */
export const FLOWING_WATER_1 = registerBlock({ id: 58, key: 'flowing_water_1', name: 'Вода', all: T.WATER, liquid: true, hardness: Infinity });
export const FLOWING_WATER_2 = registerBlock({ id: 59, key: 'flowing_water_2', name: 'Вода', all: T.WATER, liquid: true, hardness: Infinity });
export const FLOWING_WATER_3 = registerBlock({ id: 60, key: 'flowing_water_3', name: 'Вода', all: T.WATER, liquid: true, hardness: Infinity });
export const FLOWING_WATER_4 = registerBlock({ id: 61, key: 'flowing_water_4', name: 'Вода', all: T.WATER, liquid: true, hardness: Infinity });
export const FLOWING_WATER_5 = registerBlock({ id: 62, key: 'flowing_water_5', name: 'Вода', all: T.WATER, liquid: true, hardness: Infinity });