import { registerTool } from '../registry.js';

/* Порядок ВАЖЕН — id жёстко заданы для совместимости сохранений. */
const MATS = [
  { mat: 'wood',    baseId: 30, color: '#8a5a2a', tier: 1, dur: 60,   speed: 2 },
  { mat: 'stone',   baseId: 34, color: '#808080', tier: 2, dur: 132,  speed: 3 },
  { mat: 'copper',  baseId: 38, color: '#c87533', tier: 3, dur: 180,  speed: 4 },
  { mat: 'iron',    baseId: 42, color: '#d8d8d8', tier: 3, dur: 250,  speed: 5 },
  { mat: 'gold',    baseId: 46, color: '#ffd700', tier: 3, dur: 32,   speed: 7 },
  { mat: 'diamond', baseId: 50, color: '#5ce8e0', tier: 4, dur: 1561, speed: 8 }
];
const TYPES = ['pickaxe', 'axe', 'shovel', 'sword'];
const TYPE_RU = { pickaxe: 'Кирка', axe: 'Топор', shovel: 'Лопата', sword: 'Меч' };
const MAT_RU  = { wood: 'деревянная', stone: 'каменная', copper: 'медная',
                  iron: 'железная', gold: 'золотая', diamond: 'алмазная' };
const BASE_DMG = { pickaxe: 2, axe: 3, shovel: 2, sword: 4 };

export const TOOLS_BY_KEY = {};

for (const m of MATS) {
  TYPES.forEach((t, i) => {
    const id = m.baseId + i;
    const key = `${m.mat}_${t}`;
    // склонение: "Кирка (деревянная)"
    const name = `${TYPE_RU[t]} (${MAT_RU[m.mat]})`;
    TOOLS_BY_KEY[key] = registerTool({
      id, key, name, type: t, material: m.mat,
      tier: m.tier, durability: m.dur,
      damage: BASE_DMG[t], speed: m.speed,
      color: m.color, creative: true
    });
  });
}

/* Именованные экспорты для обратной совместимости */
export const WOODEN_PICKAXE  = TOOLS_BY_KEY.wood_pickaxe;
export const WOODEN_AXE      = TOOLS_BY_KEY.wood_axe;
export const WOODEN_SHOVEL   = TOOLS_BY_KEY.wood_shovel;
export const WOODEN_SWORD    = TOOLS_BY_KEY.wood_sword;
export const STONE_PICKAXE   = TOOLS_BY_KEY.stone_pickaxe;
export const STONE_AXE       = TOOLS_BY_KEY.stone_axe;
export const STONE_SHOVEL    = TOOLS_BY_KEY.stone_shovel;
export const STONE_SWORD     = TOOLS_BY_KEY.stone_sword;
export const COPPER_PICKAXE  = TOOLS_BY_KEY.copper_pickaxe;
export const COPPER_AXE      = TOOLS_BY_KEY.copper_axe;
export const COPPER_SHOVEL   = TOOLS_BY_KEY.copper_shovel;
export const COPPER_SWORD    = TOOLS_BY_KEY.copper_sword;
export const IRON_PICKAXE    = TOOLS_BY_KEY.iron_pickaxe;
export const IRON_AXE        = TOOLS_BY_KEY.iron_axe;
export const IRON_SHOVEL     = TOOLS_BY_KEY.iron_shovel;
export const IRON_SWORD      = TOOLS_BY_KEY.iron_sword;
export const GOLD_PICKAXE    = TOOLS_BY_KEY.gold_pickaxe;
export const GOLD_AXE        = TOOLS_BY_KEY.gold_axe;
export const GOLD_SHOVEL     = TOOLS_BY_KEY.gold_shovel;
export const GOLD_SWORD      = TOOLS_BY_KEY.gold_sword;
export const DIAMOND_PICKAXE = TOOLS_BY_KEY.diamond_pickaxe;
export const DIAMOND_AXE     = TOOLS_BY_KEY.diamond_axe;
export const DIAMOND_SHOVEL  = TOOLS_BY_KEY.diamond_shovel;
export const DIAMOND_SWORD   = TOOLS_BY_KEY.diamond_sword;