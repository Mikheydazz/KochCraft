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

const TOOLS_BY_KEY = {};

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
/* ============================================================
   Ручка — «инструмент» для будущего функционала (письмо/чернила)
   ============================================================ */
function drawPen(ctx, s) {
  const cx = s / 2;
  ctx.save();
  ctx.translate(cx, cx);
  ctx.rotate(-Math.PI / 4);

  const bodyW = s * 0.14;
  const bodyTop = -s * 0.32;
  const bodyBot = s * 0.28;

  ctx.fillStyle = '#c8c8d0';
  ctx.beginPath();
  ctx.moveTo(-bodyW * 0.4, bodyTop);
  ctx.lineTo(bodyW * 0.4, bodyTop);
  ctx.lineTo(0, bodyTop - s * 0.14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#0a0a18';
  ctx.beginPath();
  ctx.moveTo(-s * 0.012, bodyTop - s * 0.06);
  ctx.lineTo(s * 0.012, bodyTop - s * 0.06);
  ctx.lineTo(0, bodyTop - s * 0.14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#b8b8c0';
  ctx.fillRect(-bodyW * 0.55, bodyTop - s * 0.02, bodyW * 1.1, s * 0.05);

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-bodyW / 2, bodyTop, bodyW, bodyBot - bodyTop);

  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.fillRect(-bodyW * 0.35, bodyTop + 2, bodyW * 0.18, bodyBot - bodyTop - 4);

  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(-bodyW / 2 - s * 0.005, bodyBot, bodyW + s * 0.01, s * 0.035);

  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-bodyW / 2, bodyTop, bodyW, bodyBot - bodyTop);

  ctx.restore();
}

export const PEN = registerTool({
  id: 80, key: 'pen', name: 'Ручка', type: 'pen',
  material: 'iron', tier: 0, durability: 100,
  damage: 0, speed: 1, color: '#1a1a1a',
  icon: drawPen
});
