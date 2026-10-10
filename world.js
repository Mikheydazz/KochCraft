import * as THREE from 'three';
import {
  AIR, WATER, STONE, GRASS, DIRT, SAND, BEDROCK, LOG, LEAVES, COAL, IRON, COPPER, GOLD, DIAMOND,
  GLASS, FLOWING_WATER_1,
  CS, WORLD_HEIGHT, SEA_LEVEL, RD_GEN, BIOME_OCEAN, BIOME_FOREST, BIOME_PLAINS,
  FACES, ATLAS_COLS, ATLAS_ROWS
} from './constants.js';
import { perlin, fbm2, hash2 } from './noise.js';
import { BLOCK_DEFS, isWaterBlock } from './blocks.js';
import { tryPlaceStructures } from './structures.js';
import { scene, blockMaterial, waterMaterial, glassMaterial } from './scene.js';

export function terrainHeight(wx, wz) {
  const cont  = fbm2(wx * 0.0035, wz * 0.0035, 4);
  const hills = fbm2(wx * 0.021 + 100, wz * 0.021 + 100, 3);
  let h = SEA_LEVEL + cont * 27 + hills * 4;
  h = Math.floor(h);
  if (h < 2) h = 2;
  if (h > WORLD_HEIGHT - 8) h = WORLD_HEIGHT - 8;
  return h;
}

export function biomeAt(wx, wz, h) {
  if (h <= SEA_LEVEL) return BIOME_OCEAN;
  const n = fbm2(wx * 0.008 + 500, wz * 0.008 + 500, 3);
  return n > 0.05 ? BIOME_FOREST : BIOME_PLAINS;
}

function isCave(x, y, z) {
  if (y < 3 || y > SEA_LEVEL + 20) return false;
  const s = 0.055, sy = s * 1.7;
  const n1 = perlin.noise3(x * s, y * sy, z * s);
  const n2 = perlin.noise3(x * s + 137, y * sy + 91, z * s + 43);
  return (n1 * n1 + n2 * n2) < 0.010;
}

function oreAt(x, y, z) {
  if (y < 6) return 0;
  if (y < 16 && perlin.noise3(x*0.15+31.7, y*0.15+11.3, z*0.15+7.1) > 0.62) return DIAMOND;
  if (y < 30 && perlin.noise3(x*0.13+51.2, y*0.13+23.9, z*0.13+91.4) > 0.60) return GOLD;
  if (y < 48 && perlin.noise3(x*0.12+17.4, y*0.12+63.1, z*0.12+29.8) > 0.565) return COPPER;
  if (y < 46 && perlin.noise3(x*0.12+77.9, y*0.12+41.6, z*0.12+13.2) > 0.565) return IRON;
  if (y < 56 && perlin.noise3(x*0.11+5.5,  y*0.11+88.8, z*0.11+55.5) > 0.48)  return COAL;
  return 0;
}

export const worldEvents = { onBlockChange: null };
export class Chunk {
  constructor(cx, cz) {
    this.cx = cx; this.cz = cz;
    this.blocks = new Uint8Array(CS * CS * WORLD_HEIGHT);
    this.mesh = null;
    this.waterMesh = null;
    this.glassMesh = null;
    this.generated = false;
    this.dirty = true;
  }
  idx(x, y, z) { return y * CS * CS + z * CS + x; }
}

export const world = {
  chunks: new Map(),
  key(cx, cz) { return cx + ',' + cz; },
  getChunk(cx, cz) { return this.chunks.get(this.key(cx, cz)); },
  getBlock(wx, wy, wz) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return AIR;
    const cx = Math.floor(wx / CS), cz = Math.floor(wz / CS);
    const c = this.chunks.get(this.key(cx, cz));
    if (!c) return AIR;
    return c.blocks[c.idx(wx - cx * CS, wy, wz - cz * CS)];
  },
  setBlock(wx, wy, wz, v) {
    if (wy < 0 || wy >= WORLD_HEIGHT) return;
    const cx = Math.floor(wx / CS), cz = Math.floor(wz / CS);
    const c = this.chunks.get(this.key(cx, cz));
    if (!c) return;
    const lx = wx - cx * CS, lz = wz - cz * CS;
    c.blocks[c.idx(lx, wy, lz)] = v;
    c.dirty = true;

    // фиксируем изменение
    const idx = (wy * CS + lz) * CS + lx;
    const ck = cx + ',' + cz;
    let m = changesByChunk.get(ck);
    if (!m) { m = new Map(); changesByChunk.set(ck, m); }
    m.set(idx, v);

    if (lx === 0)        { const n = this.getChunk(cx - 1, cz); if (n) n.dirty = true; }
    if (lx === CS - 1)   { const n = this.getChunk(cx + 1, cz); if (n) n.dirty = true; }
    if (lz === 0)        { const n = this.getChunk(cx, cz - 1); if (n) n.dirty = true; }
    if (lz === CS - 1)   { const n = this.getChunk(cx, cz + 1); if (n) n.dirty = true; }

    if (worldEvents.onBlockChange) worldEvents.onBlockChange(wx, wy, wz);
  }
};

