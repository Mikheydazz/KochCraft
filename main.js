import * as THREE from 'three';
import {
  AIR, WATER, BEDROCK, CS, SEA_LEVEL, BLOCK_HARDNESS, BLOCK_TOOL_REQ,
  CRAFTING_TABLE, FURNACE, BEEF, PORK,
  GRASS, DIRT, CLAY, CHEST,
  CAULDRON, CAULDRON_WATER, SAWDUST, CELLULOSE,
  BIOME_PLAINS, BIOME_FOREST,
  getById, getByKey, findBiomeByAlias, getBiomeName
} from './constants.js';
import { input } from './input.js';
import { scene, camera, renderer, highlight } from './scene.js';
import {
  Chunk, world, generateChunk, updateChunks, raycastVoxel, terrainHeight,
  disposeChunk, applyChanges, clearAllChanges, getAllChanges, biomeAt, findNearestBiome
} from './world.js';
import { tryPlaceStructures, setSchoolData, findNearestStructure } from './structures.js';
import { initPerlin } from './noise.js';
import {
  updateDrops, spawnDrop, dropAllInventory, clearDrops
} from './drops.js';
import { player, updatePlayer } from './player.js';
import { mobs, updateMobs, surfaceY } from './mobs.js';
import {
  updateViewModel, triggerSwing, viewScene, viewCamera
} from './viewmodel.js';
import {
  isBlock, isWaterBlock,
  isStairsBlock, stairsMaterial, baseStairsId
} from './blocks.js';
import { isTool, getTool, CREATIVE_ITEMS } from './items.js';
import {
  selectSlot, getActiveSlot, updateInfo, refreshHotbar,
  openUI, closeUI, isInventoryOpen, getUiContext, tickFurnace,
  forceRenderHearts, dropInFront,
  getFurnaceSnapshot, loadFurnaceSnapshot
} from './hud.js';
import {
  GameMode, getMode, setMode, HOTBAR_SIZE, STACK_MAX,
  slots, invClear, invAdd, invRemoveFromSlot,
  loadInventory, getInventorySnapshot
} from './gamemode.js';
import { initIcons } from './icons.js';
import {
  initChat, openChat, closeChat, isChatOpen, addChatMessage
} from './chat.js';
import { atlasCanvas } from './scene.js';
import {
  isEditing, toggleEditing, clearSelection, markCorner,
  isSelectionComplete,
  downloadStructureFile, placeStructureAtPlayer
} from './structure_editor.js';
import {
  getChestSlots, deleteChest, getAllChests, loadChests
} from './chests.js';
import { loadDesks, getAllDesks } from './desks.js';
import { isBookUIOpen, closeBook } from './book_ui.js';
import { handleDeskClick, handleBookRead, onDeskBroken } from './desk_handler.js';
import {
  getVatContents, setVatContents, deleteVat, getAllVats, loadVats
} from './cauldrons.js';
import {
  setWaterWorld, enqueueAround, tickWater, clearWaterQueue
} from './water.js';
import { worldEvents } from './world.js';
import {
  listWorlds, createWorld, deleteWorld, loadWorld, saveWorld
} from './worlds.js';

let mouseLeft = false;
let mouseRight = false;
let currentWorldId = null;
let deathHandled = false;

const BUCKET_ID       = getByKey('bucket').id;
const WATER_BUCKET_ID = getByKey('water_bucket').id;
const CAULDRON_ID       = getByKey('cauldron').id;
const CAULDRON_WATER_ID = getByKey('cauldron_water').id;
const SAWDUST_ID        = getByKey('sawdust').id;
const CELLULOSE_ID      = getByKey('cellulose').id;

/* ============================================================
   ЭЛЕМЕНТЫ UI
   ============================================================ */
const menuOverlay  = document.getElementById('menuOverlay');
const menuMain     = document.getElementById('menuMain');
const menuWorlds   = document.getElementById('menuWorlds');
const menuCreate   = document.getElementById('menuCreate');
const pauseOverlay = document.getElementById('pauseOverlay');
const deathOverlay = document.getElementById('deathOverlay');
const respawnBtn   = document.getElementById('respawnBtn');
const modeBadge    = document.getElementById('modeBadge');
const worldsListEl = document.getElementById('worldsList');
const overlay      = { style: {} };  // заглушка, больше не используется

/* ============================================================
   РЕЖИМ ИГРЫ
   ============================================================ */
function updateModeUI() {
  const isCreative = getMode() === GameMode.CREATIVE;
  modeBadge.textContent = 'Игра: ' + (isCreative ? 'Творческий' : 'Выживание');
  modeBadge.classList.toggle('survival', !isCreative);
}

function giveCreativeInventory() {
  invClear();
  CREATIVE_ITEMS.forEach((id, i) => {
    if (i >= 36) return;
    if (isTool(id)) {
      const t = getTool(id);
      slots[i] = { id, count: 1, durability: t.durability };
    } else if (id === BUCKET_ID || id === WATER_BUCKET_ID) {
      slots[i] = { id, count: 1 };
    } else {
      slots[i] = { id, count: 64 };
    }
  });
}

function resetInventoryForMode() {
  invClear();
  if (getMode() === GameMode.CREATIVE) giveCreativeInventory();
}

