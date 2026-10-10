import * as THREE from 'three';
import {
  AIR, WATER, BEDROCK, CS, SEA_LEVEL, BLOCK_HARDNESS, BLOCK_TOOL_REQ,
  CRAFTING_TABLE, FURNACE, BEEF, PORK, COAL, COAL_ITEM,
  GRASS, DIRT, CLAY
} from './constants.js';
import { input } from './input.js';
import { scene, camera, renderer, highlight } from './scene.js';
import {
  Chunk, world, generateChunk, updateChunks, raycastVoxel, terrainHeight,
  disposeChunk, applyChanges, clearAllChanges, getAllChanges
} from './world.js';
import { initPerlin } from './noise.js';
import {
  updateDrops, spawnDrop, dropAllInventory, clearDrops
} from './drops.js';
import { player, updatePlayer } from './player.js';
import { mobs, updateMobs, surfaceY } from './mobs.js';
import {
  updateViewModel, triggerSwing, viewScene, viewCamera
} from './viewmodel.js';
import { isBlock, isWaterBlock } from './blocks.js';
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
import { atlasCanvas } from './scene.js';
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
  } else {
    clearAllChanges();
    clearDrops();
    let sx = 8, sz = 8;
    for (let r = 0; r < 400; r += 4) {
      const h = terrainHeight(r, 0);
      if (h > SEA_LEVEL + 2) { sx = r; sz = 0; break; }
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
    loadFurnaceSnapshot(null);   // печь пустая
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
    furnace: getFurnaceSnapshot()
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
    if (currentWorldId && !player.dead && !isInventoryOpen()) {
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

const BLOCK_DROPS = { [COAL]: COAL_ITEM };
function blockDrop(blockId) {
  return BLOCK_DROPS[blockId] !== undefined ? BLOCK_DROPS[blockId] : blockId;
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
    world.setBlock(hit.x, hit.y, hit.z, AIR);

    // дроп только если правильный инструмент
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

function tryPlaceOrUse(hit) {
  if (hit.block === CRAFTING_TABLE) { openUI('crafting'); return; }
  if (hit.block === FURNACE)        { openUI('furnace');  return; }

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

  if (getMode() === GameMode.SURVIVAL) invRemoveFromSlot(i, 1);
  world.setBlock(px, py, pz, s.id);
  refreshHotbar();
}

/* ============================================================
   УПРАВЛЕНИЕ
   ============================================================ */
addEventListener('keydown', (e) => {
  input.keys[e.code] = true;

  if (e.code === 'KeyE') {
    e.preventDefault();
    if (!currentWorldId) return;
    if (player.dead) return;
    if (isInventoryOpen()) closeUI();
    else openUI('inventory');
    return;
  }
  if (e.code === 'Escape') {
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
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10);
    if (n >= 1 && n <= HOTBAR_SIZE) selectSlot(n - 1);
  }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
addEventListener('blur', () => { mouseLeft = false; mouseRight = false; resetBreaking(); });

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
  if (!input.pointerLocked || isInventoryOpen()) return;
  if (e.button === 0) mouseLeft = true;
  if (e.button === 2) mouseRight = true;
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

  const hit = raycastVoxel(camera.position, camera.getWorldDirection(new THREE.Vector3()), 6);
  if (!hit) return;

  if (e.button === 0) {
    if (getMode() === GameMode.CREATIVE && hit.block !== BEDROCK) {
      world.setBlock(hit.x, hit.y, hit.z, AIR);
    }
  } else if (e.button === 2) {
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
  if (!input.pointerLocked || isInventoryOpen()) return;
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

  if (input.pointerLocked && !invOpen) updatePlayer(dt);
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
  if (hit && !invOpen && input.pointerLocked) {
    highlight.visible = true;
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  } else {
    highlight.visible = false;
  }

  if (getMode() === GameMode.SURVIVAL && input.pointerLocked && !invOpen) {
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
(function init() {
  initIcons(atlasCanvas);

  // Подключаем воду к миру
  setWaterWorld(world);
  worldEvents.onBlockChange = (x, y, z) => enqueueAround(x, y, z);

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