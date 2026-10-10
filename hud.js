import * as THREE from 'three';
import { itemName, isTool, getTool } from './items.js';
import { getIcon } from './icons.js';
import {
  HOTBAR_SIZE, INVENTORY_SIZE, STACK_MAX,
  slots, heldItem, getMode, GameMode, invAdd
} from './gamemode.js';
import { updateHandItem } from './viewmodel.js';
import { renderer, camera } from './scene.js';
import { world, terrainHeight, biomeAt } from './world.js';
import { isBlock } from './blocks.js';
import { player } from './player.js';
import { mobs } from './mobs.js';
import { BIOME_OCEAN, BIOME_FOREST } from './constants.js';
import { findRecipe, SMELTING, FUEL_VALUE } from './recipes.js';
import { spawnDrop } from './drops.js';
import { getChestSlots } from './chests.js';

export let activeSlot = 0;
export const getActiveSlot = () => activeSlot;

let uiContext = null;
export const getUiContext = () => uiContext;
export const isInventoryOpen = () => uiContext !== null;

let craftSize = 2;
const craftGrid = new Array(9).fill(null);
let craftResult = null;

const furnace = { input: null, fuel: null, output: null, progress: 0, burnLeft: 0 };
let currentChest = null;   // { x, y, z, slots }

/* ============================================================
   ТУЛТИП
   ============================================================ */
const tooltipEl = document.getElementById('tooltip');
function showTooltip(text, x, y) {
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  const w = tooltipEl.offsetWidth;
  const vw = innerWidth;
  let px = x + 14;
  if (px + w > vw - 8) px = x - w - 14;
  tooltipEl.style.left = px + 'px';
  tooltipEl.style.top = (y + 16) + 'px';
}
function hideTooltip() { tooltipEl.style.display = 'none'; }

/* ============================================================
   ХОТБАР
   ============================================================ */
const hotbarEl = document.getElementById('hotbar');
const hotbarEls = [];
for (let i = 0; i < HOTBAR_SIZE; i++) {
  const d = document.createElement('div');
  d.className = 'slot' + (i === 0 ? ' active' : '');
  d.innerHTML = `<div class="num">${i + 1}</div><div class="sw"></div><div class="count"></div>`;
  d.addEventListener('click', () => selectSlot(i));
  hotbarEl.appendChild(d);
  hotbarEls.push(d);
}

export function selectSlot(i) {
  activeSlot = i;
  hotbarEls.forEach((el, k) => el.classList.toggle('active', k === i));
  const s = slots[i];
  updateHandItem(s ? s.id : 0);
}
function isBlockId(id) { return isBlock(id); }

function paintSw(sw, id) {
  if (!id) { sw.style.display = 'none'; sw.style.backgroundImage = ''; return; }
  const url = getIcon(id);
  sw.style.display = 'block';
  sw.style.backgroundImage = url ? `url(${url})` : '';
}

function paintSlot(el, s, showCountAlways) {
  const sw = el.querySelector('.sw');
  const cnt = el.querySelector('.count');
  if (s) {
    paintSw(sw, s.id);
    const survival = getMode() === GameMode.SURVIVAL;
    cnt.textContent = (survival || showCountAlways) ? String(s.count) : '';
  } else {
    paintSw(sw, 0);
    cnt.textContent = '';
  }
}

export function refreshHotbar() {
  for (let i = 0; i < HOTBAR_SIZE; i++) paintSlot(hotbarEls[i], slots[i], false);
  const s = slots[activeSlot];
  updateHandItem(s ? s.id : 0);
  if (uiContext) renderUI();
}

/* ============================================================
   ОКНО ИНВЕНТАРЯ
   ============================================================ */
const invOverlay = document.getElementById('invOverlay');
const invTitle = document.getElementById('invTitle');
const invTop = document.getElementById('invTop');
const invMainEl = document.getElementById('invMain');
const invHotbarEl = document.getElementById('invHotbar');
const heldEl = document.getElementById('heldItem');
const heldSw = heldEl.querySelector('.sw');
const heldCount = heldEl.querySelector('.count');

const invSlotEls = new Array(INVENTORY_SIZE);