function toggleMode() {
  const newMode = getMode() === GameMode.CREATIVE ? GameMode.SURVIVAL : GameMode.CREATIVE;
  setMode(newMode);
  resetBreaking();
  if (newMode === GameMode.CREATIVE) {
    giveCreativeInventory();
  } else {
    invClear();
    player.flying = false;
    player.hp = player.maxHp;
  }
  updateModeUI();
  refreshHotbar();
  forceRenderHearts();
}

/* ============================================================
   МЕНЮ
   ============================================================ */
function showMenuScreen(which) {
  menuMain.classList.toggle('hidden', which !== 'main');
  menuWorlds.classList.toggle('hidden', which !== 'worlds');
  menuCreate.classList.toggle('hidden', which !== 'create');
}

function showMainMenu() {
  document.body.classList.add('in-menu');
  menuOverlay.classList.remove('hidden');
  pauseOverlay.classList.add('hidden');
  deathOverlay.style.display = 'none';
  showMenuScreen('main');
  if (document.pointerLockElement) document.exitPointerLock();
}

function hideMenus() {
  document.body.classList.remove('in-menu');
  menuOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
}

function showPause() {
  if (!currentWorldId || player.dead || isInventoryOpen()) return;
  document.body.classList.add('in-menu');
  pauseOverlay.classList.remove('hidden');
}

function hidePause() {
  pauseOverlay.classList.add('hidden');
  document.body.classList.remove('in-menu');
}

