// ── State ───────────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('token'),
  theme: localStorage.getItem('theme') || 'light',
  page: 'campaigns',       // campaigns | campaign-form | conversations | detail
  campaigns: [],
  activeCampaign: null,    // campanha selecionada no sidebar
  editingCampaign: null,   // null = nova, object = editar
  convs: [],
  convId: null,
  detail: null,
  saveMsg: null,
  saveMsgType: null,
  waStatus: null,
  waQr: null,
  _waPollTimer: null,
  sidebarOpen: false,
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
  if (!jid) return '—'
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
function getInitial(str) {
  return (str || '?').replace(/@.*$/, '').replace(/:.*$/, '').slice(-2, -1) || '?'
}
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function showAlert(type, msg, containerSel) {
  state.saveMsg = msg; state.saveMsgType = type
  const html = `<div class="alert alert-${type}">${esc(msg)}</div>`
  const existing = document.querySelector('.alert')
  if (existing) existing.outerHTML = html
  else {
    const anchor = document.querySelector(containerSel || '.page-header')
    anchor?.insertAdjacentHTML('afterend', html)
  }
  setTimeout(() => { state.saveMsg = null; document.querySelector('.alert')?.remove() }, 3000)
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
  return `
  <header class="header">
    <button class="btn-icon sidebar-toggle" id="sidebar-toggle-btn" title="Menu">☰</button>
    <div class="header-logo"><div class="header-logo-dot">🎲</div> RPG Bot Admin</div>
    <div class="header-actions">
      <button class="btn-icon" id="theme-btn" title="Alternar tema">${themeIcon}</button>
      <button class="btn-icon" id="logout-btn" title="Sair">🚪</button>
    </div>
  </header>
  <div class="layout">
    <nav class="sidebar" id="sidebar">
      ${renderSidebarContent()}
    </nav>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <main class="content" id="page-content">
      <div class="loading"><div class="loading-spinner"></div></div>
    </main>
  </div>
  <nav class="bottom-nav">
    <button class="bottom-nav-item ${state.page === 'campaigns' || state.page === 'campaign-form' ? 'active' : ''}" data-page="campaigns">
      <span class="nav-icon">🗡️</span><span class="nav-label">Campanhas</span>
    </button>
    <button class="bottom-nav-item ${state.page === 'conversations' || state.page === 'detail' ? 'active' : ''}" data-page="conversations">
      <span class="nav-icon">💬</span><span class="nav-label">Conversas</span>
    </button>
    <button class="bottom-nav-item ${state.page === 'config' ? 'active' : ''}" data-page="config">
      <span class="nav-icon">⚙️</span><span class="nav-label">Config</span>
    </button>
  </nav>`
}

function renderSidebarContent() {
  const configActive = state.page === 'config' ? 'active' : ''
  const isConvPage = state.page === 'conversations' || state.page === 'detail'

  const campaignItems = state.campaigns.map(c => {
    const isSelected = state.activeCampaign?.id === c.id
    const convActive = isSelected && isConvPage ? 'active' : ''
    const campActive = isSelected && !isConvPage ? 'active' : ''
    return `
    <div class="sidebar-campaign-group">
      <button class="nav-item nav-campaign ${campActive}" data-campaign-id="${c.id}" data-page="campaigns">
        <span class="nav-campaign-dot" style="background:${campaignColor(c.id)}"></span>
        <span class="nav-campaign-name">${esc(c.name)}</span>
        ${c.active ? '' : '<span class="badge-inactive">inativa</span>'}
      </button>
      ${isSelected ? `
      <div class="nav-subitems">
        <button class="nav-item nav-subitem" data-page="campaign-form" data-campaign-id="${c.id}">
          ✏️ &nbsp;Configurações
        </button>
        <button class="nav-item nav-subitem ${convActive}" data-page="conversations" data-campaign-id="${c.id}">
          💬 &nbsp;Conversas
        </button>
      </div>` : ''}
    </div>`
  }).join('')

  return `
    <div class="sidebar-section-label">Campanhas</div>
    ${campaignItems}
    <button class="nav-item nav-new-campaign" id="new-campaign-btn">＋ &nbsp;Nova campanha</button>
    <div class="sidebar-divider"></div>
    <button class="nav-item ${configActive}" data-page="config">⚙️ &nbsp;Configurações gerais</button>`
}

