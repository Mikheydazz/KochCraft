import { input } from './input.js';
const overlayEl = document.getElementById('bookOverlay');
const titleEl   = document.getElementById('bookTitle');
const textEl    = document.getElementById('bookText');
const saveBtn   = document.getElementById('bookSave');
const closeBtn  = document.getElementById('bookClose');
const statusEl  = document.getElementById('bookStatus');

let isOpen = false;
let onSaveCb = null;
let onCloseCb = null;

export function isBookUIOpen() { return isOpen; }

export function openBook({ text = '', mode = 'read', title = 'Книга', onSave = null, onClose = null }) {
  if (isOpen) return;
  isOpen = true;
  onSaveCb = onSave;
  onCloseCb = onClose;

  // Сбрасываем зажатые клавиши, чтобы персонаж не «уехал» после закрытия
  input.keys = {};

  titleEl.textContent = title;
  textEl.value = text;
  textEl.readOnly = (mode === 'read');
  textEl.placeholder = mode === 'edit' ? 'Здесь можно писать...' : '';

  saveBtn.style.display = mode === 'edit' ? 'inline-block' : 'none';
  statusEl.textContent = '';

  overlayEl.classList.add('open');
  if (document.pointerLockElement) document.exitPointerLock();

  if (mode === 'edit') setTimeout(() => textEl.focus(), 60);
}

export function closeBook() {
  if (!isOpen) return;
  isOpen = false;
  overlayEl.classList.remove('open');
  const cb = onCloseCb;
  onSaveCb = null;
  onCloseCb = null;
  if (cb) cb();
}

saveBtn.addEventListener('click', () => {
  if (!onSaveCb) return;
  onSaveCb(textEl.value);
  statusEl.textContent = 'Сохранено ✓';
  setTimeout(() => {
    if (statusEl.textContent === 'Сохранено ✓') statusEl.textContent = '';
  }, 1600);
});

closeBtn.addEventListener('click', () => closeBook());