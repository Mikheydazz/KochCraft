import * as THREE from 'three';
import { scene } from './scene.js';
import { world } from './world.js';
import { AIR } from './constants.js';

let editing = false;
let corner1 = null;
let corner2 = null;

/* ---- Визуализация выделения ---- */
const previewMat = new THREE.LineBasicMaterial({ color: 0xffcc00 });
const preview = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
  previewMat
);
preview.visible = false;
scene.add(preview);

const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
const marker1 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), markerMat);
const marker2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), markerMat);
marker1.visible = false;
marker2.visible = false;
scene.add(marker1);
scene.add(marker2);

/* ---- Состояние ---- */
export function isEditing()           { return editing; }
export function getCorner1()          { return corner1; }
export function getCorner2()          { return corner2; }
export function isSelectionComplete() { return !!(corner1 && corner2); }

export function toggleEditing() {
  editing = !editing;
  if (!editing) clearSelection();
  updatePanel();
  return editing;
}

export function clearSelection() {
  corner1 = null;
  corner2 = null;
  preview.visible = false;
  marker1.visible = false;
  marker2.visible = false;
  updatePanel();
}

export function markCorner(x, y, z) {
  // Если оба уже стоят — начинаем заново с первого
  if (corner1 && corner2) {
    corner1 = { x, y, z };
    corner2 = null;
  } else if (!corner1) {
    corner1 = { x, y, z };
  } else {
    corner2 = { x, y, z };
  }
  updateMarkers();
  updatePanel();
}

function updateMarkers() {
  if (corner1) {
    marker1.position.set(corner1.x + 0.5, corner1.y + 0.5, corner1.z + 0.5);
    marker1.visible = true;
  } else marker1.visible = false;

  if (corner2) {
    marker2.position.set(corner2.x + 0.5, corner2.y + 0.5, corner2.z + 0.5);
    marker2.visible = true;
  } else marker2.visible = false;

  if (corner1 && corner2) {
    const x0 = Math.min(corner1.x, corner2.x);
    const x1 = Math.max(corner1.x, corner2.x);
    const y0 = Math.min(corner1.y, corner2.y);
    const y1 = Math.max(corner1.y, corner2.y);
    const z0 = Math.min(corner1.z, corner2.z);
    const z1 = Math.max(corner1.z, corner2.z);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, d = z1 - z0 + 1;
    preview.scale.set(w, h, d);
    preview.position.set(x0 + w / 2, y0 + h / 2, z0 + d / 2);
    preview.visible = true;
  } else {
    preview.visible = false;
  }
}

/* ---- Сбор данных ---- */
export function buildStructureJSON(name) {
  if (!corner1 || !corner2) return null;

  const x0 = Math.min(corner1.x, corner2.x);
  const x1 = Math.max(corner1.x, corner2.x);
  const y0 = Math.min(corner1.y, corner2.y);
  const y1 = Math.max(corner1.y, corner2.y);
  const z0 = Math.min(corner1.z, corner2.z);
  const z1 = Math.max(corner1.z, corner2.z);

  const blocks = [];
  for (let y = y0; y <= y1; y++)
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const b = world.getBlock(x, y, z);
        if (b !== AIR) blocks.push([x - x0, y - y0, z - z0, b]);
      }

  return {
    name: name || 'structure',
    size: [x1 - x0 + 1, y1 - y0 + 1, z1 - z0 + 1],
    blocks
  };
}

export function downloadStructureFile(name) {
  const json = buildStructureJSON(name);
  if (!json) { alert('Сначала установите оба угла выделения.'); return false; }
  const text = JSON.stringify(json, null, 1);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (name || 'structure') + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/* ---- Панель ---- */
const panel   = document.getElementById('structurePanel');
const c1El    = document.getElementById('structC1');
const c2El    = document.getElementById('structC2');
const sizeEl  = document.getElementById('structSize');
const nameEl  = document.getElementById('structName');

function updatePanel() {
  if (!panel) return;
  panel.classList.toggle('hidden', !editing);
  if (!editing) return;

  c1El.textContent = corner1 ? `(${corner1.x}, ${corner1.y}, ${corner1.z})` : '—';
  c2El.textContent = corner2 ? `(${corner2.x}, ${corner2.y}, ${corner2.z})` : '—';

  if (corner1 && corner2) {
    const w = Math.abs(corner1.x - corner2.x) + 1;
    const h = Math.abs(corner1.y - corner2.y) + 1;
    const d = Math.abs(corner1.z - corner2.z) + 1;
    sizeEl.textContent = `${w} × ${h} × ${d}`;
  } else {
    sizeEl.textContent = '—';
  }

  const modeEl = document.getElementById('structMode');
  if (modeEl) {
    if (corner1 && corner2) {
      modeEl.textContent = 'Редактирование';
      modeEl.style.color = '#4fd';
    } else {
      modeEl.textContent = 'Выделение';
      modeEl.style.color = '#ffcc00';
    }
  }
}

/* ---- Установка загруженной структуры ---- */
export function placeStructureAtPlayer(data, px, py, pz) {
  if (!data || !Array.isArray(data.blocks)) return false;
  const ox = Math.floor(px);
  const oy = Math.floor(py);
  const oz = Math.floor(pz);
  for (const entry of data.blocks) {
    if (!Array.isArray(entry) || entry.length < 4) continue;
    const [dx, dy, dz, id] = entry;
    world.setBlock(ox + dx, oy + dy, oz + dz, id);
  }
  return true;
}