/* ============================================================
   ИЗМЕНЕНИЯ БЛОКОВ (для сохранений)
   ============================================================ */
const changesByChunk = new Map();   // "cx,cz" -> Map<localIdx, blockId>

export function clearAllChanges() {
  changesByChunk.clear();
}

export function getAllChanges() {
  const out = [];
  for (const [ck, m] of changesByChunk) {
    const comma = ck.indexOf(',');
    const cx = parseInt(ck.slice(0, comma), 10);
    const cz = parseInt(ck.slice(comma + 1), 10);
    for (const [idx, v] of m) {
      const lx = idx % CS;
      const lz = Math.floor(idx / CS) % CS;
      const ly = Math.floor(idx / (CS * CS));
      out.push({ x: cx * CS + lx, y: ly, z: cz * CS + lz, v });
    }
  }
  return out;
}

export function applyChanges(changes) {
  changesByChunk.clear();
  if (!changes) return;
  for (const c of changes) {
    const cx = Math.floor(c.x / CS);
    const cz = Math.floor(c.z / CS);
    const lx = c.x - cx * CS;
    const lz = c.z - cz * CS;
    const idx = (c.y * CS + lz) * CS + lx;
    const ck = cx + ',' + cz;
    let m = changesByChunk.get(ck);
    if (!m) { m = new Map(); changesByChunk.set(ck, m); }
    m.set(idx, c.v);
  }
}

function setLocal(chunk, wx, wy, wz, block, onlyIfAir) {
  const lx = wx - chunk.cx * CS, lz = wz - chunk.cz * CS;
  if (lx < 0 || lx >= CS || lz < 0 || lz >= CS) return;
  if (wy < 0 || wy >= WORLD_HEIGHT) return;
  const i = chunk.idx(lx, wy, lz);
  if (onlyIfAir && chunk.blocks[i] !== AIR) return;
  chunk.blocks[i] = block;
}

export function generateChunk(chunk) {
  const { cx, cz, blocks } = chunk;
  for (let z = 0; z < CS; z++) {
    for (let x = 0; x < CS; x++) {
      const wx = cx * CS + x, wz = cz * CS + z;
      const h = terrainHeight(wx, wz);
      const biome = biomeAt(wx, wz, h);
      const beach = h <= SEA_LEVEL + 1;
      for (let y = 0; y <= h; y++) {
        let block;
        if (y === 0) block = BEDROCK;
        else if (y === h) block = (beach || biome === BIOME_OCEAN) ? SAND : GRASS;
        else if (y > h - 4) block = beach ? SAND : DIRT;
        else block = STONE;
        if (block === STONE) {
          const ore = oreAt(wx, y, wz);
          if (ore) block = ore;
        }
        if (y > 0 && y < h && isCave(wx, y, wz)) block = AIR;
        blocks[chunk.idx(x, y, z)] = block;
      }
      for (let y = h + 1; y <= SEA_LEVEL; y++) blocks[chunk.idx(x, y, z)] = WATER;
    }
  }
  for (let z = -3; z < CS + 3; z++) {
    for (let x = -3; x < CS + 3; x++) {
      const wx = cx * CS + x, wz = cz * CS + z;
      const h = terrainHeight(wx, wz);
      if (h <= SEA_LEVEL + 1) continue;
      const biome = biomeAt(wx, wz, h);
      if (biome !== BIOME_FOREST && biome !== BIOME_PLAINS) continue;
      const r = hash2(wx * 7 + 13, wz * 13 + 7);
      const chance = biome === BIOME_FOREST ? 0.032 : 0.005;
      if (r > chance) continue;
      const th = 4 + Math.floor(hash2(wx + 999, wz - 999) * 3);
      for (let i = 1; i <= th; i++) setLocal(chunk, wx, h + i, wz, LOG, false);
      const topY = h + th;
      for (let dy = -2; dy <= 1; dy++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dx = -2; dx <= 2; dx++) {
            const d = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
            if (d > 3) continue;
            if (dx === 0 && dz === 0 && dy <= 0) continue;
            setLocal(chunk, wx + dx, topY + dy, wz + dz, LEAVES, true);
          }
    }
  }

    // ---- Структуры (домики) ----
  tryPlaceStructures(chunk, terrainHeight, biomeAt);
  // накладываем сохранённые изменения поверх процедурной генерации
  const ck = cx + ',' + cz;
  const chMap = changesByChunk.get(ck);
  if (chMap) {
    for (const [idx, v] of chMap) chunk.blocks[idx] = v;
  }

  chunk.generated = true;
  chunk.dirty = true;
}

