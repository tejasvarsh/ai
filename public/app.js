// AURA AI — Frontend App
// ─────────────────────────────────────────────────────────────────────────────

let ws = null;
let sessionId = null;
let currentPersonality = 'assistant';
let currentProvider = 'gemini';
let currentConvId = null;
let conversations = {}; // { id: { title, messages[], personalityId } }
let isTyping = false;

const personalities = {
  assistant: { name: 'AURA',  avatar: '🤖', color: '#7c6aff', desc: 'General Assistant' },
  coder:     { name: 'CODE',  avatar: '⚡', color: '#7c5cfc', desc: 'Software Engineer' },
  researcher:{ name: 'SAGE',  avatar: '🔭', color: '#ffd93d', desc: 'Deep Research' },
  creative:  { name: 'MUSE',  avatar: '🎨', color: '#ff6b35', desc: 'Creative Writer' },
  tutor:     { name: 'TUTOR', avatar: '📚', color: '#ff4d6d', desc: 'Patient Teacher' },
};

// ── WebSocket ─────────────────────────────────────────────────────────────────
function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}`);

  ws.onopen = () => setStatus('connected', 'Connected');

  ws.onmessage = ({ data }) => {
    try { handle(JSON.parse(data)); }
    catch(e) { console.error(e); }
  };

  ws.onclose = () => {
    setStatus('', 'Reconnecting...');
    setTimeout(connect, 3000);
  };

  ws.onerror = () => setStatus('error', 'Error');
}

function send(type, payload) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload, ...payload }));
}

// ── Message Handler ───────────────────────────────────────────────────────────
function handle(msg) {
  if (msg.type === 'welcome') {
    sessionId = msg.sessionId;
    currentProvider = msg.provider || 'gemini';
    updateProviderUI(currentProvider);
    if (msg.hasKey) setRealMode();
    renderPersonalities(msg.personalities);
  }

  if (msg.type === 'typing') {
    showTyping(msg.conversationId);
  }

  if (msg.type === 'response') {
    hideTyping();
    addAIMessage(msg.message, msg.personality, msg.conversationId, msg.timestamp);
    isTyping = false;
    enableInput();
  }

  if (msg.type === 'error') {
    hideTyping();
    addErrorMessage(msg.message, msg.conversationId);
    isTyping = false;
    enableInput();
  }

  if (msg.type === 'provider_switched') {
    currentProvider = msg.provider;
    updateProviderUI(msg.provider);
  }
}

// ── Personalities ─────────────────────────────────────────────────────────────
function renderPersonalities(list) {
  const container = document.getElementById('personalitiesList');
  const data = list || Object.entries(personalities).map(([id, p]) => ({ id, name: p.name, avatar: p.avatar, color: p.color }));

  container.innerHTML = data.map(p => {
    const local = personalities[p.id] || {};
    return `
      <button class="personality-btn ${p.id === currentPersonality ? 'active' : ''}"
        data-id="${p.id}" onclick="switchPersonality('${p.id}')"
        style="${p.id === currentPersonality ? `color:${p.color}` : ''}">
        <div class="p-avatar" style="${p.id === currentPersonality ? `border-color:${p.color}40;color:${p.color}` : ''}">${p.avatar}</div>
        <div>
          <div class="p-name">${p.name}</div>
          <div class="p-desc">${local.desc || ''}</div>
        </div>
      </button>
    `;
  }).join('');
}

function switchPersonality(id) {
  currentPersonality = id;
  const p = personalities[id];
  if (!p) return;

  // Update topbar
  document.getElementById('apAvatar').textContent = p.avatar;
  document.getElementById('apName').textContent = p.name;
  document.getElementById('apSub').textContent = p.desc;

  // Update welcome
  document.getElementById('welcomeName').textContent = p.name;

  // Update input placeholder
  document.getElementById('msgInput').placeholder = `Message ${p.name}...`;

  // Re-render buttons
  document.querySelectorAll('.personality-btn').forEach(btn => {
    const isActive = btn.dataset.id === id;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.style.color = p.color;
    else btn.style.color = '';
  });

  // Update sidebar
  renderPersonalities(null);

  closeSidebar();
}

// ── Conversations ─────────────────────────────────────────────────────────────
function newConversation() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  conversations[id] = {
    title: 'New Chat',
    messages: [],
    personalityId: currentPersonality,
    createdAt: new Date()
  };
  currentConvId = id;
  clearMessages();
  showWelcome();
  renderConvList();
  closeSidebar();
  document.getElementById('msgInput').focus();
}

function clearMessages() {
  const msgs = document.getElementById('messages');
  msgs.innerHTML = '';
}

function showWelcome() {
  const msgs = document.getElementById('messages');
  const p = personalities[currentPersonality];
  msgs.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-icon">${p?.avatar || '✨'}</div>
      <h1 class="welcome-title">Hello, I'm <span id="welcomeName">${p?.name || 'AURA'}</span></h1>
      <p class="welcome-sub">Your intelligent AI assistant — powered by free AI forever</p>
      <div class="suggestions" id="suggestions">
        <button class="suggestion-btn" data-msg="What can you help me with?">What can you help me with?</button>
        <button class="suggestion-btn" data-msg="Write a Python function to sort a list">Write me some code</button>
        <button class="suggestion-btn" data-msg="Explain quantum computing simply">Explain something complex</button>
        <button class="suggestion-btn" data-msg="Write a short creative story about AI">Write a creative story</button>
      </div>
    </div>
  `;
  bindSuggestions();
}

