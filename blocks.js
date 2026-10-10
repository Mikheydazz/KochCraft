import * as THREE from 'three';
import { ATLAS_COLS, ATLAS_ROWS, T, isWaterBlock } from './constants.js';
import { allBlocks, getById } from './registry.js';

/* BLOCK_DEFS — тонкая карта для быстрого доступа по id */
export const BLOCK_DEFS = {};
for (const b of allBlocks()) {
  BLOCK_DEFS[b.id] = {
    name: b.name,
    top: b.top, bottom: b.bottom, side: b.side, front: b.front,
    liquid: b.liquid
  };
}

export const isSolid = (b) => b !== 0 && !isWaterBlock(b);
export const isBlock = (id) => {
  const d = getById(id);
  return !!d && d.type === 'block';
};
export { isWaterBlock };

/* ============================================================
   АТЛАС ТЕКСТУР — оставляем как было
   ============================================================ */
export function makeAtlas() {
  const S = 16, COLS = ATLAS_COLS, ROWS = ATLAS_ROWS;
  const cv = document.createElement('canvas');
  cv.width = COLS * S; cv.height = ROWS * S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);

  const origin = (t) => [ (t % COLS) * S, Math.floor(t / COLS) * S ];
  const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v | 0;

  function fill(t, r, g, b, variance = 26) {
    const [ox, oy] = origin(t);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = (Math.random() - 0.5) * variance;
      ctx.fillStyle = `rgb(${clamp(r+d)},${clamp(g+d)},${clamp(b+d)})`;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
  function spots(t, r, g, b, count, size, variance = 22) {
    const [ox, oy] = origin(t);
    for (let i = 0; i < count; i++) {
      const cx = 2 + Math.random() * (S - 4), cy = 2 + Math.random() * (S - 4);
      const rad = size * (0.6 + Math.random() * 0.8);
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
        if (x * x + y * y > rad * rad) continue;
        const px = Math.round(cx + x), py = Math.round(cy + y);
        if (px < 0 || py < 0 || px >= S || py >= S) continue;
        const d = (Math.random() - 0.5) * variance;
        ctx.fillStyle = `rgb(${clamp(r+d)},${clamp(g+d)},${clamp(b+d)})`;
        ctx.fillRect(ox + px, oy + py, 1, 1);
      }
    }
  }

  /* ---- Трава ---- */
  fill(T.GRASS_TOP, 92, 158, 58, 34);
  spots(T.GRASS_TOP, 116, 186, 72, 12, 2, 24);

  fill(T.GRASS_SIDE, 134, 96, 60, 26);
  {
    const [ox, oy] = origin(T.GRASS_SIDE);
    for (let x = 0; x < S; x++) {
      const h = 3 + Math.floor(Math.random() * 3);
      for (let y = 0; y < h; y++) {
        const d = (Math.random() - 0.5) * 30;
        ctx.fillStyle = `rgb(${clamp(92+d)},${clamp(158+d)},${clamp(58+d)})`;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  /* ---- Земля / камень / песок / вода ---- */
  fill(T.DIRT, 134, 96, 60, 30);
  spots(T.DIRT, 110, 76, 46, 10, 1.6, 20);

  fill(T.STONE, 128, 128, 132, 30);
  spots(T.STONE, 108, 108, 112, 14, 1.8, 20);

  fill(T.SAND, 224, 212, 156, 22);
  spots(T.SAND, 208, 194, 138, 10, 1.5, 18);

  fill(T.WATER, 46, 106, 200, 20);
  spots(T.WATER, 70, 140, 226, 14, 2, 22);

  /* ---- Бревно ---- */
  fill(T.LOG_SIDE, 104, 76, 40, 22);
  {
    const [ox, oy] = origin(T.LOG_SIDE);
    for (let x = 0; x < S; x++) {
      if (Math.random() < 0.4) {
        const d = (Math.random() - 0.5) * 26;
        ctx.fillStyle = `rgb(${clamp(78+d)},${clamp(56+d)},${clamp(28+d)})`;
        for (let y = 0; y < S; y++)
          if (Math.random() < 0.85) ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
  fill(T.LOG_TOP, 168, 128, 72, 22);
  {
    const [ox, oy] = origin(T.LOG_TOP);
    const c = S / 2 - 0.5;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const r = Math.hypot(x - c, y - c);
      if (Math.sin(r * 2.4) > 0.35) {
        ctx.fillStyle = `rgb(${clamp(126+Math.random()*20)},${clamp(92+Math.random()*16)},${clamp(48+Math.random()*16)})`;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  /* ---- Листва ---- */
  fill(T.LEAVES, 58, 122, 40, 44);
  spots(T.LEAVES, 38, 92, 28, 26, 1.8, 30);
  spots(T.LEAVES, 84, 152, 56, 18, 1.5, 24);

  /* ---- Руды ---- */
  const oreTiles = [
    [T.COAL,    28, 28, 32],
    [T.IRON,    206, 176, 150],
    [T.COPPER,  206, 122, 62],
    [T.GOLD,    244, 208, 76],
    [T.DIAMOND, 92, 232, 224]
  ];
  for (const [tile, r, g, b] of oreTiles) {
    fill(tile, 128, 128, 132, 28);
    spots(tile, r, g, b, 5, 2.6, 26);
    spots(tile, r * 0.75, g * 0.75, b * 0.75, 4, 1.6, 22);
  }

  /* ---- Бедрок ---- */
  fill(T.BEDROCK, 62, 62, 66, 46);
  spots(T.BEDROCK, 34, 34, 38, 16, 2.2, 26);

  /* ---- Доски ---- */
  fill(T.PLANKS, 178, 138, 84, 20);
  {
    const [ox, oy] = origin(T.PLANKS);
    for (let y = 0; y < S; y += 4) {
      ctx.fillStyle = 'rgba(90,64,32,0.7)';
      ctx.fillRect(ox, oy + y, S, 1);
    }
    for (let y = 0; y < S; y += 4) {
      const sx = Math.floor(Math.random() * S);
      ctx.fillStyle = 'rgba(90,64,32,0.55)';
      ctx.fillRect(ox + sx, oy + y, 1, 4);
    }
  }

  /* ---- Верстак ---- */
  fill(T.CRAFTING_TOP, 150, 110, 62, 16);
  {
    const [ox, oy] = origin(T.CRAFTING_TOP);
    ctx.fillStyle = 'rgba(60,40,20,0.85)';
    ctx.fillRect(ox + 1, oy + 1, S - 2, 1);
    ctx.fillRect(ox + 1, oy + S - 2, S - 2, 1);
    ctx.fillRect(ox + 1, oy + 1, 1, S - 2);
    ctx.fillRect(ox + S - 2, oy + 1, 1, S - 2);
    ctx.fillRect(ox + S/2, oy + 1, 1, S - 2);
    ctx.fillRect(ox + 1, oy + S/2, S - 2, 1);
  }
  fill(T.CRAFTING_SIDE, 150, 110, 62, 18);
  {
    const [ox, oy] = origin(T.CRAFTING_SIDE);
    ctx.fillStyle = 'rgba(60,40,20,0.8)';
    for (let y = 0; y < S; y += 5) ctx.fillRect(ox, oy + y, S, 1);
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(ox + 4, oy + 8, 8, 2);
    ctx.fillRect(ox + 4, oy + 6, 3, 6);
  }

  /* ---- Печь ---- */
  fill(T.FURNACE_SIDE, 96, 96, 100, 26);
  spots(T.FURNACE_SIDE, 76, 76, 80, 12, 1.8, 20);
  fill(T.FURNACE_TOP, 100, 100, 104, 22);
  spots(T.FURNACE_TOP, 82, 82, 86, 10, 1.6, 18);
  fill(T.FURNACE_FRONT, 96, 96, 100, 26);
  spots(T.FURNACE_FRONT, 76, 76, 80, 12, 1.8, 20);
  {
    const [ox, oy] = origin(T.FURNACE_FRONT);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(ox + 3, oy + 6, S - 6, 6);
    ctx.fillStyle = '#ff8a2a';
    ctx.fillRect(ox + 5, oy + 8, 2, 3);
    ctx.fillRect(ox + 8, oy + 7, 2, 4);
    ctx.fillRect(ox + 11, oy + 8, 2, 3);
  }

  /* ---- Стекло ---- */
  {
    const [ox, oy] = origin(T.GLASS);
    ctx.clearRect(ox, oy, S, S);
    ctx.fillStyle = 'rgba(150, 210, 255, 0.35)';
    ctx.fillRect(ox, oy, S, S);
    ctx.fillStyle = 'rgba(210, 235, 255, 0.9)';
    ctx.fillRect(ox, oy, S, 1);
    ctx.fillRect(ox, oy + S - 1, S, 1);
    ctx.fillRect(ox, oy, 1, S);
    ctx.fillRect(ox + S - 1, oy, 1, S);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(ox + 3, oy + 3, 4, 1);
    ctx.fillRect(ox + 3, oy + 3, 1, 4);
    ctx.fillRect(ox + 10, oy + 11, 3, 1);
  }

  /* ---- Кирпич ---- */
  {
    const [ox, oy] = origin(T.BRICK);
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, S, S);
    ctx.clip();
    ctx.fillStyle = '#9c9c8e';
    ctx.fillRect(ox, oy, S, S);
    const brickW = 8, brickH = 4, gap = 1;
    for (let row = 0; row < 4; row++) {
      const y = row * (brickH + gap);
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col < 3; col++) {
        const x = col * (brickW + gap) + offset;
        const d = (Math.random() - 0.5) * 18;
        ctx.fillStyle = `rgb(${Math.round(158 + d)},${Math.round(76 + d)},${Math.round(52 + d)})`;
        ctx.fillRect(ox + x, oy + y, brickW, brickH);
        ctx.fillStyle = 'rgba(255,220,200,0.35)';
        ctx.fillRect(ox + x, oy + y, brickW, 1);
      }
    }
    ctx.restore();
  }

    /* ---- Сундук: тёмное дерево + обвязка + замок ---- */
  {
    const [ox, oy] = origin(T.CHEST_TOP);
    // верх — доски с тёмной рамкой
    ctx.fillStyle = '#7a5124';
    ctx.fillRect(ox, oy, S, S);
    for (let i = 0; i < 30; i++) {
      const px = Math.floor(Math.random() * S);
      const py = Math.floor(Math.random() * S);
      const d = (Math.random() - 0.5) * 25;
      ctx.fillStyle = `rgb(${Math.round(122 + d)},${Math.round(81 + d)},${Math.round(36 + d)})`;
      ctx.fillRect(ox + px, oy + py, 1, 1);
    }
    ctx.strokeStyle = 'rgba(45,28,12,0.85)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, S - 1, S - 1);
  }
  {
    const [ox, oy] = origin(T.CHEST_FRONT);
    // фон — тот же бок
    ctx.fillStyle = '#7a5124';
    ctx.fillRect(ox, oy, S, S);
    for (let i = 0; i < 30; i++) {
      const px = Math.floor(Math.random() * S);
      const py = Math.floor(Math.random() * S);
      const d = (Math.random() - 0.5) * 25;
      ctx.fillStyle = `rgb(${Math.round(122 + d)},${Math.round(81 + d)},${Math.round(36 + d)})`;
      ctx.fillRect(ox + px, oy + py, 1, 1);
    }
    // горизонтальная линия крышки
    ctx.fillStyle = 'rgba(45,28,12,0.9)';
    ctx.fillRect(ox, oy + 4, S, 1);
    // рамка
    ctx.strokeStyle = 'rgba(45,28,12,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, S - 1, S - 1);
    // замочная пластина
    ctx.fillStyle = '#c8b064';
    ctx.fillRect(ox + 6, oy + 6, 4, 5);
    ctx.fillStyle = 'rgba(50,35,10,0.9)';
    ctx.fillRect(ox + 7, oy + 9, 2, 2);
    ctx.fillStyle = 'rgba(255,240,200,0.55)';
    ctx.fillRect(ox + 6, oy + 6, 4, 1);
  }
  {
    const [ox, oy] = origin(T.CHEST_SIDE);
    // пока не используем, но пусть будет копия фронта без замка
    ctx.drawImage(cv, ox - (T.CHEST_FRONT - T.CHEST_TOP) * 0, oy, 0, 0, 0, 0, 0, 0); // noop
    const fx = (T.CHEST_FRONT % ATLAS_COLS) * S;
    const fy = Math.floor(T.CHEST_FRONT / ATLAS_COLS) * S;
    ctx.drawImage(cv, fx, fy, S, S, ox, oy, S, S);
    // затираем замок — рисуем поверх фона
    ctx.fillStyle = '#7a5124';
    ctx.fillRect(ox + 5, oy + 5, 6, 7);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}