function campaignColor(id) {
  const colors = ['#7c3aed','#0ea5e9','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4']
  return colors[(id - 1) % colors.length]
}

function bindShell() {
  document.getElementById('theme-btn').addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark')
    document.getElementById('theme-btn').textContent = state.theme === 'dark' ? '☀️' : '🌙'
  })
  document.getElementById('logout-btn').addEventListener('click', logout)

  // Sidebar toggle (mobile)
  const toggleBtn = document.getElementById('sidebar-toggle-btn')
  const overlay = document.getElementById('sidebar-overlay')
  const sidebar = document.getElementById('sidebar')
  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('visible') }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('visible') }
  toggleBtn.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar())
  overlay.addEventListener('click', closeSidebar)

  bindSidebarNav()
  bindBottomNav()
}

function bindSidebarNav() {
  // Clique em uma campanha: seleciona e vai para a lista de campanhas
  document.querySelectorAll('.nav-campaign').forEach(el => {
    el.addEventListener('click', async () => {
      const id = parseInt(el.dataset.campaignId)
      state.activeCampaign = state.campaigns.find(c => c.id === id) || null
      state.page = 'campaigns'
      state.convId = null; state.detail = null
      refreshSidebar()
      await renderPage()
    })
  })

  // Subitens (config da campanha, conversas)
  document.querySelectorAll('.nav-subitem').forEach(el => {
    el.addEventListener('click', async () => {
      const page = el.dataset.page
      state.page = page
      state.convId = null; state.detail = null
      refreshSidebar()
      await renderPage()
    })
  })

  // Nova campanha
  document.getElementById('new-campaign-btn')?.addEventListener('click', () => {
    state.editingCampaign = null
    state.page = 'campaign-form'
    state.activeCampaign = null
    refreshSidebar()
    renderPage()
  })

  // Config geral
  document.querySelector('.nav-item[data-page="config"]')?.addEventListener('click', () => {
    state.page = 'config'
    state.activeCampaign = null
    refreshSidebar()
    renderPage()
  })
}

function bindBottomNav() {
  document.querySelectorAll('.bottom-nav-item').forEach(el => {
    el.addEventListener('click', async () => {
      const page = el.dataset.page
      state.page = page
      state.convId = null; state.detail = null
      document.querySelectorAll('.bottom-nav-item').forEach(n =>
        n.classList.toggle('active', n.dataset.page === page || (page === 'detail' && n.dataset.page === 'conversations'))
      )
      await renderPage()
    })
  })
}

function refreshSidebar() {
  const sidebar = document.getElementById('sidebar')
  if (sidebar) sidebar.innerHTML = renderSidebarContent()
  bindSidebarNav()
}

