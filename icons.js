import { ATLAS_COLS } from './constants.js';
import { BLOCK_DEFS } from './blocks.js';
import { getById, isBlock, isTool } from './registry.js';
import { TOOLS } from './items.js';

let atlasRef = null;
const canvasCache = new Map();
const urlCache = new Map();

export function initIcons(atlasCanvas) {
  atlasRef = atlasCanvas;
  canvasCache.clear();
  urlCache.clear();
}

export function getIconCanvas(id) {
  if (canvasCache.has(id)) return canvasCache.get(id);
  const cv = buildIconCanvas(id);
  canvasCache.set(id, cv);
  return cv;
}
export function getIcon(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const url = getIconCanvas(id).toDataURL();
  urlCache.set(id, url);
  return url;
}

function buildIconCanvas(id) {
  const size = 48;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const def = getById(id);
  if (!def) return cv;

  if (def.type === 'block' && def.stairs) drawStairsIcon(ctx, size, def);
  else if (def.type === 'block')          drawBlockIcon(ctx, size, def);
  else if (def.type === 'tool')           drawToolIcon(ctx, size, def);
  else if (def.icon)                      def.icon(ctx, size);
  else                                    drawFallback(ctx, size, def);

  return cv;
}

function drawFallback(ctx, size, def) {
  ctx.fillStyle = def.color || '#888';
  ctx.fillRect(size * 0.2, size * 0.2, size * 0.6, size * 0.6);
}

/* ---------- Блоки ---------- */
function drawBlockIcon(ctx, size, def) {
  const cx = size / 2;
  const topY = size * 0.09;
  const hw = size * 0.36, qh = size * 0.19, sh = size * 0.36;

  const A = [cx, topY];              // верхний угол ромба
  const B = [cx + hw, topY + qh];    // правый
  const C = [cx, topY + 2 * qh];     // нижний
  const D = [cx - hw, topY + qh];    // левый

  // левая грань: от D вниз до C, затем вниз на высоту sh
  drawFace(ctx, def.side, D, [C[0] - D[0], C[1] - D[1]], [0, sh], 0.42);
  // правая грань: от B вниз до C, затем вниз на высоту sh
  drawFace(ctx, def.front !== undefined ? def.front : def.side, B,
           [C[0] - B[0], C[1] - B[1]], [0, sh], 0.22);
  // верхняя грань: ромб
  drawFace(ctx, def.top, A, [B[0] - A[0], B[1] - A[1]], [D[0] - A[0], D[1] - A[1]], 0);
}

function drawStairsIcon(ctx, size, def) {
  const cx = size / 2;
  const topY = size * 0.14;
  const hw = size * 0.36;
  const qh = size * 0.19;
  const half = size * 0.18;   // высота одного слоя ступеньки

  // Геометрия:
  //   A — верхний угол верхнего ромба
  //   B — правый угол верхнего ромба
  //   C — нижний угол верхнего ромба
  //   D — левый угол верхнего ромба
  // Опускаем на half: получаем второй ряд, ещё на half — основание.
  const A  = [cx, topY];
  const B  = [cx + hw, topY + qh];
  const C  = [cx, topY + 2 * qh];
  const D  = [cx - hw, topY + qh];
  const A2 = [A[0], A[1] + half];
  const B2 = [B[0], B[1] + half];
  const C2 = [C[0], C[1] + half];
  const D2 = [D[0], D[1] + half];
  const A3 = [A[0], A[1] + 2 * half];
  const B3 = [B[0], B[1] + 2 * half];
  const C3 = [C[0], C[1] + 2 * half];
  const D3 = [D[0], D[1] + 2 * half];

  // Верхний слой — только левая половина (показательно, как ступенька)
  // Рисуем верхнюю грань верхнего слоя (ромб D-A-C?), но только левая половина:
  //   D, A, середина AC, середина DC
  const midAC = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
  const midDC = [(D[0] + C[0]) / 2, (D[1] + C[1]) / 2];
  // Оставим только верхнюю грань верхнего слоя (левая половина ромба)
  // и верхнюю грань нижнего слоя (правая половина ромба).

  // --- Верхний слой (левая часть) ---
  // Верхняя грань (левая половина): D-A-середина AC-середина DC
  drawQuad(ctx, def.top, D, A, midAC, midDC, 0);
  // Левая грань верхнего слоя: D-D2-D3-D3+D
  drawQuad(ctx, def.side, D, D2, [D2[0], D2[1] + half], [D[0], D[1] + half], 0.22);
  // Передняя левая грань верхнего слоя: D-середина DC-...  
  drawQuad(ctx, def.front !== undefined ? def.front : def.side,
           midDC, D, D2, [midDC[0], midDC[1] + half], 0.32);

  // --- Нижний слой (полный) ---
  // Верхняя грань нижнего слоя (видимая правая часть): midAC-C-midDC+?
  // Строим ромб нижнего слоя: A2-B2-C2-D2
  // Правая верхняя часть ромба — A2-B2-C2-midAC2... сложно.
  // Упростим: нарисуем верхнюю грань нижнего слоя целиком, но поверх неё уже
  // лежит верхний слой слева — перекроется.
  drawQuad(ctx, def.top, D2, A2, C2, [D2[0], D2[1]], 0.10);   // вся верхняя грань нижнего слоя

  // Левая грань нижнего слоя
  drawQuad(ctx, def.side, D2, D3, [D3[0], D3[1] + half], [D2[0], D2[1] + half], 0.32);
  // Передняя грань нижнего слоя (левая половина): D2-? 
  // Правая грань нижнего слоя
  drawQuad(ctx, def.side, B2, C2, C3, B3, 0.18);
  // Передняя правая грань (B2-C2):
  drawQuad(ctx, def.front !== undefined ? def.front : def.side,
           B2, C2, C3, B3, 0.30);
}