function parseSeed(str) {
  str = (str || '').trim();
  if (!str) return (Math.random() * 0xFFFFFFFF) >>> 0;
  if (/^\d+$/.test(str)) return (parseInt(str, 10)) >>> 0;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function renderWorldsList() {
  const list = listWorlds().slice().sort((a, b) => b.updatedAt - a.updatedAt);
  worldsListEl.innerHTML = '';
  if (list.length === 0) {
    const p = document.createElement('p');
    p.style.cssText = 'opacity:.6; padding:16px; text-align:center;';
    p.textContent = 'У вас пока нет миров.';
    worldsListEl.appendChild(p);
    return;
  }
  for (const w of list) {
    const item = document.createElement('div');
    item.className = 'worldItem';
    const dt = new Date(w.updatedAt);
    const sub = `${w.mode === 'creative' ? 'Творческий' : 'Выживание'} · сид ${w.seed} · ${dt.toLocaleString()}`;
    item.innerHTML = `
      <div class="info">
        <div class="name"></div>
        <div class="sub"></div>
      </div>
      <button class="play">Играть</button>
      <button class="danger del">Удалить</button>
    `;
    item.querySelector('.name').textContent = w.name;
    item.querySelector('.sub').textContent = sub;
    item.querySelector('.play').addEventListener('click', () => startWorld(w));
    item.querySelector('.del').addEventListener('click', () => {
      if (confirm('Удалить мир «' + w.name + '»? Это действие необратимо.')) {
        deleteWorld(w.id);
        renderWorldsList();
      }
    });
    worldsListEl.appendChild(item);
  }
}

document.getElementById('btnWorlds').addEventListener('click', () => {
  renderWorldsList();
  showMenuScreen('worlds');
});
document.getElementById('btnBack').addEventListener('click', () => showMenuScreen('main'));
document.getElementById('btnCreate').addEventListener('click', () => {
  const d = new Date();
  document.getElementById('newName').value = 'Мир ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0, 5);
  document.getElementById('newMode').value = 'creative';
  document.getElementById('newSeed').value = '';
  showMenuScreen('create');
});
document.getElementById('btnCreateCancel').addEventListener('click', () => showMenuScreen('worlds'));
document.getElementById('btnCreateOk').addEventListener('click', () => {
  const name = document.getElementById('newName').value.trim() || 'Без названия';
  const mode = document.getElementById('newMode').value;
  const seedStr = document.getElementById('newSeed').value;
  const seed = parseSeed(seedStr);
  const meta = createWorld(name, mode, seed);
  startWorld(meta);
});
document.getElementById('btnContinue').addEventListener('click', () => tryAcquirePointer());
document.getElementById('btnFullscreen').addEventListener('click', () => {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
});

/* ============================================================
   ЧАТ И КОМАНДЫ
   ============================================================ */
function getBearing(x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0;
  const deg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  const dirs = ['север','сев-вост','восток','юг-вост','юг','юг-зап','запад','сев-зап'];
  return dirs[Math.round(deg / 45) % 8];
}

function handleChatCommand(cmd) {
  const parts = cmd.trim().split(/\s+/).filter(Boolean);
  const name = (parts[0] || '').toLowerCase();

  if (name === 'help' || name === 'помощь' || name === '?') {
    addChatMessage('/find structure [school|house] — ближайшая структура', 'info');
    addChatMessage('/find biome [plains|forest|ocean|desert|mountains] — ближайший биом', 'info');
    return;
  }

  if (name === 'find') {
    const what   = (parts[1] || '').toLowerCase();
    const target = (parts[2] || '').toLowerCase();
    if (!what || !target) {
      addChatMessage('Использование: /find [structure|biome] [название]', 'err');
      return;
    }
    if (what === 'structure' || what === 'структура' || what === 'структуры') {
      findStructureCmd(target);
    } else if (what === 'biome' || what === 'биом' || what === 'биомы') {
      findBiomeCmd(target);
    } else {
      addChatMessage('Неизвестный тип: ' + what, 'err');
    }
    return;
  }

  addChatMessage('Неизвестная команда: /' + name + ' (попробуй /help)', 'err');
}

function findStructureCmd(target) {
  let type = null, ru = '';
  if (target === 'school' || target === 'школа') { type = 'school'; ru = 'Школа'; }
  else if (target === 'house' || target === 'дом' || target === 'домик') { type = 'house'; ru = 'Домик'; }
  else {
    addChatMessage('Неизвестная структура: ' + target + ' (school, house)', 'err');
    return;
  }
  addChatMessage('Ищу: ' + ru + '...', 'info');
  setTimeout(() => {
    const res = findNearestStructure(
      player.pos.x, player.pos.z, type, 120, terrainHeight, biomeAt
    );
    if (!res) {
      addChatMessage('Не найдено в радиусе ~1900 блоков', 'err');
      return;
    }
    const dist = Math.hypot(res.x - player.pos.x, res.z - player.pos.z);
    const brg  = getBearing(player.pos.x, player.pos.z, res.x, res.z);
    addChatMessage(
      `${ru}: X=${res.x} Z=${res.z} (${dist.toFixed(0)} блоков, ${brg})`, 'cmd'
    );
  }, 20);
}

function findBiomeCmd(target) {
  const biome = findBiomeByAlias(target);
  if (!biome) {
    addChatMessage('Неизвестный биом: ' + target, 'err');
    return;
  }
  const id = biome.id;
  const ru = getBiomeName(id);
  addChatMessage('Ищу: ' + ru + '...', 'info');
  setTimeout(() => {
    const res = findNearestBiome(player.pos.x, player.pos.z, id, 2000);
    if (!res) {
      addChatMessage('Не найдено в радиусе 2000 блоков', 'err');
      return;
    }
    const dist = Math.hypot(res.x - player.pos.x, res.z - player.pos.z);
    const brg  = getBearing(player.pos.x, player.pos.z, res.x, res.z);
    addChatMessage(
      `${ru}: X=${res.x} Z=${res.z} (${dist.toFixed(0)} блоков, ${brg})`, 'cmd'
    );
  }, 20);
}

initChat({
  onClose: () => {
    setTimeout(() => {
      if (currentWorldId && !player.dead && !isInventoryOpen()) {
        tryAcquirePointer();
      }
    }, 60);
  },
  onCommand: handleChatCommand
});

/* ---- Кнопки редактора структур ---- */
document.getElementById('structSave').addEventListener('click', () => {
  const name = (document.getElementById('structName').value || 'structure').trim();
  if (downloadStructureFile(name)) {
    // Небольшая пауза, потом очищаем выделение
    setTimeout(() => clearSelection(), 300);
  }
});

document.getElementById('structClear').addEventListener('click', () => clearSelection());

document.getElementById('structLoad').addEventListener('click', () => {
  document.getElementById('structFile').click();
});

document.getElementById('structFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      // Ставим структуру перед игроком
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const px = player.pos.x + dir.x * 3;
      const py = player.pos.y;
      const pz = player.pos.z + dir.z * 3;
      placeStructureAtPlayer(data, px, py, pz);
      alert('Структура «' + (data.name || 'без имени') + '» вставлена в мир.');
    } catch (err) {
      alert('Ошибка чтения файла: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
document.getElementById('btnPauseMode').addEventListener('click', () => { toggleMode(); });
document.getElementById('btnSaveQuit').addEventListener('click', () => {
  saveCurrentWorld();
  currentWorldId = null;
  hidePause();
  showMainMenu();
});

/* ============================================================
   ЗАГРУЗКА МИРА
   ============================================================ */
function startWorld(meta) {
  currentWorldId = meta.id;
  deathHandled = false;

  const data = loadWorld(meta.id);
  const state = data && data.state;

  const mode = (state && state.mode) ? state.mode : meta.mode;
  setMode(mode === 'survival' ? GameMode.SURVIVAL : GameMode.CREATIVE);
  updateModeUI();

  initPerlin(meta.seed);

  for (const [, c] of world.chunks) disposeChunk(c);
  world.chunks.clear();
  clearWaterQueue();

  if (state) {
    applyChanges(state.blockChanges || []);
    const p = state.player || {};
    player.pos.set(p.x ?? 0, p.y ?? 60, p.z ?? 0);
    player.yaw = p.yaw ?? 0;
    player.pitch = p.pitch ?? 0;
    player.hp = p.hp ?? player.maxHp;
    player.flying = !!p.flying;
    player.vel.set(0, 0, 0);
    player.onGround = false;
    player.inAirMaxY = null;
    player.hurtCooldown = 0;
    player.dead = false;
    if (p.spawnX !== undefined) player.spawnPos.set(p.spawnX, p.spawnY, p.spawnZ);
    else player.spawnPos.copy(player.pos);
    if (state.inventory) loadInventory(state.inventory);
    else resetInventoryForMode();
    loadFurnaceSnapshot(state.furnace || null);
    loadChests(state.chests || []);
    loadVats(state.cauldrons || []);
    loadDesks(state.desks || []);
  } else {
    clearAllChanges();
    clearDrops();
    let sx = 8, sz = 8;
    for (let r = 0; r < 800; r += 4) {
      const h = terrainHeight(r, 0);
      const b = biomeAt(r, 0, h);
      if (h > SEA_LEVEL + 2 && (b === BIOME_PLAINS || b === BIOME_FOREST)) {
        sx = r; sz = 0; break;
      }
    }
    player.pos.set(sx + 0.5, terrainHeight(sx, sz) + 4, sz + 0.5);
    player.yaw = 0;
    player.pitch = 0;
    player.hp = player.maxHp;
    player.flying = false;
    player.vel.set(0, 0, 0);
    player.onGround = false;
    player.inAirMaxY = null;
    player.dead = false;
    player.spawnPos.copy(player.pos);
    resetInventoryForMode();
    loadFurnaceSnapshot(null);
    loadChests([]);
    loadVats([]);
    loadDesks([]);
  }

  const scx = Math.floor(player.pos.x / CS), scz = Math.floor(player.pos.z / CS);
  for (let dz = -2; dz <= 2; dz++)
    for (let dx = -2; dx <= 2; dx++) {
      const c = new Chunk(scx + dx, scz + dz);
      generateChunk(c);
      world.chunks.set(world.key(c.cx, c.cz), c);
    }

  if (!state) {
    const sy = surfaceY(Math.floor(player.pos.x), Math.floor(player.pos.z));
    player.pos.y = Math.max(sy + 0.2, SEA_LEVEL + 2);
    player.spawnPos.copy(player.pos);
  }

  refreshHotbar();
  forceRenderHearts();

  hideMenus();
  setTimeout(() => tryAcquirePointer(), 60);
}

function saveCurrentWorld() {
  if (!currentWorldId) return;
  const state = {
    mode: getMode(),
    player: {
      x: player.pos.x, y: player.pos.y, z: player.pos.z,
      yaw: player.yaw, pitch: player.pitch,
      hp: player.hp, flying: player.flying,
      spawnX: player.spawnPos.x,
      spawnY: player.spawnPos.y,
      spawnZ: player.spawnPos.z
    },
    inventory: getInventorySnapshot(),
    blockChanges: getAllChanges(),
    furnace: getFurnaceSnapshot(),
    chests: getAllChests(),
    cauldrons: getAllVats(),
    desks: getAllDesks()
  };
  saveWorld(currentWorldId, state);
}
setInterval(saveCurrentWorld, 15000);
addEventListener('beforeunload', saveCurrentWorld);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveCurrentWorld();
});

/* ============================================================
   POINTER LOCK
   ============================================================ */
function tryAcquirePointer() {
  if (document.pointerLockElement === renderer.domElement) return;
  if (!currentWorldId) return;
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && typeof p.catch === 'function') {
      p.catch(() => { showPause(); });
    }
  } catch (e) {
    showPause();
  }
}