function makeSlotEl(parent, kind, index) {
  const d = document.createElement('div');
  d.className = 'invSlot';
  d.innerHTML = `<div class="sw"></div><div class="count"></div>`;
  d._getItem = () => {
    if (kind === 'craft')       return craftGrid[index];
    if (kind === 'output')      return craftResult ? { id: craftResult.output.id, count: craftResult.output.count } : null;
    if (kind === 'furnaceIn')   return furnace.input;
    if (kind === 'furnaceFuel') return furnace.fuel;
    if (kind === 'furnaceOut')  return furnace.output;
    if (kind === 'chest')       return currentChest ? currentChest.slots[index] : null;
    return slots[index];
  };
  d.addEventListener('mousedown', (e) => {
    e.preventDefault(); e.stopPropagation();
    onSlotClick(kind, index, e.button);
  });
  d.addEventListener('contextmenu', (e) => e.preventDefault());
  parent.appendChild(d);
  return d;
}

for (let i = HOTBAR_SIZE; i < INVENTORY_SIZE; i++) invSlotEls[i] = makeSlotEl(invMainEl, 'inv', i);
for (let i = 0; i < HOTBAR_SIZE; i++) invSlotEls[i] = makeSlotEl(invHotbarEl, 'inv', i);

let topSlotEls = [];
let topKinds = [];

function buildTop(context) {
  invTop.innerHTML = '';
  topSlotEls = [];
  topKinds = [];

  if (context === 'inventory' || context === 'crafting') {
    craftSize = context === 'inventory' ? 2 : 3;
    invTitle.textContent = context === 'inventory' ? 'Инвентарь' : 'Верстак';
    const wrap = document.createElement('div');
    wrap.className = 'craftWrap';
    const grid = document.createElement('div');
    grid.className = 'craftGrid ' + (craftSize === 2 ? 'size2' : 'size3');
    for (let i = 0; i < craftSize * craftSize; i++) {
      const el = makeSlotEl(grid, 'craft', i);
      topSlotEls.push(el); topKinds.push('craft');
    }
    const arrow = document.createElement('div');
    arrow.className = 'craftArrow'; arrow.textContent = '→';
    const outWrap = document.createElement('div');
    outWrap.className = 'craftOut';
    const outEl = makeSlotEl(outWrap, 'output', 0);
    topSlotEls.push(outEl); topKinds.push('output');
    wrap.appendChild(grid); wrap.appendChild(arrow); wrap.appendChild(outWrap);
    invTop.appendChild(wrap);
  } else if (context === 'furnace') {
    invTitle.textContent = 'Печь';
    const wrap = document.createElement('div');
    wrap.className = 'furnaceWrap';
    const inEl = makeSlotEl(wrap, 'furnaceIn', 0);
    topSlotEls.push(inEl); topKinds.push('furnaceIn');
    const bar = document.createElement('div');
    bar.className = 'furnaceBar';
    bar.innerHTML = '<div class="furnaceFill"></div>';
    wrap.appendChild(bar);
    const outEl = makeSlotEl(wrap, 'furnaceOut', 0);
    topSlotEls.push(outEl); topKinds.push('furnaceOut');
    const fuelEl = makeSlotEl(wrap, 'furnaceFuel', 0);
    topSlotEls.push(fuelEl); topKinds.push('furnaceFuel');
    invTop.appendChild(wrap);
  } else if (context === 'chest') {
    invTitle.textContent = 'Сундук';
    const grid = document.createElement('div');
    grid.className = 'chestGrid';
    for (let i = 0; i < 27; i++) {
      const el = makeSlotEl(grid, 'chest', i);
      topSlotEls.push(el); topKinds.push('chest');
    }
    invTop.appendChild(grid);
  }
}

function recomputeCraft() {
  craftResult = findRecipe(craftGrid, craftSize);
  return craftResult;
}

function paintInvSlot(el, s, alwaysCount) {
  const sw = el.querySelector('.sw');
  const cnt = el.querySelector('.count');
  if (s) {
    paintSw(sw, s.id);
    const survival = getMode() === GameMode.SURVIVAL;
    cnt.textContent = (survival || alwaysCount) ? String(s.count) : '';
  } else {
    paintSw(sw, 0);
    cnt.textContent = '';
  }
}

function paintTop() {
  for (let i = 0; i < topSlotEls.length; i++) {
    const kind = topKinds[i];
    const el = topSlotEls[i];
    let s = null;
    if (kind === 'craft') s = craftGrid[i];
    else if (kind === 'output') {
      recomputeCraft();
      s = craftResult ? { id: craftResult.output.id, count: craftResult.output.count } : null;
    }
    else if (kind === 'furnaceIn')   s = furnace.input;
    else if (kind === 'furnaceFuel') s = furnace.fuel;
    else if (kind === 'furnaceOut')  s = furnace.output;
    else if (kind === 'chest')       s = currentChest ? currentChest.slots[i] : null;
    paintInvSlot(el, s, true);
  }
}

