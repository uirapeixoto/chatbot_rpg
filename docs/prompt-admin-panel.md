# Prompt: Painel de Administração para Chatbot WhatsApp

Use este prompt para recriar o frontend e backend de autenticação e gerenciamento de bot em um novo projeto semelhante.

---

## Contexto

Crie um **painel de administração PWA** (Progressive Web App) para um chatbot WhatsApp baseado em Node.js. O painel deve ser uma SPA vanilla JS servida pelo próprio Express, sem frameworks de frontend.

---

## Stack

- **Backend:** Node.js (ESM), Express, better-sqlite3, bcryptjs, jsonwebtoken
- **Frontend:** HTML + CSS + JavaScript vanilla (sem frameworks), servido como arquivos estáticos pelo Express
- **Banco:** SQLite via better-sqlite3

---

## Estrutura de arquivos esperada

```
├── app.js                    # Ponto de entrada
├── config/env.js             # Variáveis de ambiente com validação
├── db/database.js            # SQLite: schema, seed, instância global
├── api/
│   ├── server.js             # Express server + seed do admin
│   ├── middleware/auth.js    # Verificação JWT
│   └── routes/
│       ├── auth.js           # POST /api/auth/login
│       ├── whatsapp.js       # GET /api/whatsapp/status
│       ├── config.js         # GET/PUT /api/config, CRUD de triggers
│       └── conversations.js  # GET /api/conversations[/:id]
├── whatsapp/
│   └── state.js              # Estado compartilhado: { status, qr }
├── public/
│   ├── index.html
│   ├── app.js                # SPA vanilla JS
│   ├── styles.css
│   ├── manifest.json
│   └── sw.js
└── .env
```

---

## Banco de dados (`db/database.js`)

Crie as seguintes tabelas SQLite com `better-sqlite3`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  prompt TEXT NOT NULL DEFAULT '',
  product_description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT UNIQUE NOT NULL COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jid TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

Faça seed da tabela `config` com id=1 (registro único) e seed de `triggers` com palavras-chave padrão relevantes ao domínio do bot.

---

## Backend

### `config/env.js`

Leia e valide as variáveis de ambiente:
- `ANTHROPIC_API_KEY` (ou a chave da IA usada)
- `JWT_SECRET` (obrigatório, lance erro se ausente)
- `ADMIN_PASSWORD` (padrão: `admin123`)
- `PORT` (padrão: `3009`)

### `api/server.js`

- Na inicialização, faça seed do usuário `admin` com `bcrypt.hash(adminPassword, 10)` se não existir
- Configure Express com `express.json()` e `express.static` apontando para `public/`
- Registre as rotas:
  - `POST /api/auth/login` — pública
  - `GET /api/whatsapp/status` — protegida por JWT
  - `GET|PUT /api/config` e CRUD de `/api/config/triggers` — protegidas
  - `GET /api/conversations` e `GET /api/conversations/:id` — protegidas
- Adicione fallback SPA: `app.get('/{*path}', ...)` servindo `index.html`

### `api/middleware/auth.js`

Middleware JWT padrão: leia o header `Authorization: Bearer <token>`, verifique com `jwt.verify`, popule `req.user`, retorne 401 em caso de falha.

### `api/routes/auth.js`

`POST /api/auth/login` — recebe `{ username, password }`, valida com `bcrypt.compare`, retorna `{ token }` com expiração de 24h.

### `api/routes/config.js`

- `GET /` — retorna `{ prompt, product_description, triggers[] }`
- `PUT /` — atualiza `prompt` e `product_description`
- `POST /triggers` — insere nova keyword (lowercase, trim), retorna 409 se duplicada
- `DELETE /triggers/:id` — remove trigger por id

### `api/routes/whatsapp.js`

`GET /status` — retorna `{ status, qr }` lendo de `whatsapp/state.js`.

### `api/routes/conversations.js`

- `GET /` — lista conversas com `last_message` (último conteúdo) e `message_count`
- `GET /:id` — retorna conversa com array de `messages` ordenado por `sent_at`

### `whatsapp/state.js`

Objeto exportado compartilhado:
```js
export const waState = { status: 'connecting', qr: null }
```
O módulo de conexão WhatsApp atualiza este objeto conforme os eventos.

---

## Frontend (`public/`)

### `index.html`

HTML mínimo com `<div id="app"></div>`, link para `styles.css` e `<script src="app.js" type="module">`.

### `app.js` — SPA vanilla JS

Implemente um estado global simples (objeto JS) e uma função `render()` que troca o conteúdo de `#app` conforme o estado. O fluxo de telas é:

1. **Login** — se não há token no `localStorage`
2. **QR Code / Aguardando** — após login, enquanto `waStatus !== 'connected'`
3. **Painel principal** — quando conectado, com sidebar e navegação entre páginas

**Estado mínimo:**
```js
const state = {
  token: localStorage.getItem('token'),
  theme: localStorage.getItem('theme') || 'light',
  page: 'config',       // 'config' | 'conversations' | 'detail'
  convId: null,
  cfg: null,
  convs: [],
  detail: null,
  waStatus: null,       // 'connecting' | 'qr' | 'connected' | 'disconnected'
  waQr: null,
  _waPollTimer: null,
}
```

**Helper de API:**
```js
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
```

**Polling de status WhatsApp:**
- Inicie polling a cada 3 segundos chamando `GET /api/whatsapp/status`
- Quando `status === 'connected'`, pare o polling e renderize o painel principal
- Exiba o QR Code usando `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=<qr>`

**Telas a implementar:**

| Tela | Descrição |
|---|---|
| Login | Formulário usuário/senha, chama `POST /api/auth/login`, salva token no localStorage |
| QR Code | Exibe QR ou spinner enquanto aguarda conexão WhatsApp |
| Config | Textareas para prompt e descrição do produto, tags clicáveis para triggers com input para adicionar novas |
| Conversas | Lista de conversas com avatar, número formatado, preview da última mensagem e contagem |
| Detalhe | Histórico de mensagens em formato de chat (bolhas user/assistant) |

**Funcionalidades obrigatórias:**
- Toggle de tema claro/escuro (salvo no localStorage, aplicado via `data-theme` no `<html>`)
- Logout limpa token e para o polling
- Escape de HTML em todo conteúdo dinâmico (função `esc()`)
- Navegação mobile com bottom nav bar

### `styles.css`

Use variáveis CSS para tema claro/escuro via `[data-theme="dark"]`. Implemente:
- Layout com header fixo + sidebar + conteúdo principal
- Bottom nav para mobile (oculta sidebar em telas pequenas)
- Cards, botões, inputs, tags, bolhas de chat, spinner de loading
- Paleta neutra com cor de destaque (azul ou verde)

### `manifest.json` e `sw.js`

PWA básico: manifest com `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`. Service worker com cache básico dos assets estáticos.

---

## `.env` esperado

```env
ANTHROPIC_API_KEY=sk-ant-...   # ou a chave da IA usada
JWT_SECRET=string-aleatoria-longa
ADMIN_PASSWORD=admin123
PORT=3009
```

---

## Observações de adaptação

- Substitua referências a "imóvel/corretor" pelo domínio do novo bot
- O campo `product_description` pode ser renomeado para algo mais adequado (ex: `context_data`, `product_info`)
- Os seeds de `triggers` e `config` devem ser ajustados para o novo domínio
- O módulo de IA (`ai/`) e o cliente WhatsApp (`whatsapp/`) são independentes deste painel — apenas `whatsapp/state.js` é acoplado via leitura de status
- Para múltiplos usuários admin, expanda a tabela `users` e adicione rotas de gerenciamento