document.addEventListener('pointerlockchange', () => {
  input.pointerLocked = document.pointerLockElement === renderer.domElement;
  if (!input.pointerLocked) {
    mouseLeft = false; mouseRight = false; resetBreaking();
    input.keys = {}; // <--- добавлено
    if (currentWorldId && !player.dead && !isInventoryOpen() && !isChatOpen() && !isBookUIOpen()) {
      showPause();
    }
  } else {
    hidePause();
  }
});

/* ============================================================
   СМЕРТЬ
   ============================================================ */
function handleDeath() {
  if (deathHandled) return;
  deathHandled = true;

  if (isInventoryOpen()) closeUI({ skipLock: true });

  dropAllInventory(player.pos.x, player.pos.y, player.pos.z);
  refreshHotbar();
  forceRenderHearts();

  if (document.pointerLockElement) document.exitPointerLock();
  pauseOverlay.classList.add('hidden');
  document.body.classList.remove('in-menu');
  deathOverlay.style.display = 'flex';
}

respawnBtn.addEventListener('click', () => {
  player.dead = false;
  player.hp = player.maxHp;
  player.vel.set(0, 0, 0);
  player.inAirMaxY = null;
  player.hurtCooldown = 1;

  player.pos.copy(player.spawnPos);
  player.pos.y += 1;

  deathHandled = false;
  deathOverlay.style.display = 'none';
  forceRenderHearts();
  refreshHotbar();

  setTimeout(() => {
    if (player.dead) return;
    tryAcquirePointer();
  }, 1400);
});

/* ============================================================
   ЛОМАНИЕ
   ============================================================ */
const breakBarEl = document.getElementById('breakbar');
const breakFillEl = document.getElementById('breakfill');
let breaking = { x: 0, y: 0, z: 0, progress: 0, active: false };

function resetBreaking() {
  breaking.active = false;
  breaking.progress = 0;
  breakBarEl.classList.remove('active');
  breakFillEl.style.width = '0%';
}

function canHarvest(blockId, tool) {
  const req = BLOCK_TOOL_REQ[blockId];
  if (!req) return true;
  if (!tool) return false;
  if (tool.type !== req.tool) return false;
  return tool.tier >= req.tier;
}