const PW = CS + 2, PH = WORLD_HEIGHT + 2;

export function buildChunkMesh(chunk) {
  const pad = new Uint8Array(PW * PH * PW);
  const nb = new Array(9);
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++)
      nb[(dz + 1) * 3 + (dx + 1)] = world.getChunk(chunk.cx + dx, chunk.cz + dz) || null;

  for (let y = -1; y <= WORLD_HEIGHT; y++)
    for (let z = -1; z <= CS; z++)
      for (let x = -1; x <= CS; x++) {
        let b = AIR;
        if (y >= 0 && y < WORLD_HEIGHT) {
          const ix = x < 0 ? 0 : (x >= CS ? 2 : 1);
          const iz = z < 0 ? 0 : (z >= CS ? 2 : 1);
          const c = nb[iz * 3 + ix];
          if (c) {
            const lx = x < 0 ? CS - 1 : (x >= CS ? 0 : x);
            const lz = z < 0 ? CS - 1 : (z >= CS ? 0 : z);
            b = c.blocks[c.idx(lx, y, lz)];
          }
        }
        pad[(y + 1) * PW * PW + (z + 1) * PW + (x + 1)] = b;
      }

  const pos = [], nor = [], uvs = [], ind = [];
  const wpos = [], wnor = [], wuvs = [], wind = [];
  const gpos = [], gnor = [], guvs = [], gind = [];

  for (let y = 0; y < WORLD_HEIGHT; y++)
    for (let z = 0; z < CS; z++)
      for (let x = 0; x < CS; x++) {
        const b = chunk.blocks[chunk.idx(x, y, z)];
        if (b === AIR) continue;
        const isWater = isWaterBlock(b);
        const isGlass = b === GLASS;
        const def = BLOCK_DEFS[b];
        const P = isWater ? wpos : (isGlass ? gpos : pos);
        const N = isWater ? wnor : (isGlass ? gnor : nor);
        const U = isWater ? wuvs : (isGlass ? guvs : uvs);
        const I = isWater ? wind : (isGlass ? gind : ind);

        // ---- высота воды: 1.0 (источник) ... 0.2 (5-й уровень) ----
        let waterH = 1.0;
        if (isWater) {
          const level = b === WATER ? 0 : (b - FLOWING_WATER_1 + 1);
          waterH = 1.0 - level * 0.16;
          // если сверху тоже вода — тянем боковую грань до потолка,
          // иначе будет видна щель между блоками разных уровней
          const above = pad[(y + 2) * PW * PW + (z + 1) * PW + (x + 1)];
          if (isWaterBlock(above)) waterH = 1.0;
        }

        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const nx = x + F.dir[0], ny = y + F.dir[1], nz = z + F.dir[2];
          const nbl = pad[(ny + 1) * PW * PW + (nz + 1) * PW + (nx + 1)];

          if (nbl !== AIR) {
            const curIsWater = isWaterBlock(b);
            const nbIsWater  = isWaterBlock(nbl);
            const curIsGlass = b === GLASS;
            const nbIsGlass  = nbl === GLASS;
            let render;
            if (curIsWater) {
              render = false;
            } else if (curIsGlass) {
              render = !nbIsGlass;
            } else {
              render = nbIsWater || nbIsGlass;
            }
            if (!render) continue;
          }

          let tile;
          if (f === 2)      tile = def.top;
          else if (f === 3) tile = def.bottom;
          else if (def.front !== undefined && (f === 4 || f === 5)) tile = def.front;
          else              tile = def.side;
          const col = tile % ATLAS_COLS;
          const row = Math.floor(tile / ATLAS_COLS);
          const tu0 = col / ATLAS_COLS, tv0 = row / ATLAS_ROWS;
          const du = 1 / ATLAS_COLS, dv = 1 / ATLAS_ROWS;

          const base = P.length / 3;
          for (let i = 0; i < 4; i++) {
            const c = F.corners[i];
            let cy = c[1];
            // для воды верхняя грань и верхние рёбра боковых граней
            // опускаются на её фактическую высоту
            if (isWater && cy === 1) cy = waterH;
            P.push(x + c[0], y + cy, z + c[2]);
            N.push(F.dir[0], F.dir[1], F.dir[2]);
            const t = F.uvs[i];
            U.push(tu0 + t[0] * du, tv0 + t[1] * dv);
          }
          I.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }

  if (chunk.mesh) { scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); chunk.mesh = null; }
  if (pos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(ind);
    const m = new THREE.Mesh(g, blockMaterial);
    m.position.set(chunk.cx * CS, 0, chunk.cz * CS);
    scene.add(m);
    chunk.mesh = m;
  }
  if (chunk.waterMesh) { scene.remove(chunk.waterMesh); chunk.waterMesh.geometry.dispose(); chunk.waterMesh = null; }
  if (wpos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(wnor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(wuvs, 2));
    g.setIndex(wind);
    const m = new THREE.Mesh(g, waterMaterial);
    m.position.set(chunk.cx * CS, 0, chunk.cz * CS);
    scene.add(m);
    chunk.waterMesh = m;
  }

  if (chunk.glassMesh) { scene.remove(chunk.glassMesh); chunk.glassMesh.geometry.dispose(); chunk.glassMesh = null; }
  if (gpos.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(gnor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(guvs, 2));
    g.setIndex(gind);
    const m = new THREE.Mesh(g, glassMaterial);
    m.position.set(chunk.cx * CS, 0, chunk.cz * CS);
    m.renderOrder = 1;       // поверх прозрачных
    scene.add(m);
    chunk.glassMesh = m;
  }

  chunk.dirty = false;
}

