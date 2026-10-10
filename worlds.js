const INDEX_KEY = 'voxelcraft_worlds_index';
const WORLD_KEY = (id) => 'voxelcraft_world_' + id;

export function listWorlds() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) { return []; }
}

function saveIndex(list) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

export function createWorld(name, mode, seed) {
  const id = 'w_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
  const meta = {
    id, name, mode, seed,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  const list = listWorlds();
  list.push(meta);
  saveIndex(list);
  localStorage.setItem(WORLD_KEY(id), JSON.stringify({ ...meta, state: null }));
  return meta;
}

export function deleteWorld(id) {
  const list = listWorlds().filter(w => w.id !== id);
  saveIndex(list);
  localStorage.removeItem(WORLD_KEY(id));
}

export function loadWorld(id) {
  try {
    const raw = localStorage.getItem(WORLD_KEY(id));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function saveWorld(id, state) {
  const list = listWorlds();
  const meta = list.find(w => w.id === id);
  if (!meta) return;
  meta.updatedAt = Date.now();
  saveIndex(list);
  localStorage.setItem(WORLD_KEY(id), JSON.stringify({ ...meta, state }));
}