function toolSpeed(blockId, tool) {
  if (!tool) return 1;
  if ((blockId === 3 || blockId === 8 || blockId === 9 || blockId === 10 ||
       blockId === 11 || blockId === 12 || blockId === 13 || blockId === 16) && tool.type === 'pickaxe')
    return tool.speed;
  if ((blockId === 6 || blockId === 14 || blockId === 15) && tool.type === 'axe') return tool.speed;
  if ((blockId === 1 || blockId === 2 || blockId === 4) && tool.type === 'shovel') return tool.speed;
  return 1;
}

function currentTool() {
  const s = slots[getActiveSlot()];
  if (!s) return null;
  return getTool(s.id);
}

import { allBlocks } from './registry.js';

function idForStairs(material, orientation) {
  for (const d of allBlocks()) {
    if (d.stairs && d.material === material && d.orientation === orientation) return d.id;
  }
  return null;
}
function blockDrop(blockId) {
  if (blockId === CAULDRON_WATER_ID) return CAULDRON_ID;
  if (blockId === getByKey('school_desk_book').id) return getByKey('school_desk').id;
  if (isStairsBlock(blockId)) return baseStairsId(blockId);
  const d = getById(blockId);
  if (d && d.drop && d.drop !== 'self') {
    const item = getByKey(d.drop);
    if (item) return item.id;
  }
  return blockId;
}

function updateBreaking(dt, hit) {
  if (!mouseLeft || !hit) { resetBreaking(); return; }
  if (hit.block === BEDROCK) { resetBreaking(); return; }

  if (!breaking.active ||
      breaking.x !== hit.x || breaking.y !== hit.y || breaking.z !== hit.z) {
    breaking = { x: hit.x, y: hit.y, z: hit.z, progress: 0, active: true };
  }

  const hardness = BLOCK_HARDNESS[hit.block] ?? 1;
  const tool = currentTool();
  const spd = toolSpeed(hit.block, tool);
  breaking.progress += (dt * spd) / hardness;

  if (breaking.progress >= 1) {
    const blockId = hit.block;

    // если ломаем сундук — выкидываем его содержимое
    if (blockId === CHEST) {
      const arr = getChestSlots(hit.x, hit.y, hit.z);
      for (const s of arr) {
        if (s) spawnDrop(s.id, s.count,
          hit.x + 0.5, hit.y + 0.6, hit.z + 0.5, s.durability);
      }
      deleteChest(hit.x, hit.y, hit.z);
    }

    // чан — выкидываем содержимое
    if (blockId === CAULDRON_ID || blockId === CAULDRON_WATER_ID) {
      const vat = getVatContents(hit.x, hit.y, hit.z);
      if (vat.contents) {
        spawnDrop(vat.contents.id, vat.contents.count,
          hit.x + 0.5, hit.y + 0.6, hit.z + 0.5);
      }
      deleteVat(hit.x, hit.y, hit.z);
    }

        // парта с книгой — книга вылетает отдельно
    if (blockId === getByKey('school_desk_book').id) {
      onDeskBroken(hit.x, hit.y, hit.z);
    }

    world.setBlock(hit.x, hit.y, hit.z, AIR);

    if (canHarvest(blockId, tool)) {
      invAdd(blockDrop(blockId), 1);
      // 20% шанс получить глину с земли и травы
      if ((blockId === GRASS || blockId === DIRT) && Math.random() < 0.20) {
        invAdd(CLAY, 1);
      }
    }

    if (tool && getMode() === GameMode.SURVIVAL) {
      const s = slots[getActiveSlot()];
      if (s && s.durability !== undefined) {
        s.durability--;
        if (s.durability <= 0) slots[getActiveSlot()] = null;
      }
    }

    refreshHotbar();
    triggerSwing();
    resetBreaking();
    return;
  }

  breakBarEl.classList.add('active');
  breakFillEl.style.width = (breaking.progress * 100).toFixed(1) + '%';
}

/* ============================================================
   УСТАНОВКА / ЕДА
   ============================================================ */
function eatFood(id) {
  if (player.hp >= player.maxHp) return;
  const heal = id === BEEF ? 4 : 3;
  player.hp = Math.min(player.maxHp, player.hp + heal);
  const i = getActiveSlot();
  if (getMode() === GameMode.SURVIVAL) invRemoveFromSlot(i, 1);
  refreshHotbar();
  forceRenderHearts();
}

