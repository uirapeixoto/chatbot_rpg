// ── State ───────────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('token'),
  theme: localStorage.getItem('theme') || 'light',
  page: 'config',
  convId: null,
  cfg: null,
  convs: [],
  detail: null,
  saveMsg: null,
  saveMsgType: null,
  waStatus: null,
  waQr: null,
  _waPollTimer: null,
}

// ── Theme ───────────────────────────────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('theme', t)
  state.theme = t
}
applyTheme(state.theme)

// ── API helper ──────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) { logout(); return null }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro desconhecido')
  return data
}

// ── Auth ────────────────────────────────────────────────────────────────────
function logout() {
  stopWaPoll()
  state.token = null; state.waStatus = null; state.waQr = null
  localStorage.removeItem('token')
  render()
}

// ── WhatsApp polling ─────────────────────────────────────────────────────────
async function checkWaStatus() {
  try {
    const data = await api('GET', '/whatsapp/status')
    if (!data) return
    const prev = state.waStatus
    state.waStatus = data.status
    state.waQr = data.qr
    if (data.status === 'connected') { stopWaPoll(); if (prev !== 'connected') render(); return }
    if (prev !== data.status) render()
  } catch { /* ignore */ }
}

function startWaPoll() {
  if (state._waPollTimer) return
  checkWaStatus()
  state._waPollTimer = setInterval(checkWaStatus, 3000)
}

function stopWaPoll() {
  if (state._waPollTimer) { clearInterval(state._waPollTimer); state._waPollTimer = null }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatJid(jid) {
  const num = jid.replace(/@.*$/, '').replace(/:.*$/, '')
  if (num.length >= 10) return '+' + num.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '$1 ($2) $3-$4')
  return num
}
function formatDate(iso) {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })
}
function formatTime(iso) {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z')
  return d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
}
function getInitial(jid) {
  return jid.replace(/@.*$/, '').replace(/:.*$/, '').slice(-2, -1) || '?'
}
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  const app = document.getElementById('app')
  if (!state.token) { app.innerHTML = renderLoginPage(); bindLogin(); return }
  if (!state.waStatus || state.waStatus === 'qr' || state.waStatus === 'connecting') {
    app.innerHTML = renderQrPage()
    document.getElementById('qr-logout-btn')?.addEventListener('click', logout)
    startWaPoll(); return
  }
  app.innerHTML = renderShell()
  bindShell()
  renderPage()
}

// ── Login ────────────────────────────────────────────────────────────────────
function renderLoginPage() {
  return `
  <div class="login-page">
    <div class="login-logo">
      <div class="login-logo-icon">🎲</div>
      <h1>RPG Bot Admin</h1>
      <p>Painel de administração — CampanhaCyberpunk</p>
    </div>
    <div class="login-card">
      <div class="form-group">
        <label for="username">Usuário</label>
        <input id="username" type="text" placeholder="admin" autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">Senha</label>
        <input id="password" type="password" placeholder="••••••••" autocomplete="current-password">
      </div>
      <div id="login-error"></div>
      <button class="btn btn-primary" id="login-btn">Entrar</button>
    </div>
  </div>`
}

