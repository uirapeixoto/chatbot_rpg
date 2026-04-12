-- ============================================================
-- Bot RPG WhatsApp — Schema SQLite
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- ── Campaigns ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    jid          TEXT    UNIQUE,
    theme        TEXT    NOT NULL DEFAULT '',
    prompt       TEXT    NOT NULL DEFAULT '',
    context_data TEXT    NOT NULL DEFAULT '',
    active       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Triggers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS triggers (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL COLLATE NOCASE
);

-- ── Custom Commands ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_commands (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword       TEXT UNIQUE NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    action_prompt TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    jid             TEXT    NOT NULL,
    campaign_id     INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    started_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    last_message_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role            TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT    NOT NULL,
    sent_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- ── Índices ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_campaign ON conversations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversations_jid      ON conversations(jid);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at       ON messages(sent_at);

-- ============================================================
-- Dados iniciais (seed)
-- ============================================================

-- Admin (senha: admin123 — troque em produção)
INSERT OR IGNORE INTO users (username, password_hash)
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Campanhas padrão
INSERT OR IGNORE INTO campaigns (name, jid, theme, prompt, context_data, active) VALUES
(
    'CampanhaCyberpunk',
    NULL,
    'Cyberpunk / Neon City 2087',
    'Você é o Mestre de um RPG de mesa no estilo Cyberpunk, ambientado em Neon City no ano 2087. Narre os resultados das ações dos jogadores de forma imersiva e cinematográfica. Use tom noir/cyberpunk: sombrio, tenso, com detalhes sensoriais de neon, chuva ácida e metal. Respostas curtas e impactantes (2-4 linhas). Nunca mate um jogador permanentemente. Responda APENAS com a narração.',
    'Campanha: Infiltração no Armazém 9-Delta' || char(10) ||
    'Megacorporação OmniTech domina Neon City.' || char(10) ||
    'Fixer: Zara "Espinho" Vasquez' || char(10) ||
    'Objetivo: recuperar chip de dados comprometedores do CEO da OmniTech.' || char(10) ||
    'Pagamento: 80.000 créditos digitais.',
    1
),
(
    'CampanhaMedieval',
    NULL,
    'Medieval / J.R.R. Tolkien',
    'Você é o Mestre de um RPG de mesa no estilo épico medieval tolkieniano, ambientado em Eriador na Terceira Era. Narre os resultados das ações dos jogadores de forma imersiva e épica. Use tom tolkieniano: grandioso, poético, com detalhes sensoriais de pedra ancestral, luz de tocha e o peso do destino.',
    'Campanha: O Fragmento de Anar' || char(10) ||
    'Mago Errante: Mirathas o Cinzento' || char(10) ||
    'Objetivo: recuperar o Fragmento de Anar das Ruínas de Khazad-Tor.' || char(10) ||
    'Ameaça: Korthul o Cavaleiro Pálido.',
    1
);

-- Triggers padrão
INSERT OR IGNORE INTO triggers (keyword) VALUES
    ('!acao'), ('!mestre'), ('!iniciar'), ('!turno'),
    ('!personagem'), ('!d20'), ('!status'), ('!ajuda');

-- Comandos customizados de exemplo
INSERT OR IGNORE INTO custom_commands (keyword, description, action_prompt) VALUES
(
    '!translateenpt',
    'Traduz inglês → português',
    'Traduza o texto a seguir do inglês para o português brasileiro. Responda APENAS com a tradução, sem explicações:' || char(10) || char(10) || '{{text}}'
),
(
    '!translatepten',
    'Traduz português → inglês',
    'Translate the following text from Brazilian Portuguese to English. Respond ONLY with the translation, no explanations:' || char(10) || char(10) || '{{text}}'
);