function handleCauldronClick(hit) {
  const x = hit.x, y = hit.y, z = hit.z;
  const isWater = hit.block === CAULDRON_WATER_ID;
  const vat = getVatContents(x, y, z);
  const slot = getActiveSlot();
  const held = slots[slot];

  // 1. Пустая рука → забрать всё
  if (!held) {
    if (vat.contents) {
      invAdd(vat.contents.id, vat.contents.count);
      setVatContents(x, y, z, null);
      refreshHotbar();
    }
    return;
  }

  // 2. Ведро с водой на пустой чан → налить воду
  if (held.id === WATER_BUCKET_ID && !isWater) {
    world.setBlock(x, y, z, CAULDRON_WATER_ID);
    if (held.count === 1) {
      held.id = BUCKET_ID;
    } else {
      held.count--;
      invAdd(BUCKET_ID, 1);
    }
    // Если в сухом чану лежали опилки — они становятся целлюлозой
    if (vat.contents && vat.contents.id === SAWDUST_ID) {
      setVatContents(x, y, z, { id: CELLULOSE_ID, count: vat.contents.count });
    }
    refreshHotbar();
    return;
  }

  // 3. Пустое ведро на чан с водой → забрать воду
  if (held.id === BUCKET_ID && isWater) {
    if (held.count === 1) {
      held.id = WATER_BUCKET_ID;
    } else {
      held.count--;
      invAdd(WATER_BUCKET_ID, 1);
    }
    world.setBlock(x, y, z, CAULDRON_ID);
    refreshHotbar();
    return;
  }

  // 4. Ведро в руках на чан — больше ничего не делаем
  if (held.id === BUCKET_ID || held.id === WATER_BUCKET_ID) return;

  // 5. Положить предмет (стек целиком)
  // Если в чане вода и кладут опилки — они становятся целлюлозой
  let targetId = held.id;
  if (isWater && held.id === SAWDUST_ID) targetId = CELLULOSE_ID;

  if (!vat.contents) {
    setVatContents(x, y, z, { id: targetId, count: held.count });
    slots[slot] = null;
  } else if (vat.contents.id === targetId && vat.contents.count < 64) {
    const add = Math.min(held.count, 64 - vat.contents.count);
    vat.contents.count += add;
    held.count -= add;
    if (held.count <= 0) slots[slot] = null;
    setVatContents(x, y, z, vat.contents);
  }
  refreshHotbar();
}

function tryPlaceOrUse(hit) {
  if (hit.block === CRAFTING_TABLE) { openUI('crafting'); return; }
  if (hit.block === FURNACE)        { openUI('furnace');  return; }
  if (hit.block === CHEST)          { openUI('chest', { x: hit.x, y: hit.y, z: hit.z }); return; }

  const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
  const cur = world.getBlock(px, py, pz);
  if (cur !== AIR && !isWaterBlock(cur)) return;

  const bx = [Math.floor(player.pos.x - 0.3), Math.floor(player.pos.x + 0.3)];
  const by = [Math.floor(player.pos.y), Math.floor(player.pos.y + 1.8)];
  const bz = [Math.floor(player.pos.z - 0.3), Math.floor(player.pos.z + 0.3)];
  if (px >= bx[0] && px <= bx[1] && py >= by[0] && py <= by[1] &&
      pz >= bz[0] && pz <= bz[1]) return;

  const i = getActiveSlot();
  const s = slots[i];
  if (!s) return;
  if (!isBlock(s.id)) return;

  // Ступеньки ориентируем по взгляду игрока
  let placeId = s.id;
  if (isStairsBlock(s.id)) {
    const fx = -Math.sin(player.yaw);
    const fz = -Math.cos(player.yaw);
    let facing;
    if (Math.abs(fx) > Math.abs(fz)) facing = fx > 0 ? 'e' : 'w';
    else                            facing = fz > 0 ? 's' : 'n';
    const material = stairsMaterial(s.id);
    const newId = idForStairs(material, facing);
    if (newId) placeId = newId;
  }

  if (getMode() === GameMode.SURVIVAL) invRemoveFromSlot(i, 1);
  world.setBlock(px, py, pz, placeId);
  refreshHotbar();
}

/* ============================================================
   УПРАВЛЕНИЕ
   ============================================================ */
addEventListener('keydown', (e) => {
  // Пока открыта книга — перехватываем всё, кроме Escape,
  // и не пускаем клавиши в игровой input.
  if (isBookUIOpen()) {
    if (e.code === 'Escape') {
      e.preventDefault();
      closeBook();
      setTimeout(() => {
        if (!input.pointerLocked && !isInventoryOpen() && !isChatOpen() &&
            currentWorldId && !player.dead) {
          showPause();
        }
      }, 150);
    }
    return;
  }

  input.keys[e.code] = true;

  if (isChatOpen()) return;

  if (e.code === 'KeyT') {
    e.preventDefault();
    if (!currentWorldId || player.dead) return;
    openChat();
    if (document.pointerLockElement) document.exitPointerLock();
    return;
  }

    // Пытаемся перехватить опасные браузерные шорткаты,
  // чтобы игрок случайно не закрыл вкладку/не перезагрузил страницу.
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    if (e.code === 'KeyW' || e.code === 'KeyT' || e.code === 'KeyN' ||
        e.code === 'KeyR' || e.code === 'KeyQ') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }
  // Ctrl+Shift+W/N/T тоже не пропускаем
  if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
    if (e.code === 'KeyW' || e.code === 'KeyN' || e.code === 'KeyT') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  if (e.code === 'KeyE') {
    e.preventDefault();
    if (!currentWorldId) return;
    if (player.dead) return;
    if (isInventoryOpen()) closeUI();
    else openUI('inventory');
    return;
  }
    if (e.code === 'Escape' && isChatOpen()) {
    closeChat();
    return;
  }
  if (e.code === 'Escape') {
    if (isEditing()) {
      toggleEditing();
      return;
    }
    if (isInventoryOpen()) {
      closeUI({ skipLock: true });
      showPause();
    }
    return;
  }
  if (isInventoryOpen()) return;
  if (player.dead) return;
  if (!currentWorldId) return;

  if (e.code === 'KeyQ') {
    const i = getActiveSlot();
    const s = slots[i];
    if (s) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      spawnDrop(s.id, 1,
        player.pos.x + dir.x * 0.6,
        player.pos.y + 1.4 + dir.y * 0.3,
        player.pos.z + dir.z * 0.6,
        s.durability);
      invRemoveFromSlot(i, 1);
      refreshHotbar();
    }
    return;
  }

  if (e.code === 'KeyF' && getMode() === GameMode.CREATIVE) {
    player.flying = !player.flying;
  }
    if (e.code === 'KeyG') {
    e.preventDefault();
    const on = toggleEditing();
    if (on && document.pointerLockElement !== renderer.domElement) {
      tryAcquirePointer();
    }
    return;
  }
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10);
    if (n >= 1 && n <= HOTBAR_SIZE) selectSlot(n - 1);
  }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
