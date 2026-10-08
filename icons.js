import { ATLAS_COLS, STICK, IRON_INGOT, COPPER_INGOT, GOLD_INGOT, BEEF, PORK } from './constants.js';
import { BLOCK_DEFS, isBlock } from './blocks.js';
import { TOOLS, isTool } from './items.js';

let atlasRef = null;
const cache = new Map();

export function initIcons(atlasCanvas) {
  atlasRef = atlasCanvas;
  cache.clear();
}

export function getIcon(id) {
  if (cache.has(id)) return cache.get(id);
  const url = buildIcon(id);
  cache.set(id, url);
  return url;
}

function buildIcon(id) {
  const size = 48;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (isBlock(id))      drawBlockIcon(ctx, size, id);
  else if (isTool(id))  drawToolIcon(ctx, size, id);
  else                  drawItemIcon(ctx, size, id);

  return cv.toDataURL();
}

/* ============================================================
   БЛОК — изометрический кубик
   ============================================================ */
function drawBlockIcon(ctx, size, id) {
  const def = BLOCK_DEFS[id];
  if (!def) return;

  const cx = size / 2;
  const topY = size * 0.09;
  const hw = size * 0.36;   // half-width
  const qh = size * 0.19;   // половина от вертикали верхней грани
  const sh = size * 0.36;   // высота боковой грани

  // вершины верхней грани
  const A = [cx, topY];
  const B = [cx + hw, topY + qh];
  const C = [cx, topY + 2 * qh];
  const D = [cx - hw, topY + qh];

  const uTop = [B[0] - A[0], B[1] - A[1]];
  const vTop = [D[0] - A[0], D[1] - A[1]];

  const uR = [C[0] - B[0], C[1] - B[1]];
  const vR = [0, sh];

  const uL = [C[0] - D[0], C[1] - D[1]];
  const vL = [0, sh];

  // порядок: левая, правая, верхняя (верхняя перекрывает стык)
  drawFace(ctx, def.side, D, uL, vL, 0.42);
  const rightTile = def.front !== undefined ? def.front : def.side;
  drawFace(ctx, rightTile, B, uR, vR, 0.22);
  drawFace(ctx, def.top, A, uTop, vTop, 0);
}

