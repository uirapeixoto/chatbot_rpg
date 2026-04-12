-- ============================================================
-- Bot RPG WhatsApp — Schema PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- ── Campaigns ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    jid          VARCHAR(100) UNIQUE,
    theme        VARCHAR(200) NOT NULL DEFAULT '',
    prompt       TEXT         NOT NULL DEFAULT '',
    context_data TEXT         NOT NULL DEFAULT '',
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Triggers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS triggers (
    id      SERIAL PRIMARY KEY,
    keyword CITEXT UNIQUE NOT NULL
);

-- ── Custom Commands ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_commands (
    id            SERIAL PRIMARY KEY,
    keyword       VARCHAR(100) UNIQUE NOT NULL,
    description   VARCHAR(300) NOT NULL DEFAULT '',
    action_prompt TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Conversations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id              SERIAL PRIMARY KEY,
    jid             VARCHAR(100) NOT NULL,
    campaign_id     INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT        NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
INSERT INTO users (username, password_hash)
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (username) DO NOTHING;

-- Campanhas padrão
INSERT INTO campaigns (name, jid, theme, prompt, context_data, active) VALUES
(
    'CampanhaCyberpunk',
    NULL,
    'Cyberpunk / Neon City 2087',
    'Você é o Mestre de um RPG de mesa no estilo Cyberpunk, ambientado em Neon City no ano 2087. Narre os resultados das ações dos jogadores de forma imersiva e cinematográfica. Use tom noir/cyberpunk: sombrio, tenso, com detalhes sensoriais de neon, chuva ácida e metal. Respostas curtas e impactantes (2-4 linhas). Nunca mate um jogador permanentemente. Responda APENAS com a narração.',
    E'Campanha: Infiltração no Armazém 9-Delta\nMegacorporação OmniTech domina Neon City.\nFixer: Zara "Espinho" Vasquez\nObjetivo: recuperar chip de dados comprometedores do CEO da OmniTech.\nPagamento: 80.000 créditos digitais.',
    TRUE
),
(
    'CampanhaMedieval',
    NULL,
    'Medieval / J.R.R. Tolkien',
    'Você é o Mestre de um RPG de mesa no estilo épico medieval tolkieniano, ambientado em Eriador na Terceira Era. Narre os resultados das ações dos jogadores de forma imersiva e épica. Use tom tolkieniano: grandioso, poético, com detalhes sensoriais de pedra ancestral, luz de tocha e o peso do destino.',
    E'Campanha: O Fragmento de Anar\nMago Errante: Mirathas o Cinzento\nObjetivo: recuperar o Fragmento de Anar das Ruínas de Khazad-Tor.\nAmeaça: Korthul o Cavaleiro Pálido.',
    TRUE
)
ON CONFLICT (name) DO NOTHING;

-- Triggers padrão
INSERT INTO triggers (keyword) VALUES
    ('!acao'), ('!mestre'), ('!iniciar'), ('!turno'),
    ('!personagem'), ('!d20'), ('!status'), ('!ajuda')
ON CONFLICT (keyword) DO NOTHING;

-- Comandos customizados de exemplo
INSERT INTO custom_commands (keyword, description, action_prompt) VALUES
(
    '!translateenpt',
    'Traduz inglês → português',
    E'Traduza o texto a seguir do inglês para o português brasileiro. Responda APENAS com a tradução, sem explicações:\n\n{{text}}'
),
(
    '!translatepten',
    'Traduz português → inglês',
    E'Translate the following text from Brazilian Portuguese to English. Respond ONLY with the translation, no explanations:\n\n{{text}}'
)
ON CONFLICT (keyword) DO NOTHING;
