const chatLogEl     = document.getElementById('chatLog');
const chatInputEl   = document.getElementById('chatInput');
const chatContainer = document.getElementById('chatContainer');

let chatOpen = false;
let onCloseCallback = null;
let onCommandCallback = null;

const messages = [];  // { text, kind: 'info' | 'cmd' | 'err' }

export function isChatOpen() { return chatOpen; }

export function addChatMessage(text, kind = 'info') {
  messages.push({ text, kind });
  if (messages.length > 300) messages.shift();
  if (chatOpen) renderChat();
}

function renderChat() {
  chatLogEl.innerHTML = messages.map(m => {
    const cls = m.kind === 'err' ? 'err' : (m.kind === 'cmd' ? 'cmd' : 'info');
    return `<div class="chat-msg ${cls}">${escapeHtml(m.text)}</div>`;
  }).join('');
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])
  );
}

export function openChat() {
  if (chatOpen) return;
  chatOpen = true;
  chatContainer.classList.add('open');
  chatInputEl.value = '';
  renderChat();
  setTimeout(() => chatInputEl.focus(), 0);
}

function doClose() {
  if (!chatOpen) return;
  chatOpen = false;
  chatContainer.classList.remove('open');
  chatInputEl.blur();
  if (onCloseCallback) onCloseCallback();
}

export function closeChat() { doClose(); }

export function initChat(opts) {
  onCloseCallback   = opts.onClose   || null;
  onCommandCallback = opts.onCommand || null;

  chatInputEl.addEventListener('keydown', (e) => {
    e.stopPropagation();

    if (e.code === 'Escape') {
      e.preventDefault();
      doClose();
      return;
    }
    if (e.code === 'Enter') {
      e.preventDefault();
      const text = chatInputEl.value.trim();
      chatInputEl.value = '';
      if (text) {
        if (text.startsWith('/')) {
          addChatMessage('> ' + text, 'cmd');
          if (onCommandCallback) onCommandCallback(text.slice(1));
        } else {
          addChatMessage('Вы: ' + text, 'info');
        }
      }
      doClose();
    }
  });
}