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

/* ============================================================
   Чернила
   ============================================================ */
function drawInk(ctx, s) {
  const cx = s / 2;
  const botY = s * 0.78;
  const topY = s * 0.42;
  const w = s * 0.44;

  // Корпус склянки
  ctx.fillStyle = '#3a3a45';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.55, botY);
  ctx.lineTo(cx - w * 0.42, topY);
  ctx.lineTo(cx + w * 0.42, topY);
  ctx.lineTo(cx + w * 0.55, botY);
  ctx.closePath();
  ctx.fill();

  // Тёмные чернила внутри
  ctx.fillStyle = '#080814';
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.50, botY - 1);
  ctx.lineTo(cx - w * 0.46, s * 0.56);
  ctx.lineTo(cx + w * 0.46, s * 0.56);
  ctx.lineTo(cx + w * 0.50, botY - 1);
  ctx.closePath();
  ctx.fill();

  // Горлышко
  ctx.fillStyle = '#3a3a45';
  ctx.fillRect(cx - w * 0.20, s * 0.34, w * 0.40, topY - s * 0.34);

  // Пробка
  ctx.fillStyle = '#6b3f14';
  ctx.fillRect(cx - w * 0.25, s * 0.28, w * 0.50, s * 0.07);

  // Блик
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(cx - w * 0.35, s * 0.46, s * 0.025, s * 0.20);

  // Обводка
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.55, botY);
  ctx.lineTo(cx - w * 0.42, topY);
  ctx.lineTo(cx + w * 0.42, topY);
  ctx.lineTo(cx + w * 0.55, botY);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.55, botY);
  ctx.lineTo(cx + w * 0.55, botY);
  ctx.stroke();
}

export const INK = registerItem({
  id: 79, key: 'ink', name: 'Чернила',
  color: '#0a0a18', creative: true, icon: drawInk
});

/* ============================================================
   Ведро и ведро с водой
   ============================================================ */
function drawBucket(ctx, s, filled) {
  const cx = s / 2;
  const topW = s * 0.42;
  const botW = s * 0.30;
  const topY = s * 0.34;
  const botY = s * 0.80;

  // Ручка (дуга)
  ctx.strokeStyle = '#4a4a52';
  ctx.lineWidth = s * 0.045;
  ctx.beginPath();
  ctx.arc(cx, topY, topW * 0.85, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Корпус (трапеция)
  ctx.fillStyle = '#5a5a62';
  ctx.beginPath();
  ctx.moveTo(cx - topW, topY);
  ctx.lineTo(cx - botW, botY);
  ctx.lineTo(cx + botW, botY);
  ctx.lineTo(cx + topW, topY);
  ctx.closePath();
  ctx.fill();

  // Внутренность (тёмное отверстие)
  ctx.fillStyle = '#2a2a30';
  ctx.beginPath();
  ctx.ellipse(cx, topY, topW * 0.95, s * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  // Вода внутри
  if (filled) {
    ctx.fillStyle = '#2e6ac8';
    ctx.beginPath();
    ctx.ellipse(cx, topY + s * 0.01, topW * 0.85, s * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Блик
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(cx - topW * 0.55, topY + s * 0.05, s * 0.028, botY - topY - s * 0.10);

  // Обводка
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - topW, topY);
  ctx.lineTo(cx - botW, botY);
  ctx.lineTo(cx + botW, botY);
  ctx.lineTo(cx + topW, topY);
  ctx.closePath();
  ctx.stroke();
}

export const BUCKET = registerItem({
  id: 81, key: 'bucket', name: 'Ведро',
  color: '#5a5a62', creative: true,
  icon: (ctx, s) => drawBucket(ctx, s, false)
});

export const WATER_BUCKET = registerItem({
  id: 82, key: 'water_bucket', name: 'Ведро с водой',
  color: '#2e6ac8', creative: true,
  icon: (ctx, s) => drawBucket(ctx, s, true)
});

/* ============================================================
   Опилки
   ============================================================ */
function drawSawdust(ctx, s) {
  const cx = s / 2;
  const baseY = s * 0.78;

  // Насыпь
  const grad = ctx.createLinearGradient(0, baseY - s * 0.3, 0, baseY);
  grad.addColorStop(0, '#e8d0a0');
  grad.addColorStop(1, '#a88550');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, baseY);
  ctx.quadraticCurveTo(cx - s * 0.20, baseY - s * 0.28, cx, baseY - s * 0.30);
  ctx.quadraticCurveTo(cx + s * 0.20, baseY - s * 0.28, cx + s * 0.36, baseY);
  ctx.closePath();
  ctx.fill();

  // Кудрявые стружки сверху
  ctx.strokeStyle = '#f0dcb0';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const px = cx + (Math.random() - 0.5) * s * 0.44;
    const py = baseY - s * 0.14 - Math.random() * s * 0.16;
    const r = s * 0.03 + Math.random() * s * 0.025;
    const a0 = Math.random() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(px, py, r, a0, a0 + Math.PI * 1.3);
    ctx.stroke();
  }

  // Мелкие точки-пылинки
  for (let i = 0; i < 12; i++) {
    const px = cx + (Math.random() - 0.5) * s * 0.6;
    const py = baseY - Math.random() * s * 0.30;
    ctx.fillStyle = Math.random() < 0.5 ? '#f0dcb0' : '#b89458';
    ctx.fillRect(px, py, 1.6, 1.6);
  }

  // Обводка контура насыпи
  ctx.strokeStyle = 'rgba(80,60,30,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, baseY);
  ctx.quadraticCurveTo(cx - s * 0.20, baseY - s * 0.28, cx, baseY - s * 0.30);
  ctx.quadraticCurveTo(cx + s * 0.20, baseY - s * 0.28, cx + s * 0.36, baseY);
  ctx.stroke();
}

export const SAWDUST = registerItem({
  id: 83, key: 'sawdust', name: 'Опилки',
  color: '#c9a86a', creative: true, icon: drawSawdust
});

/* ============================================================
   Целлюлоза
   ============================================================ */
function drawCellulose(ctx, s) {
  const cx = s / 2;
  const baseY = s * 0.80;

  // Основная масса
  ctx.fillStyle = '#e8e8f0';
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, baseY);
  ctx.quadraticCurveTo(cx - s * 0.30, baseY - s * 0.25, cx, baseY - s * 0.30);
  ctx.quadraticCurveTo(cx + s * 0.30, baseY - s * 0.25, cx + s * 0.35, baseY);
  ctx.closePath();
  ctx.fill();

  // Пушистые волокна
  ctx.strokeStyle = '#f4f4fa';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI * 0.7 + (i / 7) * Math.PI * 1.4;
    const r = s * 0.20 + Math.random() * s * 0.08;
    const px = cx + Math.cos(a) * r;
    const py = baseY - s * 0.10 + Math.sin(a) * r * 0.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (Math.random() - 0.5) * s * 0.06, py - Math.random() * s * 0.05);
    ctx.stroke();
  }

  // Тень
  ctx.fillStyle = 'rgba(150,160,180,0.30)';
  ctx.beginPath();
  ctx.ellipse(cx + s * 0.08, baseY - s * 0.05, s * 0.20, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Обводка
  ctx.strokeStyle = 'rgba(100,100,120,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.35, baseY);
  ctx.quadraticCurveTo(cx - s * 0.30, baseY - s * 0.25, cx, baseY - s * 0.30);
  ctx.quadraticCurveTo(cx + s * 0.30, baseY - s * 0.25, cx + s * 0.35, baseY);
  ctx.stroke();
}