function drawFace(ctx, tile, P1, u, v, shade) {
  const a = u[0] / 16, b = u[1] / 16;
  const c = v[0] / 16, d = v[1] / 16;
  const sx = (tile % ATLAS_COLS) * 16;
  const sy = Math.floor(tile / ATLAS_COLS) * 16;

  ctx.save();
  ctx.setTransform(a, b, c, d, P1[0], P1[1]);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlasRef, sx, sy, 16, 16, 0, 0, 16, 16);
  if (shade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${shade})`;
    ctx.fillRect(0, 0, 16, 16);
  }
  ctx.restore();
}

/* ============================================================
   ИНСТРУМЕНТЫ
   ============================================================ */
function drawToolIcon(ctx, size, id) {
  const tool = TOOLS[id];
  const col = tool.color;
  const wood = '#6b3f14';
  const woodHi = '#a06a2a';

  if (tool.type === 'sword') { drawSword(ctx, size, col); return; }

  // рукоятка по диагонали
  ctx.strokeStyle = wood;
  ctx.lineWidth = size * 0.11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.32, size * 0.80);
  ctx.lineTo(size * 0.66, size * 0.36);
  ctx.stroke();

  ctx.strokeStyle = woodHi;
  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.moveTo(size * 0.30, size * 0.78);
  ctx.lineTo(size * 0.64, size * 0.34);
  ctx.stroke();

  if (tool.type === 'pickaxe')      drawPickHead(ctx, size, col);
  else if (tool.type === 'axe')     drawAxeHead(ctx, size, col);
  else if (tool.type === 'shovel')  drawShovelHead(ctx, size, col);
}

function drawPickHead(ctx, size, col) {
  const cx = size * 0.66, cy = size * 0.30;
  const w = size * 0.30, h = size * 0.14;

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy + h);
  ctx.lineTo(cx - w + size * 0.04, cy - h * 0.6);
  ctx.lineTo(cx + w - size * 0.04, cy - h * 0.6);
  ctx.lineTo(cx + w, cy + h);
  ctx.lineTo(cx + w - size * 0.06, cy + h);
  ctx.lineTo(cx + w - size * 0.06, cy + h * 0.2);
  ctx.lineTo(cx - w + size * 0.06, cy + h * 0.2);
  ctx.lineTo(cx - w + size * 0.06, cy + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(cx - w * 0.75, cy - h * 0.45, w * 1.5, h * 0.28);
}

function drawAxeHead(ctx, size, col) {
  const cx = size * 0.68, cy = size * 0.30;
  const w = size * 0.24, h = size * 0.28;

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.4, cy - h * 0.6);
  ctx.lineTo(cx + w * 0.55, cy - h * 0.45);
  ctx.quadraticCurveTo(cx + w * 1.0, cy, cx + w * 0.55, cy + h * 0.55);
  ctx.lineTo(cx - w * 0.4, cy + h * 0.65);
  ctx.lineTo(cx - w * 0.4, cy + h * 0.3);
  ctx.lineTo(cx + w * 0.15, cy + h * 0.15);
  ctx.lineTo(cx + w * 0.15, cy - h * 0.15);
  ctx.lineTo(cx - w * 0.4, cy - h * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.45, cy - h * 0.35);
  ctx.quadraticCurveTo(cx + w * 0.8, cy, cx + w * 0.45, cy + h * 0.4);
  ctx.stroke();
}

function drawShovelHead(ctx, size, col) {
  const cx = size * 0.70, cy = size * 0.28;
  const w = size * 0.20, h = size * 0.24;

  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.7, cy - h * 0.5);
  ctx.lineTo(cx + w * 0.7, cy - h * 0.5);
  ctx.lineTo(cx + w * 0.6, cy + h * 0.55);
  ctx.quadraticCurveTo(cx, cy + h * 0.95, cx - w * 0.6, cy + h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(cx - w * 0.35, cy - h * 0.3, w * 0.25, h * 0.7);
}

function drawSword(ctx, size, col) {
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 4);
  ctx.translate(-size / 2, -size / 2);

  const cx = size / 2;
  const bTop = size * 0.08;
  const bBot = size * 0.60;
  const bW = size * 0.16;
  const tipH = size * 0.08;

  // клинок
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx, bTop - tipH * 0.3);
  ctx.lineTo(cx + bW / 2, bTop + tipH * 0.5);
  ctx.lineTo(cx + bW / 2, bBot);
  ctx.lineTo(cx - bW / 2, bBot);
  ctx.lineTo(cx - bW / 2, bTop + tipH * 0.5);
  ctx.closePath();
  ctx.fill();

  // тень и блик
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(cx + bW * 0.1, bTop + tipH * 0.5, bW * 0.4, bBot - bTop - tipH * 0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(cx - bW * 0.4, bTop + tipH * 0.6, bW * 0.22, bBot - bTop - tipH * 0.6);

  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, bTop - tipH * 0.3);
  ctx.lineTo(cx + bW / 2, bTop + tipH * 0.5);
  ctx.lineTo(cx + bW / 2, bBot);
  ctx.lineTo(cx - bW / 2, bBot);
  ctx.lineTo(cx - bW / 2, bTop + tipH * 0.5);
  ctx.closePath();
  ctx.stroke();

  // гарда
  ctx.fillStyle = '#c9b58f';
  ctx.fillRect(cx - bW * 1.5, bBot, bW * 3, size * 0.05);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(cx - bW * 1.5, bBot, bW * 3, size * 0.05);

  // рукоять
  ctx.fillStyle = '#6b3f14';
  ctx.fillRect(cx - bW * 0.5, bBot + size * 0.05, bW, size * 0.20);
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.strokeRect(cx - bW * 0.5, bBot + size * 0.05, bW, size * 0.20);

  ctx.restore();
}

/* ============================================================
   ПРЕДМЕТЫ (палка, слитки)
   ============================================================ */
function drawItemIcon(ctx, size, id) {
  if (id === STICK) drawStick(ctx, size);
  else if (id === IRON_INGOT || id === COPPER_INGOT || id === GOLD_INGOT)
    drawIngot(ctx, size, id);
  else if (id === BEEF) drawMeat(ctx, size, '#8b2f2f', '#5a1a1a');
  else if (id === PORK) drawMeat(ctx, size, '#e8a0a0', '#c07070');
}

function drawMeat(ctx, size, color, dark) {
  const w = size * 0.62, h = size * 0.5;
  const x = (size - w) / 2, y = (size - h) / 2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y);
  ctx.lineTo(x + w * 0.85, y);
  ctx.quadraticCurveTo(x + w, y + h * 0.15, x + w * 0.95, y + h * 0.7);
  ctx.quadraticCurveTo(x + w * 0.9, y + h, x + w * 0.5, y + h);
  ctx.quadraticCurveTo(x + w * 0.1, y + h, x + w * 0.05, y + h * 0.7);
  ctx.quadraticCurveTo(x, y + h * 0.15, x + w * 0.15, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // прожилки
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + w * (0.22 + i * 0.18), y + h * 0.18);
    ctx.lineTo(x + w * (0.28 + i * 0.18), y + h * 0.82);
    ctx.stroke();
  }

  // блик
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h * 0.35, w * 0.13, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStick(ctx, size) {
  ctx.strokeStyle = '#6b3f14';
  ctx.lineWidth = size * 0.15;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.30, size * 0.72);
  ctx.lineTo(size * 0.70, size * 0.28);
  ctx.stroke();

  ctx.strokeStyle = '#a06a2a';
  ctx.lineWidth = size * 0.06;
  ctx.beginPath();
  ctx.moveTo(size * 0.28, size * 0.70);
  ctx.lineTo(size * 0.68, size * 0.26);
  ctx.stroke();
}

function drawIngot(ctx, size, id) {
  const col = {
    [IRON_INGOT]:   { base: '#c8c8c8', light: '#f0f0f0', dark: '#787878' },
    [COPPER_INGOT]: { base: '#c87533', light: '#e89a55', dark: '#7a4010' },
    [GOLD_INGOT]:   { base: '#e8b800', light: '#ffe866', dark: '#a07000' }
  }[id];

  const w = size * 0.66, h = size * 0.36;
  const x = (size - w) / 2;
  const y = (size - h) / 2 + size * 0.04;
  const sl = size * 0.08;

  ctx.fillStyle = col.base;
  ctx.beginPath();
  ctx.moveTo(x + sl, y);
  ctx.lineTo(x + w - sl, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = col.light;
  ctx.beginPath();
  ctx.moveTo(x + sl, y);
  ctx.lineTo(x + w - sl, y);
  ctx.lineTo(x + w - sl * 1.5, y + h * 0.35);
  ctx.lineTo(x + sl * 1.5, y + h * 0.35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = col.dark;
  ctx.fillRect(x, y + h - size * 0.035, w, size * 0.035);

  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + sl, y);
  ctx.lineTo(x + w - sl, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.stroke();
}