// ── Page Router ───────────────────────────────────────────────────────────────
async function renderPage() {
  const content = document.getElementById('page-content')
  if (!content) return
  content.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>'
  try {
    if (state.page === 'campaigns') {
      if (state.activeCampaign) {
        // Mostra detalhes/resumo da campanha selecionada
        content.innerHTML = renderCampaignDetail(state.activeCampaign)
        bindCampaignDetail()
      } else {
        content.innerHTML = renderCampaignsPage()
        bindCampaignsPage()
      }
    } else if (state.page === 'campaign-form') {
      state.editingCampaign = state.activeCampaign
        ? await api('GET', `/campaigns/${state.activeCampaign.id}`)
        : null
      content.innerHTML = renderCampaignForm(state.editingCampaign)
      bindCampaignForm()
    } else if (state.page === 'conversations') {
      const campId = state.activeCampaign?.id
      state.convs = await api('GET', campId ? `/conversations?campaign_id=${campId}` : '/conversations')
      content.innerHTML = renderConversationsPage()
      bindConversations()
    } else if (state.page === 'detail' && state.convId) {
      state.detail = await api('GET', `/conversations/${state.convId}`)
      content.innerHTML = renderDetailPage()
      bindDetail()
    } else if (state.page === 'config') {
      const [cfg, cmds] = await Promise.all([api('GET', '/config'), api('GET', '/config/commands')])
      content.innerHTML = renderConfigPage(cfg, cmds)
      bindConfig(cfg, cmds)
    }
  } catch (e) {
    content.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`
  }
}

// ── Campaigns List Page ───────────────────────────────────────────────────────
function renderCampaignsPage() {
  if (state.campaigns.length === 0) {
    return `
    <div class="page-header"><h1>🗡️ Campanhas</h1></div>
    <div class="empty">
      <div class="empty-icon">🎲</div>
      <p>Nenhuma campanha cadastrada ainda.</p>
      <button class="btn btn-primary btn-sm" id="first-campaign-btn" style="width:auto;margin-top:.5rem">＋ Criar primeira campanha</button>
    </div>`
  }
  const cards = state.campaigns.map(c => `
    <button class="campaign-card" data-id="${c.id}">
      <div class="campaign-card-dot" style="background:${campaignColor(c.id)}"></div>
      <div class="campaign-card-info">
        <div class="campaign-card-name">${esc(c.name)}</div>
        <div class="campaign-card-theme">${esc(c.theme) || '<em style="opacity:.5">Sem tema</em>'}</div>
        ${c.jid ? `<div class="campaign-card-jid">📱 ${esc(formatJid(c.jid))}</div>` : ''}
      </div>
      <span class="campaign-card-status ${c.active ? 'active' : 'inactive'}">${c.active ? 'Ativa' : 'Inativa'}</span>
    </button>`).join('')

  return `
  <div class="page-header">
    <h1>🗡️ Campanhas</h1>
    <button class="btn btn-primary btn-sm" id="add-campaign-btn" style="width:auto">＋ Nova</button>
  </div>
  <div class="campaign-list">${cards}</div>`
}

function bindCampaignsPage() {
  document.getElementById('add-campaign-btn')?.addEventListener('click', () => {
    state.editingCampaign = null; state.activeCampaign = null; state.page = 'campaign-form'
    refreshSidebar(); renderPage()
  })
  document.getElementById('first-campaign-btn')?.addEventListener('click', () => {
    state.editingCampaign = null; state.activeCampaign = null; state.page = 'campaign-form'
    refreshSidebar(); renderPage()
  })
  document.querySelectorAll('.campaign-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id)
      state.activeCampaign = state.campaigns.find(c => c.id === id) || null
      state.page = 'campaigns'
      refreshSidebar(); renderPage()
    })
  })
}

// ── Campaign Detail (resumo após selecionar no sidebar) ───────────────────────
function renderCampaignDetail(c) {
  return `
  <div class="page-header">
    <div class="campaign-header-dot" style="background:${campaignColor(c.id)}"></div>
    <h1>${esc(c.name)}</h1>
    <button class="btn btn-ghost btn-sm" id="edit-campaign-btn" style="width:auto">✏️ Editar</button>
  </div>
  <div class="card">
    <div class="card-title">📋 Informações</div>
    ${c.theme ? `<p><strong>Tema:</strong> ${esc(c.theme)}</p>` : ''}
    ${c.jid ? `<p style="margin-top:.5rem"><strong>Grupo WhatsApp:</strong> ${esc(formatJid(c.jid))}</p><p style="font-size:.8rem;color:var(--text-2)">${esc(c.jid)}</p>` : '<p style="color:var(--text-2);font-size:.875rem">Nenhum grupo WhatsApp vinculado.</p>'}
    <p style="margin-top:.5rem"><strong>Status:</strong> <span class="campaign-card-status ${c.active ? 'active' : 'inactive'}">${c.active ? 'Ativa' : 'Inativa'}</span></p>
  </div>
  ${c.prompt ? `<div class="card"><div class="card-title">🎭 Prompt da IA</div><pre class="code-block">${esc(c.prompt)}</pre></div>` : ''}
  ${c.context_data ? `<div class="card"><div class="card-title">🌆 Contexto</div><pre class="code-block">${esc(c.context_data)}</pre></div>` : ''}
  <div style="display:flex;gap:.75rem;flex-wrap:wrap">
    <button class="btn btn-ghost btn-sm" id="view-convs-btn" style="width:auto">💬 Ver conversas</button>
    <button class="btn btn-danger btn-sm" id="delete-campaign-btn" style="width:auto">🗑️ Excluir campanha</button>
  </div>`
}

function bindCampaignDetail() {
  document.getElementById('edit-campaign-btn')?.addEventListener('click', () => {
    state.page = 'campaign-form'; refreshSidebar(); renderPage()
  })
  document.getElementById('view-convs-btn')?.addEventListener('click', () => {
    state.page = 'conversations'; refreshSidebar(); renderPage()
  })
  document.getElementById('delete-campaign-btn')?.addEventListener('click', async () => {
    if (!confirm(`Excluir a campanha "${state.activeCampaign.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api('DELETE', `/campaigns/${state.activeCampaign.id}`)
      state.campaigns = state.campaigns.filter(c => c.id !== state.activeCampaign.id)
      state.activeCampaign = null; state.page = 'campaigns'
      refreshSidebar(); renderPage()
    } catch (e) { showAlert('error', e.message) }
  })
}