export const CELLULOSE = registerItem({
  id: 86, key: 'cellulose', name: 'Целлюлоза',
  color: '#e8e8f0', creative: true, icon: drawCellulose
});

/* ============================================================
   Бумага
   ============================================================ */
function drawPaper(ctx, s) {
  const cx = s / 2;

  // Лист бумаги с лёгким поворотом
  ctx.save();
  ctx.translate(cx, cx);
  ctx.rotate(-0.08);

  const w = s * 0.52;
  const h = s * 0.64;

  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w, h);

  // Основной лист
  ctx.fillStyle = '#f4f2e8';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Загнутый уголок
  ctx.fillStyle = '#d8d5c8';
  ctx.beginPath();
  ctx.moveTo(w / 2 - s * 0.10, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + s * 0.10);
  ctx.closePath();
  ctx.fill();

  // Горизонтальные линии текста (сверхлёгкие)
  ctx.strokeStyle = 'rgba(150,150,170,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = -h / 2 + s * 0.16 + i * s * 0.10;
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, y);
    ctx.lineTo(w * 0.30, y);
    ctx.stroke();
  }

  // Обводка
  ctx.strokeStyle = 'rgba(120,120,140,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  ctx.restore();
}

export const PAPER = registerItem({
  id: 87, key: 'paper', name: 'Бумага',
  color: '#f4f2e8', creative: true, icon: drawPaper
});

/* ============================================================
   Книга
   ============================================================ */
function drawBook(ctx, s) {
  const cx = s / 2;
  const cy = s / 2 + s * 0.02;

  const w = s * 0.60;
  const h = s * 0.56;

  ctx.save();
  ctx.translate(cx, cy);

  // Тень
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.52, w * 0.52, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Обложка (коричневая)
  ctx.fillStyle = '#8a3a1a';
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // Корешок (тёмный)
  ctx.fillStyle = '#5c2410';
  ctx.fillRect(-w / 2, -h / 2, w * 0.12, h);

  // Обрез страниц (светло-бежевый, тонкая полоска справа)
  ctx.fillStyle = '#f4ecd0';
  ctx.fillRect(w / 2 - w * 0.05, -h / 2 + h * 0.06, w * 0.04, h - h * 0.12);

  // Полоски страниц
  ctx.strokeStyle = 'rgba(180,160,120,0.55)';
  ctx.lineWidth = 0.7;
  for (let i = 1; i < 5; i++) {
    const y = -h / 2 + (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(w / 2 - w * 0.05, y);
    ctx.lineTo(w / 2, y);
    ctx.stroke();
  }

  // Тиснение на обложке
  ctx.strokeStyle = 'rgba(255,220,150,0.55)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-w / 2 + w * 0.18, -h / 2 + h * 0.15, w * 0.62, h * 0.7);

  // Маленький символ (типа застёжки)
  ctx.fillStyle = '#c8a85a';
  ctx.fillRect(w * 0.28, -h * 0.05, w * 0.06, h * 0.20);

  // Обводка обложки
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  ctx.restore();
}

export const BOOK = registerItem({
  id: 88, key: 'book', name: 'Книга',
  color: '#8a3a1a', creative: true, icon: drawBook
});