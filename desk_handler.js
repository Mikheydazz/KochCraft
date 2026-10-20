import { getByKey } from './constants.js';
import { getDesk, setDesk, deleteDesk } from './desks.js';
import { openBook } from './book_ui.js';
import { world } from './world.js';
import { slots, INVENTORY_SIZE, invAdd } from './gamemode.js';
import { getActiveSlot, refreshHotbar } from './hud.js';
import { getTool } from './items.js';
import { spawnDrop } from './drops.js';

const BOOK_ID       = getByKey('book').id;
const DESK_ID       = getByKey('school_desk').id;
const DESK_BOOK_ID  = getByKey('school_desk_book').id;

export function isDeskBlock(id) {
  return id === DESK_ID || id === DESK_BOOK_ID;
}

function addBookToInv(book) {
  const hasText = book.text && book.text.length > 0;
  if (hasText) {
    // Книга с текстом не стакается — ищем пустой слот
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      if (!slots[i]) {
        slots[i] = { id: BOOK_ID, count: 1, text: book.text };
        return true;
      }
    }
    return false;
  }
  return invAdd(BOOK_ID, book.count || 1);
}

/* Обработка ПКМ по парте. onBookClose — коллбэк для возврата pointer lock. */
export function handleDeskClick(hit, onBookClose) {
  if (!hit || !isDeskBlock(hit.block)) return false;

  const { x, y, z } = hit;
  const desk = getDesk(x, y, z);
  const activeSlot = getActiveSlot();
  const held = slots[activeSlot];

  /* 1) Пустая рука → забрать книгу */
  if (!held) {
    if (desk) {
      if (addBookToInv(desk)) {
        deleteDesk(x, y, z);
        world.setBlock(x, y, z, DESK_ID);
        refreshHotbar();
      }
    }
    return true;
  }

  /* 2) Книга в руке → положить на парту */
  if (held.id === BOOK_ID && !desk) {
    setDesk(x, y, z, { text: held.text || '', count: 1 });
    world.setBlock(x, y, z, DESK_BOOK_ID);
    held.count--;
    if (held.count <= 0) slots[activeSlot] = null;
    refreshHotbar();
    return true;
  }

  /* 3) Ручка + книга на парте → открыть редактор */
  if (desk) {
    const tool = getTool(held.id);
    if (tool && tool.type === 'pen') {
      openBook({
        text: desk.text || '',
        mode: 'edit',
        title: 'Запись в книге',
        onSave: (text) => setDesk(x, y, z, { ...desk, text }),
        onClose: () => { if (onBookClose) onBookClose(); }
      });
      return true;
    }
  }

  return true;
}

/* ПКМ по книге с текстом в руке → открыть читалку. */
export function handleBookRead(onBookClose) {
  const activeSlot = getActiveSlot();
  const held = slots[activeSlot];
  if (!held || held.id !== BOOK_ID) return false;
  if (!held.text || !held.text.length) return false;

  openBook({
    text: held.text,
    mode: 'read',
    title: 'Книга',
    onClose: () => { if (onBookClose) onBookClose(); }
  });
  return true;
}

/* Дроп книги при разрушении парты с книгой. */
export function onDeskBroken(x, y, z) {
  const desk = getDesk(x, y, z);
  if (desk) {
    spawnDrop(BOOK_ID, 1, x + 0.5, y + 0.9, z + 0.5, undefined,
      desk.text ? { text: desk.text } : undefined);
    deleteDesk(x, y, z);
  }
}