function renderUI() {
  paintTop();
  for (let i = 0; i < INVENTORY_SIZE; i++) paintInvSlot(invSlotEls[i], slots[i], false);
  updateHeldUI();
}

function updateHeldUI() {
  const held = heldItem.value;
  if (!held) { heldEl.style.display = 'none'; return; }
  heldEl.style.display = 'block';
  const url = getIcon(held.id);
  heldSw.style.backgroundImage = url ? `url(${url})` : '';
  heldCount.textContent = getMode() === GameMode.SURVIVAL ? String(held.count) : '';
}

/* ---- наведение на слот → название ---- */
document.addEventListener('mousemove', (e) => {
  if (!isInventoryOpen()) { hideTooltip(); return; }
  heldEl.style.left = e.clientX + 'px';
  heldEl.style.top = e.clientY + 'px';
  const el = e.target.closest('.invSlot');
  if (!el || !el._getItem) { hideTooltip(); return; }
  const s = el._getItem();
  if (!s) { hideTooltip(); return; }
  showTooltip(itemName(s.id), e.clientX, e.clientY);
});

/* ---- клик вне панели → выбросить «взятую» вещь ---- */
invOverlay.addEventListener('mousedown', (e) => {
  if (e.target.closest('#invPanel')) return;
  if (!heldItem.value) return;
  const h = heldItem.value;
  heldItem.value = null;
  updateHeldUI();
  dropInFront(h.id, h.count, h.durability);
});

/* ---- клики по слотам ---- */
function onSlotClick(kind, index, button) {
  if (kind === 'output') { handleOutputClick(button); return; }

  let ref;
  if (kind === 'craft')             ref = { arr: craftGrid, i: index };
  else if (kind === 'furnaceIn')    ref = { obj: furnace, key: 'input' };
  else if (kind === 'furnaceFuel')  ref = { obj: furnace, key: 'fuel' };
  else if (kind === 'furnaceOut')   ref = { obj: furnace, key: 'output' };
  else if (kind === 'chest') {
    if (!currentChest) return;
    ref = { arr: currentChest.slots, i: index };
  }
  else                              ref = { arr: slots, i: index };

  const get = () => ref.arr ? ref.arr[ref.i] : ref.obj[ref.key];
  const set = (v) => { if (ref.arr) ref.arr[ref.i] = v; else ref.obj[ref.key] = v; };

  const s = get();
  const held = heldItem.value;

  if (button === 2) {
    if (held) {
      if (!s) { set({ id: held.id, count: 1, durability: held.durability }); held.count--; }
      else if (s.id === held.id && s.count < STACK_MAX && s.durability === undefined && held.durability === undefined) {
        s.count++; held.count--;
      } else return;
      if (held.count <= 0) heldItem.value = null;
    } else {
      if (!s) return;
      const take = Math.ceil(s.count / 2);
      heldItem.value = { id: s.id, count: take, durability: s.durability };
      s.count -= take;
      if (s.count <= 0) set(null);
    }
  } else {
    if (held) {
      if (!s) { set(held); heldItem.value = null; }
      else if (s.id === held.id && s.count < STACK_MAX && s.durability === undefined && held.durability === undefined) {
        const add = Math.min(held.count, STACK_MAX - s.count);
        s.count += add; held.count -= add;
        if (held.count <= 0) heldItem.value = null;
      } else { set(held); heldItem.value = s; }
    } else {
      if (!s) return;
      heldItem.value = s; set(null);
    }
  }
  renderUI();
  refreshHotbarUIOnly();
}

function refreshHotbarUIOnly() {
  for (let i = 0; i < HOTBAR_SIZE; i++) paintSlot(hotbarEls[i], slots[i], false);
  const s = slots[activeSlot];
  updateHandItem(s ? s.id : 0);
}

function handleOutputClick(button) {
  if (!craftResult) return;
  const out = craftResult.output;
  const s = heldItem.value;
  if (s && (s.id !== out.id || s.count + out.count > STACK_MAX)) return;

  for (let y = 0; y < craftSize; y++)
    for (let x = 0; x < craftSize; x++) {
      const i = y * craftSize + x;
      if (craftGrid[i]) {
        craftGrid[i].count--;
        if (craftGrid[i].count <= 0) craftGrid[i] = null;
      }
    }

  if (s) s.count += out.count;
  else heldItem.value = { id: out.id, count: out.count };

  recomputeCraft();
  renderUI();
  refreshHotbarUIOnly();
}

