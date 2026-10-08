import * as THREE from 'three';
import {
  AIR, GRASS, DIRT, STONE, SAND, WATER, LOG, LEAVES, COAL, IRON,
  COPPER, GOLD, DIAMOND, BEDROCK, PLANKS, CRAFTING_TABLE, FURNACE,
  T, ATLAS_COLS, ATLAS_ROWS
} from './constants.js';

export const BLOCK_DEFS = {
  [GRASS]:   { name: 'Трава',   top: T.GRASS_TOP, bottom: T.DIRT, side: T.GRASS_SIDE },
  [DIRT]:    { name: 'Земля',   all: T.DIRT },
  [STONE]:   { name: 'Камень',  all: T.STONE },
  [SAND]:    { name: 'Песок',   all: T.SAND },
  [WATER]:   { name: 'Вода',    all: T.WATER, liquid: true },
  [LOG]:     { name: 'Бревно',  top: T.LOG_TOP, bottom: T.LOG_TOP, side: T.LOG_SIDE },
  [LEAVES]:  { name: 'Листва',  all: T.LEAVES },
  [COAL]:    { name: 'Угольная руда',   all: T.COAL },
  [IRON]:    { name: 'Железная руда',   all: T.IRON },
  [COPPER]:  { name: 'Медная руда',     all: T.COPPER },
  [GOLD]:    { name: 'Золотая руда',    all: T.GOLD },
  [DIAMOND]: { name: 'Алмазная руда',   all: T.DIAMOND },
  [BEDROCK]: { name: 'Бедрок',  all: T.BEDROCK },
  [PLANKS]:  { name: 'Доски',   all: T.PLANKS },
  [CRAFTING_TABLE]: { name: 'Верстак', top: T.CRAFTING_TOP, bottom: T.PLANKS, side: T.CRAFTING_SIDE },
  [FURNACE]: { name: 'Печь',    top: T.FURNACE_TOP, bottom: T.FURNACE_TOP, side: T.FURNACE_SIDE, front: T.FURNACE_FRONT }
};
for (const id in BLOCK_DEFS) {
  const d = BLOCK_DEFS[id];
  if (d.all !== undefined) { d.top = d.bottom = d.side = d.all; }
}

export const isSolid = (b) => b !== AIR && b !== WATER;
export const isBlock = (id) => id >= 1 && id <= 16;

/* ============================================================
   АТЛАС ТЕКСТУР
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
        if (x*x + y*y > rad*rad) continue;
        const px = Math.round(cx + x), py = Math.round(cy + y);
        if (px < 0 || py < 0 || px >= S || py >= S) continue;
        const d = (Math.random() - 0.5) * variance;
        ctx.fillStyle = `rgb(${clamp(r+d)},${clamp(g+d)},${clamp(b+d)})`;
        ctx.fillRect(ox + px, oy + py, 1, 1);
      }
    }
  }

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
  fill(T.DIRT, 134, 96, 60, 30);
  spots(T.DIRT, 110, 76, 46, 10, 1.6, 20);
  fill(T.STONE, 128, 128, 132, 30);
  spots(T.STONE, 108, 108, 112, 14, 1.8, 20);
  fill(T.SAND, 224, 212, 156, 22);
  spots(T.SAND, 208, 194, 138, 10, 1.5, 18);
  fill(T.WATER, 46, 106, 200, 20);
  spots(T.WATER, 70, 140, 226, 14, 2, 22);

  fill(T.LOG_SIDE, 104, 76, 40, 22);
  {
    const [ox, oy] = origin(T.LOG_SIDE);
    for (let x = 0; x < S; x++) {
      if (Math.random() < 0.4) {
        const d = (Math.random() - 0.5) * 26;
        ctx.fillStyle = `rgb(${clamp(78+d)},${clamp(56+d)},${clamp(28+d)})`;
        for (let y = 0; y < S; y++) if (Math.random() < 0.85) ctx.fillRect(ox + x, oy + y, 1, 1);
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
  fill(T.LEAVES, 58, 122, 40, 44);
  spots(T.LEAVES, 38, 92, 28, 26, 1.8, 30);
  spots(T.LEAVES, 84, 152, 56, 18, 1.5, 24);

  const oreTiles = [
    [T.COAL, 28, 28, 32], [T.IRON, 206, 176, 150], [T.COPPER, 206, 122, 62],
    [T.GOLD, 244, 208, 76], [T.DIAMOND, 92, 232, 224]
  ];
  for (const [tile, r, g, b] of oreTiles) {
    fill(tile, 128, 128, 132, 28);
    spots(tile, r, g, b, 5, 2.6, 26);
    spots(tile, r*0.75, g*0.75, b*0.75, 4, 1.6, 22);
  }

  fill(T.BEDROCK, 62, 62, 66, 46);
  spots(T.BEDROCK, 34, 34, 38, 16, 2.2, 26);

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

  // Верстак — верх
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
  // Верстак — бок
  fill(T.CRAFTING_SIDE, 150, 110, 62, 18);
  {
    const [ox, oy] = origin(T.CRAFTING_SIDE);
    ctx.fillStyle = 'rgba(60,40,20,0.8)';
    for (let y = 0; y < S; y += 5) ctx.fillRect(ox, oy + y, S, 1);
    // «инструмент» на столе
    ctx.fillStyle = '#5a4a30';
    ctx.fillRect(ox + 4, oy + 8, 8, 2);
    ctx.fillRect(ox + 4, oy + 6, 3, 6);
  }

  // Печь — фронт
  fill(T.FURNACE_SIDE, 96, 96, 100, 26);
  spots(T.FURNACE_SIDE, 76, 76, 80, 12, 1.8, 20);
  fill(T.FURNACE_TOP, 100, 100, 104, 22);
  spots(T.FURNACE_TOP, 82, 82, 86, 10, 1.6, 18);
  fill(T.FURNACE_FRONT, 96, 96, 100, 26);
  spots(T.FURNACE_FRONT, 76, 76, 80, 12, 1.8, 20);
  {
    const [ox, oy] = origin(T.FURNACE_FRONT);
    // тёмное отверстие
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(ox + 3, oy + 6, S - 6, 6);
    // «огонь»
    ctx.fillStyle = '#ff8a2a';
    ctx.fillRect(ox + 5, oy + 8, 2, 3);
    ctx.fillRect(ox + 8, oy + 7, 2, 4);
    ctx.fillRect(ox + 11, oy + 8, 2, 3);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}