function bindLogin() {
  const btn = document.getElementById('login-btn')
  const err = document.getElementById('login-error')
  async function doLogin() {
    const username = document.getElementById('username').value.trim()
    const password = document.getElementById('password').value
    if (!username || !password) { err.innerHTML = '<div class="alert alert-error">Preencha usuário e senha</div>'; return }
    btn.disabled = true; btn.textContent = 'Entrando…'; err.innerHTML = ''
    try {
      const data = await api('POST', '/auth/login', { username, password })
      if (!data) return
      state.token = data.token; localStorage.setItem('token', data.token)
      await checkWaStatus(); render()
    } catch (e) {
      err.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`
      btn.disabled = false; btn.textContent = 'Entrar'
    }
  }
  btn.addEventListener('click', doLogin)
  document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })
}

// ── QR Page ──────────────────────────────────────────────────────────────────
function renderQrPage() {
  const isQr = state.waStatus === 'qr' && state.waQr
  const qrUrl = isQr ? 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=' + encodeURIComponent(state.waQr) : null
  const body = isQr
    ? `<img src="${qrUrl}" alt="QR Code WhatsApp" class="qr-image" width="260" height="260">
       <p class="qr-hint">Abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong></p>`
    : `<div class="loading-spinner"></div><p class="qr-hint">Aguardando WhatsApp…</p>`
  return `
  <div class="login-page">
    <div class="login-logo">
      <div class="login-logo-icon">📱</div>
      <h1>Conectar WhatsApp</h1>
      <p>${isQr ? 'Escaneie o QR Code para conectar' : 'Conectando ao WhatsApp…'}</p>
    </div>
    <div class="login-card" style="align-items:center;gap:1.5rem">${body}
      <button class="btn btn-ghost btn-sm" id="qr-logout-btn">Sair</button>
    </div>
  </div>`
}

// ── Shell ────────────────────────────────────────────────────────────────────
function renderShell() {
  const themeIcon = state.theme === 'dark' ? '☀️' : '🌙'
  const configActive = state.page === 'config' ? 'active' : ''
  const convActive = (state.page === 'conversations' || state.page === 'detail') ? 'active' : ''
  return `
  <header class="header">
    <div class="header-logo"><div class="header-logo-dot">🎲</div> RPG Bot Admin</div>
    <div class="header-actions">
      <button class="btn-icon" id="theme-btn" title="Alternar tema">${themeIcon}</button>
      <button class="btn-icon" id="logout-btn" title="Sair">🚪</button>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar">
      <button class="nav-item ${configActive}" data-page="config">⚙️ &nbsp;Configurações</button>
      <button class="nav-item ${convActive}"   data-page="conversations">💬 &nbsp;Conversas</button>
    </nav>
    <main class="content" id="page-content">
      <div class="loading"><div class="loading-spinner"></div></div>
    </main>
  </div>
  <nav class="bottom-nav">
    <button class="bottom-nav-item ${configActive}" data-page="config">
      <span class="nav-icon">⚙️</span><span class="nav-label">Config</span>
    </button>
    <button class="bottom-nav-item ${convActive}" data-page="conversations">
      <span class="nav-icon">💬</span><span class="nav-label">Conversas</span>
    </button>
  </nav>`
}

function bindShell() {
  document.getElementById('theme-btn').addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark')
    document.getElementById('theme-btn').textContent = state.theme === 'dark' ? '☀️' : '🌙'
  })
  document.getElementById('logout-btn').addEventListener('click', logout)
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      const page = el.getAttribute('data-page')
      state.page = page; state.convId = null; state.detail = null
      document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => {
        n.classList.toggle('active', n.getAttribute('data-page') === page || (page === 'detail' && n.getAttribute('data-page') === 'conversations'))
      })
      renderPage()
    })
  })
}

// ── Page Router ───────────────────────────────────────────────────────────────
async function renderPage() {
  const content = document.getElementById('page-content')
  if (!content) return
  content.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>'
  try {
    if (state.page === 'config') {
      state.cfg = await api('GET', '/config')
      content.innerHTML = renderConfigPage(); bindConfig()
    } else if (state.page === 'conversations') {
      state.convs = await api('GET', '/conversations')
      content.innerHTML = renderConversationsPage(); bindConversations()
    } else if (state.page === 'detail' && state.convId) {
      state.detail = await api('GET', `/conversations/${state.convId}`)
      content.innerHTML = renderDetailPage(); bindDetail()
    }
  } catch (e) {
    content.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`
  }
}

// ── Config Page ───────────────────────────────────────────────────────────────
function renderConfigPage() {
  const { prompt, context_data, triggers } = state.cfg
  const tags = triggers.map(t => `
    <button class="tag" data-id="${t.id}" title="Clique para remover">
      ${esc(t.keyword)} <span class="tag-remove">✕</span>
    </button>`).join('')
  const saveAlert = state.saveMsg ? `<div class="alert alert-${state.saveMsgType}">${esc(state.saveMsg)}</div>` : ''
  return `
  <div class="page-header"><h1>⚙️ Configurações</h1></div>
  ${saveAlert}
  <div class="card">
    <div class="card-title">🎭 Prompt do Mestre (IA)</div>
    <div class="form-group">
      <textarea id="cfg-prompt" rows="6">${esc(prompt)}</textarea>
    </div>
    <small>Instrui o comportamento narrativo do Claude como Mestre do RPG.</small>
  </div>
  <div class="card">
    <div class="card-title">🌆 Contexto da Campanha</div>
    <div class="form-group">
      <textarea id="cfg-context" rows="8">${esc(context_data)}</textarea>
    </div>
    <small>Informações da campanha injetadas no contexto de cada narração.</small>
  </div>
  <div class="card">
    <div class="card-title">🏷️ Palavras-gatilho</div>
    <p style="font-size:.875rem;color:var(--text-2);margin-bottom:.875rem">
      Comandos monitorados pelo bot. Clique em uma tag para removê-la.
    </p>
    <div class="tags-container" id="tags-container">${tags}</div>
    <div class="tag-input-row">
      <input id="new-trigger" type="text" placeholder="Novo comando…" maxlength="60">
      <button class="btn btn-ghost btn-sm" id="add-trigger-btn">+ Adicionar</button>
    </div>
  </div>
  <div class="save-bar">
    <button class="btn btn-primary btn-sm" id="save-btn" style="width:auto">💾 Salvar configurações</button>
  </div>`
}

function bindConfig() {
  document.getElementById('tags-container').addEventListener('click', async e => {
    const tag = e.target.closest('.tag')
    if (!tag) return
    try {
      await api('DELETE', `/config/triggers/${tag.dataset.id}`)
      tag.remove()
      state.cfg.triggers = state.cfg.triggers.filter(t => String(t.id) !== tag.dataset.id)
    } catch (err) { showSaveMsg('error', err.message) }
  })

  async function addTrigger() {
    const input = document.getElementById('new-trigger')
    const keyword = input.value.trim().toLowerCase()
    if (!keyword) return
    try {
      const created = await api('POST', '/config/triggers', { keyword })
      if (!created) return
      state.cfg.triggers.push(created)
      const btn = document.createElement('button')
      btn.className = 'tag'; btn.dataset.id = created.id; btn.title = 'Clique para remover'
      btn.innerHTML = `${esc(created.keyword)} <span class="tag-remove">✕</span>`
      document.getElementById('tags-container').appendChild(btn)
      input.value = ''
    } catch (err) { showSaveMsg('error', err.message) }
  }

  document.getElementById('add-trigger-btn').addEventListener('click', addTrigger)
  document.getElementById('new-trigger').addEventListener('keydown', e => { if (e.key === 'Enter') addTrigger() })

  document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn')
    btn.disabled = true; btn.textContent = 'Salvando…'
    try {
      await api('PUT', '/config', {
        prompt: document.getElementById('cfg-prompt').value,
        context_data: document.getElementById('cfg-context').value,
      })
      showSaveMsg('success', 'Configurações salvas com sucesso!')
    } catch (err) { showSaveMsg('error', err.message) }
    finally { btn.disabled = false; btn.innerHTML = '💾 Salvar configurações' }
  })
}