// ── Campaign Form ─────────────────────────────────────────────────────────────
function renderCampaignForm(c) {
  const isEdit = !!c
  return `
  <div class="page-header">
    <button class="chat-back" id="back-btn">← Voltar</button>
    <h1>${isEdit ? '✏️ Editar campanha' : '＋ Nova campanha'}</h1>
  </div>
  <div class="card">
    <div class="card-title">📋 Identificação</div>
    <div class="form-group">
      <label for="camp-name">Nome da campanha *</label>
      <input id="camp-name" type="text" placeholder="Ex: Armazém 9-Delta" value="${esc(c?.name ?? '')}">
    </div>
    <div class="form-group">
      <label for="camp-theme">Tema / Gênero</label>
      <input id="camp-theme" type="text" placeholder="Ex: Cyberpunk, Medieval, Lovecraftiano…" value="${esc(c?.theme ?? '')}">
    </div>
    <div class="form-group">
      <label for="camp-jid">JID do grupo WhatsApp</label>
      <input id="camp-jid" type="text" placeholder="120363000000000000@g.us" value="${esc(c?.jid ?? '')}">
      <small>
        ID interno do grupo — <strong>não é o nome do grupo</strong>.<br>
        Digite <strong>!jid</strong> no grupo WhatsApp para obter o valor correto e cole aqui.<br>
        Formato esperado: <code>120363XXXXXXXXXX@g.us</code>
        ${c?.jid && !c.jid.includes('@') ? `<br><span style="color:var(--danger,#ef4444)">⚠️ O valor atual (<em>${esc(c.jid)}</em>) não parece um JID válido. Use !jid no grupo para corrigir.</span>` : ''}
      </small>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:.75rem">
      <input id="camp-active" type="checkbox" style="width:auto" ${c?.active !== 0 ? 'checked' : ''}>
      <label for="camp-active" style="text-transform:none;letter-spacing:0;font-size:.9375rem">Campanha ativa</label>
    </div>
  </div>
  <div class="card">
    <div class="card-title">🎭 Prompt da IA</div>
    <div class="form-group">
      <textarea id="camp-prompt" rows="6" placeholder="Instrui o comportamento narrativo do Claude como Mestre do RPG…">${esc(c?.prompt ?? '')}</textarea>
    </div>
    <small>Deixe em branco para usar as configurações globais.</small>
  </div>
  <div class="card">
    <div class="card-title">🌆 Contexto da campanha</div>
    <div class="form-group">
      <textarea id="camp-context" rows="8" placeholder="Descreva o cenário, facções, missão, NPCs importantes…">${esc(c?.context_data ?? '')}</textarea>
    </div>
  </div>
  <div class="save-bar">
    <button class="btn btn-ghost btn-sm" id="cancel-form-btn" style="width:auto">Cancelar</button>
    <button class="btn btn-primary btn-sm" id="save-campaign-btn" style="width:auto">💾 ${isEdit ? 'Salvar alterações' : 'Criar campanha'}</button>
  </div>`
}

