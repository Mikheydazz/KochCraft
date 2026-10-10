import { registerItem } from '../registry.js';

/* ---------- Иконки (рисуются на canvas 48×48) ---------- */
function drawStick(ctx, s) {
  ctx.strokeStyle = '#6b3f14'; ctx.lineWidth = s * 0.15; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s * 0.30, s * 0.72); ctx.lineTo(s * 0.70, s * 0.28); ctx.stroke();
  ctx.strokeStyle = '#a06a2a'; ctx.lineWidth = s * 0.06;
  ctx.beginPath(); ctx.moveTo(s * 0.28, s * 0.70); ctx.lineTo(s * 0.68, s * 0.26); ctx.stroke();
}
function makeIngot(base, light, dark) {
  return (ctx, s) => {
    const w = s * 0.66, h = s * 0.36;
    const x = (s - w) / 2, y = (s - h) / 2 + s * 0.04;
    const sl = s * 0.08;
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.moveTo(x + sl, y); ctx.lineTo(x + w - sl, y);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.moveTo(x + sl, y); ctx.lineTo(x + w - sl, y);
    ctx.lineTo(x + w - sl * 1.5, y + h * 0.35);
    ctx.lineTo(x + sl * 1.5, y + h * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(x, y + h - s * 0.035, w, s * 0.035);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + sl, y); ctx.lineTo(x + w - sl, y);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.stroke();
  };
}
function drawCoal(ctx, s) {
  const cx = s / 2, cy = s / 2, R = s * 0.32;
  const pts = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = R * (0.75 + Math.random() * 0.4);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = '#1c1c20'; ctx.fill();
  ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = 'rgba(120,120,130,.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - R * 0.55, cy - R * 0.15); ctx.lineTo(cx, cy - R * 0.55); ctx.lineTo(cx + R * 0.6, cy - R * 0.1); ctx.stroke();
}
function drawClay(ctx, s) {
  const cx = s / 2, cy = s / 2 + s * 0.02, R = s * 0.30;
  ctx.beginPath();
  ctx.moveTo(cx - R, cy + R * 0.4);
  ctx.quadraticCurveTo(cx - R * 1.1, cy - R * 0.6, cx - R * 0.3, cy - R * 0.9);
  ctx.quadraticCurveTo(cx + R * 0.6, cy - R * 1.05, cx + R * 1.05, cy - R * 0.25);
  ctx.quadraticCurveTo(cx + R * 1.15, cy + R * 0.7, cx + R * 0.35, cy + R * 0.85);
  ctx.quadraticCurveTo(cx - R * 0.5, cy + R * 0.95, cx - R, cy + R * 0.4);
  ctx.closePath();
  ctx.fillStyle = '#b8a89a'; ctx.fill();
  ctx.strokeStyle = 'rgba(70,55,45,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,250,240,0.55)';
  ctx.beginPath(); ctx.ellipse(cx - R * 0.35, cy - R * 0.4, R * 0.32, R * 0.20, -0.5, 0, Math.PI * 2); ctx.fill();
}
function drawBrick(ctx, s) {
  const w = s * 0.62, h = s * 0.38, x = (s - w) / 2, y = (s - h) / 2;
  ctx.fillStyle = '#a8503a'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,205,180,0.5)'; ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(60,25,15,0.55)'; ctx.fillRect(x, y + h - 2, w, 2);
  ctx.strokeStyle = 'rgba(40,15,10,0.75)'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
}
function makeMeat(color, dark) {
  return (ctx, s) => {
    const w = s * 0.62, h = s * 0.5, x = (s - w) / 2, y = (s - h) / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y); ctx.lineTo(x + w * 0.85, y);
    ctx.quadraticCurveTo(x + w, y + h * 0.15, x + w * 0.95, y + h * 0.7);
    ctx.quadraticCurveTo(x + w * 0.9, y + h, x + w * 0.5, y + h);
    ctx.quadraticCurveTo(x + w * 0.1, y + h, x + w * 0.05, y + h * 0.7);
    ctx.quadraticCurveTo(x, y + h * 0.15, x + w * 0.15, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + w * (0.22 + i * 0.18), y + h * 0.18);
      ctx.lineTo(x + w * (0.28 + i * 0.18), y + h * 0.82);
      ctx.stroke();
    }
  };
}

/* ---------- Предметы ---------- */
export const STICK = registerItem({
  id: 17, key: 'stick', name: 'Палка',
  color: '#8a5a2a', creative: true, icon: drawStick
});
export const IRON_INGOT = registerItem({
  id: 18, key: 'iron_ingot', name: 'Железный слиток',
  color: '#d8d8d8', creative: true,
  icon: makeIngot('#c8c8c8', '#f0f0f0', '#787878')
});
export const COPPER_INGOT = registerItem({
  id: 19, key: 'copper_ingot', name: 'Медный слиток',
  color: '#c87533', creative: true,
  icon: makeIngot('#c87533', '#e89a55', '#7a4010')
});
export const GOLD_INGOT = registerItem({
  id: 20, key: 'gold_ingot', name: 'Золотой слиток',
  color: '#e8b800', creative: true,
  icon: makeIngot('#e8b800', '#ffe866', '#a07000')
});
export const BEEF = registerItem({
  id: 54, key: 'beef', name: 'Говядина',
  color: '#8b2f2f', creative: true,
  icon: makeMeat('#8b2f2f', '#5a1a1a'),
  food: { heal: 4 }
});
export const PORK = registerItem({
  id: 55, key: 'pork', name: 'Свинина',
  color: '#e8a0a0', creative: true,
  icon: makeMeat('#e8a0a0', '#c07070'),
  food: { heal: 3 }
});
export const COAL_ITEM = registerItem({
  id: 56, key: 'coal', name: 'Уголь',
  color: '#1c1c20', creative: true, icon: drawCoal,
  fuel: 8
});
export const CLAY = registerItem({
  id: 63, key: 'clay', name: 'Глина',
  color: '#b8a89a', creative: true, icon: drawClay
});
export const BRICK = registerItem({
  id: 64, key: 'brick', name: 'Кирпич',
  color: '#a8503a', creative: true, icon: drawBrick
});