export function disposeChunk(c) {
  if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh = null; }
  if (c.waterMesh) { scene.remove(c.waterMesh); c.waterMesh.geometry.dispose(); c.waterMesh = null; }
  if (c.glassMesh) { scene.remove(c.glassMesh); c.glassMesh.geometry.dispose(); c.glassMesh = null; }
}

export function updateChunks(px, pz) {
  const pcx = Math.floor(px / CS), pcz = Math.floor(pz / CS);
  for (const [k, c] of world.chunks) {
    if (Math.abs(c.cx - pcx) > RD_GEN + 1 || Math.abs(c.cz - pcz) > RD_GEN + 1) {
      disposeChunk(c);
      world.chunks.delete(k);
    }
  }
  const needed = [];
  for (let dz = -RD_GEN; dz <= RD_GEN; dz++)
    for (let dx = -RD_GEN; dx <= RD_GEN; dx++)
      needed.push([pcx + dx, pcz + dz, dx*dx + dz*dz]);
  needed.sort((a, b) => a[2] - b[2]);

  let genBudget = 3, meshBudget = 2;
  for (const [cx, cz] of needed) {
    const k = world.key(cx, cz);
    if (world.chunks.has(k)) continue;
    if (genBudget <= 0) break;
    const c = new Chunk(cx, cz);
    generateChunk(c);
    world.chunks.set(k, c);
    genBudget--;
  }
  for (const [cx, cz] of needed) {
    if (meshBudget <= 0) break;
    const c = world.chunks.get(world.key(cx, cz));
    if (!c || !c.dirty) continue;
    if (!world.getChunk(cx-1, cz) || !world.getChunk(cx+1, cz) ||
        !world.getChunk(cx, cz-1) || !world.getChunk(cx, cz+1)) continue;
    buildChunkMesh(c);
    meshBudget--;
  }
}

export function raycastVoxel(origin, dir, maxDist) {
  let x = Math.floor(origin.x), y = Math.floor(origin.y), z = Math.floor(origin.z);
  const stepX = dir.x > 0 ? 1 : -1;
  const stepY = dir.y > 0 ? 1 : -1;
  const stepZ = dir.z > 0 ? 1 : -1;
  const tdx = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
  const tdy = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
  const tdz = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;
  let tmx = dir.x !== 0 ? ((dir.x > 0 ? x + 1 - origin.x : origin.x - x) * tdx) : Infinity;
  let tmy = dir.y !== 0 ? ((dir.y > 0 ? y + 1 - origin.y : origin.y - y) * tdy) : Infinity;
  let tmz = dir.z !== 0 ? ((dir.z > 0 ? z + 1 - origin.z : origin.z - z) * tdz) : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 200; i++) {
    const b = world.getBlock(x, y, z);
    if (b !== AIR && !isWaterBlock(b)) return { x, y, z, block: b, nx, ny, nz };
    if (tmx < tmy && tmx < tmz) { x += stepX; t = tmx; tmx += tdx; nx = -stepX; ny = 0; nz = 0; }
    else if (tmy < tmz)         { y += stepY; t = tmy; tmy += tdy; nx = 0; ny = -stepY; nz = 0; }
    else                        { z += stepZ; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -stepZ; }
    if (t > maxDist) break;
  }
  return null;
}