/* ============================================================
   ДРОП В МИР (используется и при клике вне панели)
   ============================================================ */
export function dropInFront(id, count, durability) {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const ox = player.pos.x + dir.x * 0.6;
  const oy = player.pos.y + 1.4 + dir.y * 0.3;
  const oz = player.pos.z + dir.z * 0.6;
  spawnDrop(id, count, ox, oy, oz, durability);
}

/* ============================================================
   ОТКРЫТИЕ / ЗАКРЫТИЕ
   ============================================================ */
export function openUI(context, opts = {}) {
  if (uiContext || player.dead) return;

  if (context === 'chest') {
    if (opts.x === undefined) return;
    currentChest = {
      x: opts.x, y: opts.y, z: opts.z,
      slots: getChestSlots(opts.x, opts.y, opts.z)
    };
  } else {
    currentChest = null;
  }

  uiContext = context;
  document.exitPointerLock();
  invOverlay.style.display = 'flex';
  const ov = document.getElementById('overlay');
  if (ov) ov.style.display = 'none';
  buildTop(context);
  renderUI();
}

export function closeUI(opts = {}) {
  if (!uiContext) return;
  for (let i = 0; i < 9; i++) {
    if (craftGrid[i]) {
      invAdd(craftGrid[i].id, craftGrid[i].count,
        { noStack: craftGrid[i].durability !== undefined, durability: craftGrid[i].durability });
      craftGrid[i] = null;
    }
  }
  if (heldItem.value) {
    invAdd(heldItem.value.id, heldItem.value.count,
      { noStack: heldItem.value.durability !== undefined, durability: heldItem.value.durability });
    heldItem.value = null;
  }

  hideTooltip();
  uiContext = null;
  currentChest = null;
  invOverlay.style.display = 'none';
  refreshHotbar();

  if (!player.dead && !opts.skipLock) {
    try {
      const p = renderer.domElement.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
  }
}

/* ============================================================
   ПЕЧЬ
   ============================================================ */
export function tickFurnace(dt) {
  const recipe = furnace.input ? SMELTING[furnace.input.id] : null;
  const canOutput = recipe && (!furnace.output ||
    (furnace.output.id === recipe.id && furnace.output.count < STACK_MAX));

  if (furnace.burnLeft <= 0) {
    if (furnace.fuel && FUEL_VALUE[furnace.fuel.id] && recipe) {
      furnace.burnLeft = FUEL_VALUE[furnace.fuel.id];
      furnace.fuel.count--;
      if (furnace.fuel.count <= 0) furnace.fuel = null;
    }
  } else {
    furnace.burnLeft -= dt;
    if (furnace.burnLeft < 0) furnace.burnLeft = 0;
  }

  if (recipe && canOutput && furnace.burnLeft > 0) {
    furnace.progress += dt / recipe.time;
    if (furnace.progress >= 1) {
      furnace.progress = 0;
      if (!furnace.output) furnace.output = { id: recipe.id, count: 1 };
      else furnace.output.count++;
      furnace.input.count--;
      if (furnace.input.count <= 0) furnace.input = null;
    }
  } else {
    furnace.progress = Math.max(0, furnace.progress - dt * 0.3);
  }

  /* обновляем UI только если печь открыта */
  if (uiContext === 'furnace') {
    const fill = invTop.querySelector('.furnaceFill');
    if (fill) fill.style.width = (furnace.progress * 100) + '%';
    renderUI();
  }
}

/* ============================================================
   СОХРАНЕНИЕ ПЕЧИ
   ============================================================ */
export function getFurnaceSnapshot() {
  return {
    input:    furnace.input  ? { ...furnace.input  } : null,
    fuel:     furnace.fuel   ? { ...furnace.fuel   } : null,
    output:   furnace.output ? { ...furnace.output } : null,
    progress: furnace.progress,
    burnLeft: furnace.burnLeft
  };
}

export function loadFurnaceSnapshot(snap) {
  furnace.input    = snap && snap.input  ? { ...snap.input  } : null;
  furnace.fuel     = snap && snap.fuel   ? { ...snap.fuel   } : null;
  furnace.output   = snap && snap.output ? { ...snap.output } : null;
  furnace.progress = (snap && snap.progress) || 0;
  furnace.burnLeft = (snap && snap.burnLeft) || 0;
  // если открыто окно печи — перерисовать
  if (uiContext === 'furnace') renderUI();
}

/* ============================================================
   HUD / ИНФО
   ============================================================ */
const infoEl = document.getElementById('info');
let fpsAcc = 0, fpsFrames = 0, fpsShown = 0;

function biomeName(x, z) {
  const h = terrainHeight(Math.floor(x), Math.floor(z));
  const b = biomeAt(Math.floor(x), Math.floor(z), h);
  if (b === BIOME_OCEAN) return 'Океан';
  if (b === BIOME_FOREST) return 'Лес';
  return 'Равнина';
}

const BLOCK_NAMES = ['—','Трава','Земля','Камень','Песок','Вода','Бревно','Листва',
  'Угольная руда','Железная руда','Медная руда','Золотая руда','Алмазная руда',
  'Бедрок','Доски','Верстак','Печь'];

export function updateInfo(dt) {
  fpsAcc += dt; fpsFrames++;
  if (fpsAcc > 0.5) {
    fpsShown = Math.round(fpsFrames / fpsAcc);
    fpsAcc = 0; fpsFrames = 0;
  }
  const b = world.getBlock(Math.floor(player.pos.x), Math.floor(player.pos.y - 0.2), Math.floor(player.pos.z));
  const blockName = BLOCK_NAMES[b] || '—';
  infoEl.innerHTML =
    `FPS: <b>${fpsShown}</b><br>` +
    `XYZ: <b>${player.pos.x.toFixed(1)} / ${player.pos.y.toFixed(1)} / ${player.pos.z.toFixed(1)}</b><br>` +
    `Биом: <b>${biomeName(player.pos.x, player.pos.z)}</b><br>` +
    `Под ногами: <b>${blockName}</b><br>` +
    `Мобы: <b>${mobs.length}</b> · Чанков: <b>${world.chunks.size}</b><br>` +
    `Состояние: <b>${player.flying ? 'полёт' : (player.inWater ? 'плавание' : (player.sprinting ? 'бег' : (player.crouching ? 'присед' : 'ходьба')))}</b>`;

  renderHeartsIfChanged();
}

/* ============================================================
   СЕРДЕЧКИ
   ============================================================ */
const heartsEl = document.getElementById('hearts');
let lastHpShown = -1;

function makeHeartSVG(fill) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('class', 'heart');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');

  const path = 'M10 17.5 C4 12 1.5 8.5 1.5 6 C1.5 3 4 1.5 6.5 1.5 C8.5 1.5 10 3.5 10 3.5 C10 3.5 11.5 1.5 13.5 1.5 C16 1.5 18.5 3 18.5 6 C18.5 8.5 16 12 10 17.5 Z';

  const bg = document.createElementNS(NS, 'path');
  bg.setAttribute('d', path);
  bg.setAttribute('fill', '#3a1010');
  svg.appendChild(bg);

  if (fill > 0) {
    const fp = document.createElementNS(NS, 'path');
    fp.setAttribute('d', path);
    fp.setAttribute('fill', '#ff2a2a');
    if (fill < 1) {
      const clipId = 'hclip' + Math.random().toString(36).slice(2, 9);
      const clip = document.createElementNS(NS, 'clipPath');
      clip.setAttribute('id', clipId);
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', String(20 * fill));
      rect.setAttribute('height', '20');
      clip.appendChild(rect);
      svg.appendChild(clip);
      fp.setAttribute('clip-path', `url(#${clipId})`);
    }
    svg.appendChild(fp);
  }

  const outline = document.createElementNS(NS, 'path');
  outline.setAttribute('d', path);
  outline.setAttribute('fill', 'none');
  outline.setAttribute('stroke', '#000');
  outline.setAttribute('stroke-width', '1.1');
  svg.appendChild(outline);

  return svg;
}

function renderHeartsIfChanged() {
  if (!heartsEl) return;
  const creative = getMode() === GameMode.CREATIVE;
  heartsEl.classList.toggle('hidden', creative);
  if (creative) return;

  const hp = Math.max(0, Math.min(player.maxHp, player.hp));
  if (hp === lastHpShown) return;
  lastHpShown = hp;

  const full = Math.floor(hp / 2);
  const half = (hp % 2) === 1;
  const empty = 10 - full - (half ? 1 : 0);

  heartsEl.innerHTML = '';
  for (let i = 0; i < full; i++)  heartsEl.appendChild(makeHeartSVG(1));
  if (half)                        heartsEl.appendChild(makeHeartSVG(0.5));
  for (let i = 0; i < empty; i++) heartsEl.appendChild(makeHeartSVG(0));
}

export function forceRenderHearts() {
  lastHpShown = -1;
  renderHeartsIfChanged();
}