addEventListener('blur', () => {
  mouseLeft = false;
  mouseRight = false;
  resetBreaking();
  input.keys = {}; // Сбрасываем зажатые клавиши при потере фокуса
});

document.addEventListener('mousemove', (e) => {
  if (!input.pointerLocked || isInventoryOpen()) return;
  const s = 0.0022;
  player.yaw -= e.movementX * s;
  player.pitch -= e.movementY * s;
  const lim = Math.PI / 2 - 0.001;
  player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
});

const raycaster = new THREE.Raycaster();

renderer.domElement.addEventListener('mousedown', (e) => {
  if (!input.pointerLocked || isInventoryOpen() || isBookUIOpen()) return;
  if (e.button === 0) mouseLeft = true;
  if (e.button === 2) mouseRight = true;
  // Режим редактора структур
  if (isEditing()) {
    const hitSel = raycastVoxel(
      camera.position,
      camera.getWorldDirection(new THREE.Vector3()),
      12
    );

    if (!isSelectionComplete()) {
      /* Фаза выделения: ЛКМ ставит угол, ПКМ сбрасывает */
      if (e.button === 0 && hitSel) {
        markCorner(hitSel.x, hitSel.y, hitSel.z);
      } else if (e.button === 2) {
        clearSelection();
      }
      return;
    }

    /* Фаза редактирования: ЛКМ ломает, ПКМ ставит */
    if (e.button === 0 && hitSel) {
      world.setBlock(hitSel.x, hitSel.y, hitSel.z, AIR);
      triggerSwing();
      return;
    }
    if (e.button === 2 && hitSel) {
      const s = slots[getActiveSlot()];
      if (s && isBlock(s.id)) {
        const px = hitSel.x + hitSel.nx;
        const py = hitSel.y + hitSel.ny;
        const pz = hitSel.z + hitSel.nz;
        const cur = world.getBlock(px, py, pz);
        if (cur === AIR || isWaterBlock(cur)) {
          world.setBlock(px, py, pz, s.id);
        }
      }
      return;
    }
    return;
  }
  triggerSwing();

  if (e.button === 0) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const groups = mobs.map(m => m.group);
    const hits = raycaster.intersectObjects(groups, true);
    if (hits.length && hits[0].distance < 4.2) {
      let o = hits[0].object;
      while (o && !o.userData.mob) o = o.parent;
      if (o && o.userData.mob) {
        const t = currentTool();
        let dmg = 1;
        if (t && t.type === 'sword') {
          const swordDmg = { wood: 4, stone: 5, copper: 5, iron: 6, gold: 6, diamond: 7 };
          dmg = swordDmg[t.material] || 4;
        }
        o.userData.mob.damage(dmg);
        return;
      }
    }
  }

  // ---- Ведро и чан (ПКМ) ----
  if (e.button === 2) {
    // Особый случай: клик по чану
    const hitVat = raycastVoxel(
      camera.position,
      camera.getWorldDirection(new THREE.Vector3()),
      6
    );
    if (hitVat && (hitVat.block === CAULDRON_ID || hitVat.block === CAULDRON_WATER_ID)) {
      handleCauldronClick(hitVat);
      return;
    }

    const sBucket = slots[getActiveSlot()];

    // Пустое ведро + вода → набираем источник
    if (sBucket && sBucket.id === BUCKET_ID) {
      const hitW = raycastVoxel(
        camera.position,
        camera.getWorldDirection(new THREE.Vector3()),
        6,
        true                    // ← останавливаемся и на воде
      );
      if (hitW && hitW.block === WATER) {
        let ok = true;
        if (sBucket.count > 1) {
          ok = invAdd(WATER_BUCKET_ID, 1);   // нужно место под новое ведро
        }
        if (ok) {
          world.setBlock(hitW.x, hitW.y, hitW.z, AIR);
          if (sBucket.count === 1) sBucket.id = WATER_BUCKET_ID;
          else sBucket.count--;
          refreshHotbar();
        }
      }
      return;
    }

    // Ведро с водой + воздух → ставим источник
    if (sBucket && sBucket.id === WATER_BUCKET_ID) {
      const hitP = raycastVoxel(
        camera.position,
        camera.getWorldDirection(new THREE.Vector3()),
        6
      );
      if (hitP) {
        const px = hitP.x + hitP.nx;
        const py = hitP.y + hitP.ny;
        const pz = hitP.z + hitP.nz;
        if (world.getBlock(px, py, pz) === AIR) {
          world.setBlock(px, py, pz, WATER);
          if (sBucket.count === 1) sBucket.id = BUCKET_ID;
          else {
            sBucket.count--;
            invAdd(BUCKET_ID, 1);
          }
          refreshHotbar();
        }
      }
      return;
    }
  }

  const hit = raycastVoxel(camera.position, camera.getWorldDirection(new THREE.Vector3()), 6);
  if (!hit) return;

  if (e.button === 0) {
    if (getMode() === GameMode.CREATIVE && hit.block !== BEDROCK) {
      if (hit.block === CAULDRON_ID || hit.block === CAULDRON_WATER_ID) {
        const vat = getVatContents(hit.x, hit.y, hit.z);
        if (vat.contents) {
          spawnDrop(vat.contents.id, vat.contents.count,
            hit.x + 0.5, hit.y + 0.6, hit.z + 0.5);
        }
        deleteVat(hit.x, hit.y, hit.z);
      }
      if (hit.block === getByKey('school_desk_book').id) {
        onDeskBroken(hit.x, hit.y, hit.z);
      }
      world.setBlock(hit.x, hit.y, hit.z, AIR);
    }
  } else if (e.button === 2) {
    // === Парта и книга ===
    const dirDesk = camera.getWorldDirection(new THREE.Vector3());
    const hitDesk = raycastVoxel(camera.position, dirDesk, 6);
    if (handleDeskClick(hitDesk, tryAcquirePointer)) return;
    if (handleBookRead(tryAcquirePointer)) return;

    // === Остальное ПКМ ===
    const s = slots[getActiveSlot()];
    if (s && (s.id === BEEF || s.id === PORK)) { eatFood(s.id); return; }
    if (hit) tryPlaceOrUse(hit);
  }
});
renderer.domElement.addEventListener('mouseup', (e) => {
  if (e.button === 0) { mouseLeft = false; resetBreaking(); }
  if (e.button === 2) mouseRight = false;
});
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