function showSaveMsg(type, msg) {
  state.saveMsg = msg; state.saveMsgType = type
  const alertHtml = `<div class="alert alert-${type}">${esc(msg)}</div>`
  const existing = document.querySelector('.alert')
  if (existing) existing.outerHTML = alertHtml
  else document.querySelector('.page-header').insertAdjacentHTML('afterend', alertHtml)
  setTimeout(() => { state.saveMsg = null; document.querySelector('.alert')?.remove() }, 3000)
}

// ── Conversations ─────────────────────────────────────────────────────────────
function renderConversationsPage() {
  const items = state.convs.map(c => {
    const num = formatJid(c.jid)
    const preview = c.last_message ? esc(c.last_message.slice(0, 60)) + (c.last_message.length > 60 ? '…' : '') : '<em>Sem mensagens</em>'
    return `
    <button class="conv-item" data-id="${c.id}">
      <div class="conv-avatar">${esc(getInitial(c.jid))}</div>
      <div class="conv-info">
        <div class="conv-name">${esc(num)}</div>
        <div class="conv-preview">${preview}</div>
      </div>
      <div class="conv-meta">
        <div class="conv-time">${formatDate(c.last_message_at)}</div>
        <span class="conv-count">${c.message_count}</span>
      </div>
    </button>`
  }).join('')
  return `
  <div class="page-header">
    <h1>💬 Conversas</h1>
    <button class="btn btn-ghost btn-sm" id="refresh-btn">↺ Atualizar</button>
  </div>
  ${state.convs.length === 0
    ? `<div class="empty"><div class="empty-icon">💬</div><p>Nenhuma conversa registrada ainda.</p></div>`
    : `<div class="conv-list">${items}</div>`
  }`
}

function bindConversations() {
  document.getElementById('refresh-btn')?.addEventListener('click', () => { state.page = 'conversations'; renderPage() })
  document.querySelectorAll('.conv-item').forEach(el => {
    el.addEventListener('click', () => { state.convId = el.dataset.id; state.page = 'detail'; renderPage() })
  })
}

// ── Detail ────────────────────────────────────────────────────────────────────
function renderDetailPage() {
  const { jid, started_at, messages } = state.detail
  const bubbles = messages.map(m => `
    <div class="bubble-wrapper ${m.role}">
      <div class="bubble ${m.role}">${esc(m.content)}</div>
      <span class="bubble-time">${m.role === 'user' ? '👤' : '🤖'} ${formatTime(m.sent_at)}</span>
    </div>`).join('')
  return `
  <button class="chat-back" id="back-btn">← Voltar</button>
  <div class="chat-contact">
    <div class="conv-avatar" style="width:40px;height:40px;font-size:1rem">${esc(getInitial(jid))}</div>
    <div>
      <div class="chat-contact-name">${esc(formatJid(jid))}</div>
      <div class="chat-contact-jid">Iniciado em ${formatDate(started_at)}</div>
    </div>
  </div>
  <div class="messages-list">
    ${messages.length === 0
      ? `<div class="empty"><div class="empty-icon">💬</div><p>Sem mensagens</p></div>`
      : bubbles
    }
  </div>`
}

function bindDetail() {
  document.getElementById('back-btn').addEventListener('click', () => {
    state.page = 'conversations'; state.convId = null; state.detail = null; renderPage()
  })
}

// ── Init ──────────────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
render()