function bindCampaignForm() {
  const isEdit = !!state.editingCampaign
  document.getElementById('back-btn')?.addEventListener('click', () => {
    state.page = state.activeCampaign ? 'campaigns' : 'campaigns'
    refreshSidebar(); renderPage()
  })
  document.getElementById('cancel-form-btn')?.addEventListener('click', () => {
    state.page = 'campaigns'; refreshSidebar(); renderPage()
  })
  document.getElementById('save-campaign-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('save-campaign-btn')
    const payload = {
      name: document.getElementById('camp-name').value.trim(),
      theme: document.getElementById('camp-theme').value.trim(),
      jid: document.getElementById('camp-jid').value.trim() || null,
      prompt: document.getElementById('camp-prompt').value,
      context_data: document.getElementById('camp-context').value,
      active: document.getElementById('camp-active').checked ? 1 : 0,
    }
    if (!payload.name) { showAlert('error', 'Nome da campanha é obrigatório'); return }
    btn.disabled = true; btn.textContent = 'Salvando…'
    try {
      let saved
      if (isEdit) {
        saved = await api('PUT', `/campaigns/${state.editingCampaign.id}`, payload)
        state.campaigns = state.campaigns.map(c => c.id === saved.id ? saved : c)
        state.activeCampaign = saved
      } else {
        saved = await api('POST', '/campaigns', payload)
        state.campaigns.unshift(saved)
        state.activeCampaign = saved
      }
      state.page = 'campaigns'
      refreshSidebar(); renderPage()
    } catch (e) {
      showAlert('error', e.message)
      btn.disabled = false; btn.textContent = isEdit ? '💾 Salvar alterações' : '💾 Criar campanha'
    }
  })
}

// ── Config Page (global) ──────────────────────────────────────────────────────
function renderConfigPage(cfg, cmds = []) {
  const { prompt, context_data, jid, active, triggers } = cfg
  const tags = triggers.map(t => `
    <button class="tag" data-id="${t.id}" title="Clique para remover">
      ${esc(t.keyword)} <span class="tag-remove">✕</span>
    </button>`).join('')

  const cmdRows = cmds.map(c => `
    <tr>
      <td><code>${esc(c.keyword)}</code></td>
      <td>${esc(c.description)}</td>
      <td style="text-align:right">
        <button class="btn btn-ghost btn-sm cmd-delete" data-id="${c.id}">🗑️</button>
      </td>
    </tr>`).join('')

  return `
  <div class="page-header"><h1>⚙️ Configurações globais</h1></div>
  <div class="card">
    <div class="card-title">📋 Identificação</div>
    <div class="form-group">
      <label for="cfg-jid">JID do grupo WhatsApp</label>
      <input id="cfg-jid" type="text" placeholder="120363000000000000@g.us" value="${esc(jid ?? '')}">
      <small>ID interno do grupo padrão (Cyberpunk). Use <strong>!jid</strong> no grupo para obter o valor correto.</small>
    </div>
    <div class="form-group" style="flex-direction:row;align-items:center;gap:.75rem">
      <input id="cfg-active" type="checkbox" style="width:auto" ${active !== 0 ? 'checked' : ''}>
      <label for="cfg-active" style="text-transform:none;letter-spacing:0;font-size:.9375rem">Configuração ativa</label>
    </div>
    ${jid ? `<p style="margin-top:.25rem;font-size:.8rem;color:var(--text-2)">
      <strong>Grupo vinculado:</strong> ${esc(formatJid(jid))}
      &nbsp;<span class="campaign-card-status ${active !== 0 ? 'active' : 'inactive'}">${active !== 0 ? 'Ativa' : 'Inativa'}</span>
    </p>` : ''}
  </div>
  <div class="card">
    <div class="card-title">🎭 Prompt padrão do Mestre (IA)</div>
    <div class="form-group">
      <textarea id="cfg-prompt" rows="6">${esc(prompt)}</textarea>
    </div>
    <small>Usado quando a campanha não tem prompt próprio.</small>
  </div>
  <div class="card">
    <div class="card-title">🌆 Contexto padrão</div>
    <div class="form-group">
      <textarea id="cfg-context" rows="8">${esc(context_data)}</textarea>
    </div>
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
  </div>

  <div class="card" style="margin-top:1rem">
    <div class="card-title">⚡ Comandos customizados</div>
    <p style="font-size:.875rem;color:var(--text-2);margin-bottom:.875rem">
      Crie comandos personalizados com IA. Use <code>{{text}}</code> no prompt para inserir o texto digitado após o comando.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:.875rem">
      <thead><tr style="color:var(--text-2)"><th style="text-align:left;padding:.4rem 0">Comando</th><th style="text-align:left">Descrição</th><th></th></tr></thead>
      <tbody id="cmd-table">${cmdRows}</tbody>
    </table>
    <details style="margin-top:1rem">
      <summary style="cursor:pointer;font-size:.875rem;color:var(--accent)">+ Novo comando</summary>
      <div style="margin-top:.75rem;display:flex;flex-direction:column;gap:.5rem">
        <input id="new-cmd-keyword" type="text" placeholder="!translateenpt">
        <input id="new-cmd-desc" type="text" placeholder="Descrição (ex: Traduz inglês → português)">
        <textarea id="new-cmd-prompt" rows="3" placeholder="Prompt da IA. Use {{text}} para o conteúdo digitado pelo usuário."></textarea>
        <button class="btn btn-ghost btn-sm" id="add-cmd-btn">+ Criar comando</button>
      </div>
    </details>
  </div>`
}

