import * as THREE from 'three';
import {
  AIR, WATER, BEDROCK, CS, SEA_LEVEL, BLOCK_HARDNESS, BLOCK_TOOL_REQ,
  CRAFTING_TABLE, FURNACE
} from './constants.js';
import { input } from './input.js';
import { scene, camera, renderer, highlight } from './scene.js';
import {
  Chunk, world, generateChunk, updateChunks, raycastVoxel, terrainHeight
} from './world.js';
import { player, updatePlayer } from './player.js';
import { mobs, updateMobs, surfaceY } from './mobs.js';
import {
  updateViewModel, triggerSwing, viewScene, viewCamera
} from './viewmodel.js';
import { isBlock } from './blocks.js';
import { isTool, getTool, CREATIVE_ITEMS } from './items.js';
import {
  selectSlot, getActiveSlot, updateInfo, refreshHotbar,
  openUI, closeUI, isInventoryOpen, getUiContext, tickFurnace
} from './hud.js';
import {
  GameMode, getMode, setMode, HOTBAR_SIZE, STACK_MAX,
  slots, invClear, invAdd, invRemoveFromSlot
} from './gamemode.js';
import { initIcons } from './icons.js';
import { atlasCanvas } from './scene.js';

let mouseLeft = false;
let mouseRight = false;

/* ============================================================
   РЕЖИМ ИГРЫ
   ============================================================ */
const modeBtn = document.getElementById('modeBtn');
const modeBadge = document.getElementById('modeBadge');

function updateModeUI() {
  const isCreative = getMode() === GameMode.CREATIVE;
  modeBtn.textContent = 'Режим: ' + (isCreative ? 'Творческий' : 'Выживание');
  modeBtn.classList.toggle('survival', !isCreative);
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

function toggleMode() {
  const newMode = getMode() === GameMode.CREATIVE ? GameMode.SURVIVAL : GameMode.CREATIVE;
  setMode(newMode);
  resetBreaking();
  if (newMode === GameMode.CREATIVE) giveCreativeInventory();
  else invClear();
  updateModeUI();
  refreshHotbar();
}
modeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleMode(); });

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

/* Проверяем, может ли текущий инструмент добыть блок */
function canHarvest(blockId, tool) {
  const req = BLOCK_TOOL_REQ[blockId];
  if (!req) return true;                      // не требует инструмента
  if (!tool) return false;
  if (tool.type !== req.tool) return false;
  return tool.tier >= req.tier;
}

/* Множитель скорости от правильного инструмента */
function toolSpeed(blockId, tool) {
  if (!tool) return 1;
  // пиксель/топор/лопата по типу блока
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
      invAdd(blockId, 1);
    }

    // износ инструмента
    if (tool && getMode() === GameMode.SURVIVAL) {
      const s = slots[getActiveSlot()];
      if (s && s.durability !== undefined) {
        s.durability--;
        if (s.durability <= 0) {
          slots[getActiveSlot()] = null;
        }
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
   УСТАНОВКА / ИСПОЛЬЗОВАНИЕ
   ============================================================ */
function tryPlaceOrUse(hit) {
  // сначала: если смотрим на верстак/печь — открыть UI
  if (hit.block === CRAFTING_TABLE) { openUI('crafting'); return; }
  if (hit.block === FURNACE)        { openUI('furnace');  return; }

  const px = hit.x + hit.nx, py = hit.y + hit.ny, pz = hit.z + hit.nz;
  const cur = world.getBlock(px, py, pz);
  if (cur !== AIR && cur !== WATER) return;

  const bx = [Math.floor(player.pos.x - 0.3), Math.floor(player.pos.x + 0.3)];
  const by = [Math.floor(player.pos.y), Math.floor(player.pos.y + 1.8)];
  const bz = [Math.floor(player.pos.z - 0.3), Math.floor(player.pos.z + 0.3)];
  if (px >= bx[0] && px <= bx[1] && py >= by[0] && py <= by[1] &&
      pz >= bz[0] && pz <= bz[1]) return;

  const i = getActiveSlot();
  const s = slots[i];
  if (!s) return;
  if (!isBlock(s.id)) return;   // инструмент/слиток не ставим

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
    if (isInventoryOpen()) closeUI();
    else openUI('inventory');
    return;
  }
  if (e.code === 'Escape') {
    if (isInventoryOpen()) {
      // Не даём Escape закрыть UI: браузер после Escape блокирует
      // повторный захват курсора, из-за чего выскакивало стартовое меню.
      e.preventDefault();
      e.stopPropagation();
    }
    return;
  }
  if (isInventoryOpen()) return; // остальное — только в игре

  if (e.code === 'KeyF') player.flying = !player.flying;
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10);
    if (n >= 1 && n <= HOTBAR_SIZE) selectSlot(n - 1);
  }
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => { input.keys[e.code] = false; });
addEventListener('blur', () => { mouseLeft = false; mouseRight = false; resetBreaking(); });

const overlay = document.getElementById('overlay');
overlay.addEventListener('click', () => {
  if (isInventoryOpen()) return;
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  input.pointerLocked = document.pointerLockElement === renderer.domElement;
  if (!isInventoryOpen()) {
    overlay.style.display = input.pointerLocked ? 'none' : 'flex';
  }
  if (!input.pointerLocked) {
    mouseLeft = false; mouseRight = false; resetBreaking();
  }
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
        const base = getMode() === GameMode.SURVIVAL ? 3 : 6;
        const bonus = t && t.type === 'sword' ? t.damage : 0;
        o.userData.mob.damage(base + bonus);
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
    // выживание — через updateBreaking
  } else if (e.button === 2) {
    tryPlaceOrUse(hit);
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

  updateChunks(player.pos.x, player.pos.z);
  updateMobs(dt);

  camera.getWorldDirection(forwardVec);
  const hit = raycastVoxel(camera.position, forwardVec, 6);
  if (hit && !invOpen) {
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

  if (invOpen && getUiContext() === 'furnace') tickFurnace(dt);

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
  let sx = 8, sz = 8;
  for (let r = 0; r < 400; r += 4) {
    const h = terrainHeight(r, 0);
    if (h > SEA_LEVEL + 2) { sx = r; sz = 0; break; }
  }
  player.pos.set(sx + 0.5, terrainHeight(sx, sz) + 4, sz + 0.5);

  const scx = Math.floor(player.pos.x / CS), scz = Math.floor(player.pos.z / CS);
  for (let dz = -2; dz <= 2; dz++)
    for (let dx = -2; dx <= 2; dx++) {
      const c = new Chunk(scx + dx, scz + dz);
      generateChunk(c);
      world.chunks.set(world.key(c.cx, c.cz), c);
    }
  const sy = surfaceY(Math.floor(player.pos.x), Math.floor(player.pos.z));
  player.pos.y = Math.max(sy + 0.2, SEA_LEVEL + 2);

  giveCreativeInventory();
  selectSlot(0);
  updateModeUI();
  refreshHotbar();
  animate();
})();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  viewCamera.aspect = innerWidth / innerHeight;
  viewCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});