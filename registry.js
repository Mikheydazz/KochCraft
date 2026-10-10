/* ============================================================
   ЦЕНТРАЛЬНЫЙ РЕЕСТР БЛОКОВ / ПРЕДМЕТОВ / ИНСТРУМЕНТОВ
   ============================================================ */
const byId  = new Map();
const byKey = new Map();
let nextId = 1;

function _register(def) {
  if (!def.key) throw new Error('У определения нет поля "key"');
  if (def.id === undefined) {
    def.id = nextId++;
  } else {
    nextId = Math.max(nextId, def.id + 1);
  }
  if (byId.has(def.id))  throw new Error(`Дублирующийся id: ${def.id}`);
  if (byKey.has(def.key)) throw new Error(`Дублирующийся key: "${def.key}"`);
  byId.set(def.id, def);
  byKey.set(def.key, def);
  return def.id;
}

export function registerBlock(def) {
  if (def.all !== undefined) def.top = def.bottom = def.side = def.all;
  if (def.drop === undefined) def.drop = 'self';
  def.type = 'block';
  return _register(def);
}

export function registerItem(def) {
  def.type = 'item';
  return _register(def);
}

export function registerTool(def) {
  def.toolType = def.type;   // 'pickaxe' | 'axe' | 'shovel' | 'sword'
  def.type = 'tool';
  return _register(def);
}

export const getById  = (id)  => byId.get(id);
export const getByKey = (key) => byKey.get(key);
export const allDefs   = () => [...byId.values()];
export const allBlocks = () => allDefs().filter(d => d.type === 'block');
export const allItems  = () => allDefs().filter(d => d.type === 'item');
export const allTools  = () => allDefs().filter(d => d.type === 'tool');

export const isBlock = (id) => byId.get(id)?.type === 'block';
export const isTool  = (id) => byId.get(id)?.type === 'tool';
export const isItem  = (id) => byId.get(id)?.type === 'item';