function renderConvList() {
  const list = document.getElementById('convList');
  const convs = Object.entries(conversations).reverse();

  if (convs.length === 0) {
    list.innerHTML = '<div class="conv-empty">No conversations yet</div>';
    return;
  }

  list.innerHTML = convs.map(([id, conv]) => `
    <div class="conv-item ${id === currentConvId ? 'active' : ''}" onclick="loadConversation('${id}')">
      <div>${conv.title}</div>
      <div class="conv-time">${timeAgo(conv.createdAt)}</div>
    </div>
  `).join('');
}

function loadConversation(id) {
  currentConvId = id;
  const conv = conversations[id];
  if (!conv) return;

  currentPersonality = conv.personalityId || 'assistant';
  clearMessages();
  renderConvList();
  closeSidebar();

  if (conv.messages.length === 0) {
    showWelcome();
    return;
  }

  conv.messages.forEach(m => {
    if (m.role === 'user') addUserMessageDOM(m.content);
    else addAIMessageDOM(m.content, personalities[m.personalityId] || personalities.assistant, m.timestamp);
  });

  scrollBottom();
}

// ── Sending Messages ──────────────────────────────────────────────────────────
function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || isTyping) return;

  // Create conversation if needed
  if (!currentConvId) {
    const id = Date.now().toString(36);
    conversations[id] = { title: text.slice(0, 40), messages: [], personalityId: currentPersonality, createdAt: new Date() };
    currentConvId = id;
  }

  // Update title if first message
  const conv = conversations[currentConvId];
  if (conv.messages.length === 0) {
    conv.title = text.slice(0, 40) + (text.length > 40 ? '...' : '');
  }

  // Clear welcome
  document.getElementById('welcome')?.remove();

  // Add user message to DOM
  addUserMessageDOM(text);

  // Store in history
  conv.messages.push({ role: 'user', content: text });

  // Clear input
  input.value = '';
  input.style.height = 'auto';
  updateCharCount(0);
  disableInput();

  // Build history for AI (last 20 messages)
  const history = conv.messages.slice(-20, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content
  }));

  // Send to server
  isTyping = true;
  ws.send(JSON.stringify({
    type: 'chat',
    message: text,
    personalityId: currentPersonality,
    conversationId: currentConvId,
    history
  }));

  renderConvList();
}

// ── DOM Helpers ───────────────────────────────────────────────────────────────
function addUserMessageDOM(text) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg-group';
  div.innerHTML = `
    <div class="msg-row user">
      <div class="msg-avatar">👤</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>
    </div>
    <div class="msg-meta" style="text-align:right">You · ${timeStr()}</div>
  `;
  msgs.appendChild(div);
  scrollBottom();
}

function addAIMessage(text, personality, convId, timestamp) {
  // Store in conversation
  if (convId && conversations[convId]) {
    conversations[convId].messages.push({
      role: 'assistant',
      content: text,
      personalityId: currentPersonality,
      timestamp
    });
  }
  addAIMessageDOM(text, personality, timestamp);
}