function drawQuad(ctx, tile, p1, p2, p3, p4, shade) {
  // Проецируем четырёхугольник через setTransform по двум векторам от p1.
  const u = [p2[0] - p1[0], p2[1] - p1[1]];
  const v = [p4[0] - p1[0], p4[1] - p1[1]];
  const a = u[0] / 16, b = u[1] / 16;
  const c = v[0] / 16, d = v[1] / 16;
  const sx = (tile % ATLAS_COLS) * 16;
  const sy = Math.floor(tile / ATLAS_COLS) * 16;
  ctx.save();
  ctx.setTransform(a, b, c, d, p1[0], p1[1]);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlasRef, sx, sy, 16, 16, 0, 0, 16, 16);
  if (shade > 0) { ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fillRect(0,0,16,16); }
  ctx.restore();
}

function drawFace(ctx, tile, P, u, v, shade) {
  const a = u[0] / 16, b = u[1] / 16;
  const c = v[0] / 16, d = v[1] / 16;
  const sx = (tile % ATLAS_COLS) * 16;
  const sy = Math.floor(tile / ATLAS_COLS) * 16;
  ctx.save();
  ctx.setTransform(a, b, c, d, P[0], P[1]);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlasRef, sx, sy, 16, 16, 0, 0, 16, 16);
  if (shade > 0) { ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fillRect(0,0,16,16); }
  ctx.restore();
}

/* ---------- Инструменты ---------- */
function drawToolIcon(ctx, size, def) {
  // Если у инструмента задана кастомная иконка — используем её.
  if (def.icon) { def.icon(ctx, size); return; }

  const col = def.color;
  const t = def.toolType;
  const wood = '#6b3f14', woodHi = '#a06a2a';

  if (t === 'sword') return drawSword(ctx, size, col);

  ctx.strokeStyle = wood; ctx.lineWidth = size * 0.11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(size*0.32, size*0.80); ctx.lineTo(size*0.66, size*0.36); ctx.stroke();
  ctx.strokeStyle = woodHi; ctx.lineWidth = size * 0.035;
  ctx.beginPath(); ctx.moveTo(size*0.30, size*0.78); ctx.lineTo(size*0.64, size*0.34); ctx.stroke();

  if (t === 'pickaxe')     drawPickHead(ctx, size, col);
  else if (t === 'axe')    drawAxeHead(ctx, size, col);
  else if (t === 'shovel') drawShovelHead(ctx, size, col);
}

function drawPickHead(ctx, size, col) {
  const cx = size*0.66, cy = size*0.30, w = size*0.30, h = size*0.14;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx-w, cy+h); ctx.lineTo(cx-w+size*0.04, cy-h*0.6);
  ctx.lineTo(cx+w-size*0.04, cy-h*0.6); ctx.lineTo(cx+w, cy+h);
  ctx.lineTo(cx+w-size*0.06, cy+h); ctx.lineTo(cx+w-size*0.06, cy+h*0.2);
  ctx.lineTo(cx-w+size*0.06, cy+h*0.2); ctx.lineTo(cx-w+size*0.06, cy+h);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawAxeHead(ctx, size, col) {
  const cx = size*0.68, cy = size*0.30, w = size*0.24, h = size*0.28;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx-w*0.4, cy-h*0.6);
  ctx.lineTo(cx+w*0.55, cy-h*0.45);
  ctx.quadraticCurveTo(cx+w*1.0, cy, cx+w*0.55, cy+h*0.55);
  ctx.lineTo(cx-w*0.4, cy+h*0.65);
  ctx.lineTo(cx-w*0.4, cy+h*0.3);
  ctx.lineTo(cx+w*0.15, cy+h*0.15);
  ctx.lineTo(cx+w*0.15, cy-h*0.15);
  ctx.lineTo(cx-w*0.4, cy-h*0.3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawShovelHead(ctx, size, col) {
  const cx = size*0.70, cy = size*0.28, w = size*0.20, h = size*0.24;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx-w*0.7, cy-h*0.5); ctx.lineTo(cx+w*0.7, cy-h*0.5);
  ctx.lineTo(cx+w*0.6, cy+h*0.55);
  ctx.quadraticCurveTo(cx, cy+h*0.95, cx-w*0.6, cy+h*0.55);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
}
function drawSword(ctx, size, col) {
  ctx.save();
  ctx.translate(size/2, size/2); ctx.rotate(-Math.PI/4); ctx.translate(-size/2, -size/2);
  const cx = size/2, bTop = size*0.08, bBot = size*0.60, bW = size*0.16, tipH = size*0.08;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx, bTop - tipH*0.3); ctx.lineTo(cx+bW/2, bTop+tipH*0.5);
  ctx.lineTo(cx+bW/2, bBot); ctx.lineTo(cx-bW/2, bBot);
  ctx.lineTo(cx-bW/2, bTop+tipH*0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(cx - bW*0.4, bTop + tipH*0.6, bW*0.22, bBot - bTop - tipH*0.6);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#c9b58f'; ctx.fillRect(cx - bW*1.5, bBot, bW*3, size*0.05);
  ctx.fillStyle = '#6b3f14'; ctx.fillRect(cx - bW*0.5, bBot + size*0.05, bW, size*0.20);
  ctx.restore();
}