renderer.domElement.addEventListener('wheel', (e) => {
  if (!input.pointerLocked || isInventoryOpen() || isBookUIOpen()) return;
  e.preventDefault();
  const dir = e.deltaY > 0 ? 1 : -1;
  const n = (getActiveSlot() + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
  selectSlot(n);
}, { passive: false });

/* ============================================================
   ГЛАВНЫЙ ЦИКЛ
   ============================================================ */
const clock = new THREE.Clock();
const forwardVec = new THREE.Vector3();
let waterAccum = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  const invOpen = isInventoryOpen();
  const chatOpen = isChatOpen();
  const bookOpen = isBookUIOpen();
  const uiOpen = invOpen || chatOpen || bookOpen;

  if (input.pointerLocked && !uiOpen) updatePlayer(dt);
  else {
    const eyeH = player.crouching ? 1.32 : 1.62;
    camera.position.set(player.pos.x, player.pos.y + eyeH, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  }

  if (currentWorldId) {
    updateChunks(player.pos.x, player.pos.z);
    if (updateMobs(dt)) refreshHotbar();
    if (updateDrops(dt)) refreshHotbar();
  }

  camera.getWorldDirection(forwardVec);
  const hit = raycastVoxel(camera.position, forwardVec, 6);
  if (hit && !uiOpen && input.pointerLocked) {
    highlight.visible = true;
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  } else {
    highlight.visible = false;
  }

  if (getMode() === GameMode.SURVIVAL && input.pointerLocked && !uiOpen) {
    updateBreaking(dt, hit);
  } else if (breaking.active) {
    resetBreaking();
  }

  if (getMode() === GameMode.SURVIVAL && player.dead && !deathHandled) {
    handleDeath();
  }

  tickFurnace(dt);
    waterAccum += dt;
  if (waterAccum >= 0.1) {
    waterAccum = 0;
    tickWater(120);
  }

  updateInfo(dt);
  updateViewModel(dt);

  renderer.render(scene, camera);
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(viewScene, viewCamera);
  renderer.autoClear = true;
}

/* ============================================================
   СТАРТ
   ============================================================ */
async function loadSchoolData() {
  try {
    const res = await fetch('./school.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    setSchoolData(data);
    console.log('school.json загружен, размер:', data.size);
  } catch (e) {
    console.warn('school.json не найден или битый — использую встроенную школу.', e.message);
  }
}

(async function init() {
  initIcons(atlasCanvas);

  // Подключаем воду к миру
  setWaterWorld(world);
  worldEvents.onBlockChange = (x, y, z) => enqueueAround(x, y, z);

  // Загружаем school.json ДО старта мира, чтобы генерация чанков его учла.
  await loadSchoolData();

  showMainMenu();
  animate();
})();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  viewCamera.aspect = innerWidth / innerHeight;
  viewCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});