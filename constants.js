/* ---- Блоки 0..16 ---- */
export const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, SAND = 4, WATER = 5,
      LOG = 6, LEAVES = 7, COAL = 8, IRON = 9, COPPER = 10, GOLD = 11,
      DIAMOND = 12, BEDROCK = 13, PLANKS = 14,
      CRAFTING_TABLE = 15, FURNACE = 16;

/* ---- Предметы 17..29 ---- */
export const STICK = 17, IRON_INGOT = 18, COPPER_INGOT = 19, GOLD_INGOT = 20;

/* ---- Инструменты 30..53 ---- */
export const WOODEN_PICKAXE = 30, WOODEN_AXE = 31, WOODEN_SHOVEL = 32, WOODEN_SWORD = 33,
      STONE_PICKAXE = 34, STONE_AXE = 35, STONE_SHOVEL = 36, STONE_SWORD = 37,
      COPPER_PICKAXE = 38, COPPER_AXE = 39, COPPER_SHOVEL = 40, COPPER_SWORD = 41,
      IRON_PICKAXE = 42, IRON_AXE = 43, IRON_SHOVEL = 44, IRON_SWORD = 45,
      GOLD_PICKAXE = 46, GOLD_AXE = 47, GOLD_SHOVEL = 48, GOLD_SWORD = 49,
      DIAMOND_PICKAXE = 50, DIAMOND_AXE = 51, DIAMOND_SHOVEL = 52, DIAMOND_SWORD = 53;

/* ---- Атлас 8x8 = 64 тайла ---- */
export const ATLAS_COLS = 8;
export const ATLAS_ROWS = 8;

export const T = {
  GRASS_TOP: 0, GRASS_SIDE: 1, DIRT: 2, STONE: 3,
  SAND: 4, WATER: 5, LOG_SIDE: 6, LOG_TOP: 7,
  LEAVES: 8, COAL: 9, IRON: 10, COPPER: 11,
  GOLD: 12, DIAMOND: 13, BEDROCK: 14, PLANKS: 15,
  CRAFTING_TOP: 16, CRAFTING_SIDE: 17,
  FURNACE_FRONT: 18, FURNACE_SIDE: 19, FURNACE_TOP: 20
};

export const CS = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 26;
export const RD_GEN = 5;
export const RD_MESH = 4;

export const BIOME_PLAINS = 0, BIOME_FOREST = 1, BIOME_OCEAN = 2;

export const FACES = [
  { dir: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]], uvs: [[0,1],[0,0],[1,0],[1,1]] },
  { dir: [-1,0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]], uvs: [[0,1],[0,0],[1,0],[1,1]] },
  { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], uvs: [[0,1],[1,1],[1,0],[0,0]] },
  { dir: [0,-1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], uvs: [[0,1],[1,1],[1,0],[0,0]] },
  { dir: [0, 0, 1], corners: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]], uvs: [[0,1],[0,0],[1,0],[1,1]] },
  { dir: [0, 0,-1], corners: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]], uvs: [[0,1],[0,0],[1,0],[1,1]] }
];

export const BLOCK_HARDNESS = {
  [GRASS]: 0.7, [DIRT]: 0.7, [STONE]: 1.6, [SAND]: 0.6, [LOG]: 1.3,
  [LEAVES]: 0.25, [COAL]: 1.9, [IRON]: 2.3, [COPPER]: 2.1,
  [GOLD]: 2.6, [DIAMOND]: 3.2, [BEDROCK]: Infinity, [PLANKS]: 1.1,
  [CRAFTING_TABLE]: 1.2, [FURNACE]: 2.0
};

/* Требуемый инструмент: { tool, tier } или null */
/* Уровни: 1 — дерево, 2 — камень, 3 — медь/железо/золото, 4 — алмаз */
export const BLOCK_TOOL_REQ = {
  [STONE]:   { tool: 'pickaxe', tier: 1 },   // дерево+
  [COAL]:    { tool: 'pickaxe', tier: 1 },   // дерево+
  [IRON]:    { tool: 'pickaxe', tier: 2 },   // камень+ (теперь каменная кирка берёт железо)
  [COPPER]:  { tool: 'pickaxe', tier: 2 },   // камень+ (теперь каменная кирка берёт медь)
  [GOLD]:    { tool: 'pickaxe', tier: 3 },   // медь/железо+
  [DIAMOND]: { tool: 'pickaxe', tier: 3 },   // медь/железо+
  [FURNACE]: { tool: 'pickaxe', tier: 1 }    // дерево+
};