function addAIMessageDOM(text, personality, timestamp) {
  const msgs = document.getElementById('messages');
  const p = personality || personalities[currentPersonality];
  const div = document.createElement('div');
  div.className = 'msg-group';

  // Parse markdown
  let html = text;
  if (typeof marked !== 'undefined') {
    html = marked.parse(text);
  }

  div.innerHTML = `
    <div class="msg-row ai">
      <div class="msg-avatar" style="border-color:${p.color}30;color:${p.color}">${p.avatar}</div>
      <div class="msg-bubble">${html}</div>
    </div>
    <div class="msg-meta">${p.name} · ${timeStr(timestamp)}</div>
  `;
  msgs.appendChild(div);
  scrollBottom();
}

function addErrorMessage(text, convId) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg-group';
  div.innerHTML = `
    <div class="msg-row ai">
      <div class="msg-avatar">⚠️</div>
      <div class="error-bubble">${escapeHtml(text)}</div>
    </div>
  `;
  msgs.appendChild(div);
  scrollBottom();
}

// ── Typing indicator ──────────────────────────────────────────────────────────
let typingEl = null;

function showTyping(convId) {
  if (typingEl) return;
  const msgs = document.getElementById('messages');
  document.getElementById('welcome')?.remove();

  typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.id = 'typingIndicator';
  const p = personalities[currentPersonality];
  typingEl.innerHTML = `
    <div class="msg-avatar" style="border-color:${p.color}30;color:${p.color}">${p.avatar}</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  msgs.appendChild(typingEl);
  scrollBottom();
}

function hideTyping() {
  typingEl?.remove();
  typingEl = null;
}

// ── Provider switching ────────────────────────────────────────────────────────
document.getElementById('providersList').addEventListener('click', e => {
  const btn = e.target.closest('.provider-btn');
  if (!btn) return;
  const provider = btn.dataset.p;
  currentProvider = provider;
  updateProviderUI(provider);
  ws.send(JSON.stringify({ type: 'switch_provider', provider }));
  closeSidebar();
});

function updateProviderUI(provider) {
  document.querySelectorAll('.provider-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.p === provider);
  });
  const labels = { gemini: 'Gemini (Free)', groq: 'Groq (Free)', claude: 'Claude' };
  const display = { gemini: 'Gemini', groq: 'Groq', claude: 'Claude' };
  document.getElementById('aiLabel').textContent = `Powered by ${labels[provider] || provider}`;
  document.getElementById('providerDisplay').textContent = display[provider] || provider;
}

function setRealMode() {
  const badge = document.getElementById('modeBadge');
  badge.textContent = 'REAL AI';
  badge.classList.add('real');
}

// ── Input handling ────────────────────────────────────────────────────────────
const input = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

input.addEventListener('input', () => {
  // Auto resize
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  // Char count
  updateCharCount(input.value.length);
  // Enable/disable send
  sendBtn.disabled = !input.value.trim() || isTyping;
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

document.getElementById('newChatBtn').addEventListener('click', newConversation);

function updateCharCount(n) {
  document.getElementById('charCount').textContent = `${n}/4000`;
}

function disableInput() {
  input.disabled = true;
  sendBtn.disabled = true;
}

function enableInput() {
  input.disabled = false;
  sendBtn.disabled = false;
  input.focus();
}

// ── Suggestion buttons ────────────────────────────────────────────────────────
function bindSuggestions() {
  document.querySelectorAll('.suggestion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.msg;
      updateCharCount(input.value.length);
      sendBtn.disabled = false;
      sendMessage();
    });
  });
}

// ── Mobile sidebar ────────────────────────────────────────────────────────────
document.getElementById('menuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('visible');
});

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('visible');
}

// ── Status ────────────────────────────────────────────────────────────────────
function setStatus(state, text) {
  const pill = document.getElementById('statusPill');
  const txt = document.getElementById('statusText');
  pill.className = `status-pill ${state}`;
  txt.textContent = text;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function scrollBottom() {
  const msgs = document.getElementById('messages');
  setTimeout(() => msgs.scrollTop = msgs.scrollHeight, 50);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeStr(iso) {
  return new Date(iso || Date.now()).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

// ── Init ──────────────────────────────────────────────────────────────────────
connect();
bindSuggestions();
newConversation();