function bindConfig(_cfg, _cmds) {
  document.getElementById('tags-container').addEventListener('click', async e => {
    const tag = e.target.closest('.tag')
    if (!tag) return
    try {
      await api('DELETE', `/config/triggers/${tag.dataset.id}`)
      tag.remove()
    } catch (err) { showAlert('error', err.message) }
  })

  async function addTrigger() {
    const input = document.getElementById('new-trigger')
    const keyword = input.value.trim().toLowerCase()
    if (!keyword) return
    try {
      const created = await api('POST', '/config/triggers', { keyword })
      if (!created) return
      const btn2 = document.createElement('button')
      btn2.className = 'tag'; btn2.dataset.id = created.id; btn2.title = 'Clique para remover'
      btn2.innerHTML = `${esc(created.keyword)} <span class="tag-remove">✕</span>`
      document.getElementById('tags-container').appendChild(btn2)
      input.value = ''
    } catch (err) { showAlert('error', err.message) }
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
        jid: document.getElementById('cfg-jid').value.trim() || null,
        active: document.getElementById('cfg-active').checked ? 1 : 0,
      })
      showAlert('success', 'Configurações salvas com sucesso!')
    } catch (err) { showAlert('error', err.message) }
    finally { btn.disabled = false; btn.innerHTML = '💾 Salvar configurações' }
  })

  // Custom commands
  document.getElementById('cmd-table')?.addEventListener('click', async e => {
    const btn = e.target.closest('.cmd-delete')
    if (!btn) return
    try {
      await api('DELETE', `/config/commands/${btn.dataset.id}`)
      btn.closest('tr').remove()
    } catch (err) { showAlert('error', err.message) }
  })

  document.getElementById('add-cmd-btn')?.addEventListener('click', async () => {
    const keyword = document.getElementById('new-cmd-keyword').value.trim().toLowerCase()
    const description = document.getElementById('new-cmd-desc').value.trim()
    const action_prompt = document.getElementById('new-cmd-prompt').value.trim()
    if (!keyword || !action_prompt) { showAlert('error', 'Keyword e prompt são obrigatórios'); return }
    try {
      const created = await api('POST', '/config/commands', { keyword, description, action_prompt })
      if (!created) return
      const tr = document.createElement('tr')
      tr.innerHTML = `<td><code>${esc(created.keyword)}</code></td><td>${esc(description)}</td><td style="text-align:right"><button class="btn btn-ghost btn-sm cmd-delete" data-id="${created.id}">🗑️</button></td>`
      document.getElementById('cmd-table').appendChild(tr)
      document.getElementById('new-cmd-keyword').value = ''
      document.getElementById('new-cmd-desc').value = ''
      document.getElementById('new-cmd-prompt').value = ''
      showAlert('success', `Comando ${keyword} criado!`)
    } catch (err) { showAlert('error', err.message) }
  })
}

// ── Conversations ─────────────────────────────────────────────────────────────
function renderConversationsPage() {
  const title = state.activeCampaign ? `💬 Conversas — ${esc(state.activeCampaign.name)}` : '💬 Todas as conversas'
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
    <h1>${title}</h1>
    <button class="btn btn-ghost btn-sm" id="refresh-btn">↺ Atualizar</button>
  </div>
  ${state.convs.length === 0
    ? `<div class="empty"><div class="empty-icon">💬</div><p>Nenhuma conversa registrada ainda.</p></div>`
    : `<div class="conv-list">${items}</div>`
  }`
}

function bindConversations() {
  document.getElementById('refresh-btn')?.addEventListener('click', () => renderPage())
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
async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
  if (state.token) {
    await checkWaStatus()
    if (state.waStatus === 'connected') {
      state.campaigns = await api('GET', '/campaigns') || []
    }
  }
  render()
}

init()
