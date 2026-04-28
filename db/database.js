require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/rpg.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS dc_rules (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern  TEXT    NOT NULL,
    dc       INTEGER NOT NULL CHECK (dc BETWEEN 1 AND 20),
    label    TEXT    NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    jid TEXT UNIQUE,
    theme TEXT NOT NULL DEFAULT '',
    prompt TEXT NOT NULL DEFAULT '',
    context_data TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    max_players INTEGER NOT NULL DEFAULT 6,
    max_turns INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS triggers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL COLLATE NOCASE
  );

  CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    action_prompt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT NOT NULL,
    campaign_id INTEGER REFERENCES campaigns(id),
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
`);

// Migrações (colunas adicionadas em versões posteriores)
try { db.exec('ALTER TABLE conversations ADD COLUMN campaign_id INTEGER REFERENCES campaigns(id)'); } catch (_) {}
try { db.exec('ALTER TABLE campaigns ADD COLUMN max_players INTEGER NOT NULL DEFAULT 6'); } catch (_) {}
try { db.exec('ALTER TABLE campaigns ADD COLUMN max_turns INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
try { db.exec(`CREATE TABLE IF NOT EXISTS custom_commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  action_prompt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`); } catch (_) {}
try { db.exec(`CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT NOT NULL DEFAULT ''
)`); } catch (_) {}
try { db.exec(`CREATE TABLE IF NOT EXISTS dc_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL, dc INTEGER NOT NULL CHECK (dc BETWEEN 1 AND 20),
  label TEXT NOT NULL DEFAULT '', priority INTEGER NOT NULL DEFAULT 0
)`); } catch (_) {}

// Corrige JIDs inválidos (sem @) que possam ter sido inseridos por seed incorreto
db.prepare("UPDATE campaigns SET jid = NULL WHERE jid IS NOT NULL AND jid NOT LIKE '%@%'").run();

const configExists = db.prepare("SELECT id FROM campaigns WHERE name = 'CampanhaCyberpunk'").get();
if (!configExists) {
  db.prepare(`INSERT INTO campaigns (name, jid, theme, prompt, context_data, active) VALUES (?, ?, ?, ?, ?, 1)`)
    .run(
      'CampanhaCyberpunk',
      null,
      'Cyberpunk / Neon City 2087',
      `Você é o Mestre de um RPG de mesa no estilo Cyberpunk, ambientado em Neon City no ano 2087. Narre os resultados das ações dos jogadores de forma imersiva e cinematográfica. Use tom noir/cyberpunk: sombrio, tenso, com detalhes sensoriais de neon, chuva ácida e metal. Respostas curtas e impactantes (2-4 linhas). Nunca mate um jogador permanentemente. Responda APENAS com a narração.`,
      `Campanha: Infiltração no Armazém 9-Delta\nMegacorporação OmniTech domina Neon City.\nFixer: Zara "Espinho" Vasquez\nObjetivo: recuperar chip de dados comprometedores do CEO da OmniTech.\nPagamento: 80.000 créditos digitais.`
    );
}

const medievalExists = db.prepare("SELECT id FROM campaigns WHERE name = 'CampanhaMedieval'").get();
if (!medievalExists) {
  db.prepare(`INSERT INTO campaigns (name, jid, theme, prompt, context_data, active) VALUES (?, ?, ?, ?, ?, 1)`)
    .run(
      'CampanhaMedieval',
      null,
      'Medieval / J.R.R. Tolkien',
      `Você é o Mestre de um RPG de mesa no estilo épico medieval tolkieniano, ambientado em Eriador na Terceira Era. Narre os resultados das ações dos jogadores de forma imersiva e épica. Use tom tolkieniano: grandioso, poético, com detalhes sensoriais de pedra ancestral, luz de tocha e o peso do destino. Descreva heróis comuns diante de forças maiores que si mesmos.`,
      `Campanha: O Fragmento de Anar\nMago Errante: Mirathas o Cinzento\nObjetivo: recuperar o Fragmento de Anar, gema de luz ancestral, das Ruínas de Khazad-Tor antes que os servos das trevas a tomem.\nRecompensa: gratidão dos Povos Livres e um artefato de proteção.\nAmeaça: Korthul o Cavaleiro Pálido lidera os servos do Senhor das Sombras.\nAté 4 jogadores, sessão curta de 4 turnos.`
    );
}

const triggersCount = db.prepare('SELECT COUNT(*) as n FROM triggers').get();
if (triggersCount.n === 0) {
  const keywords = ['!acao', '!mestre', '!iniciar', '!turno', '!personagem', '!d20', '!status', '!ajuda'];
  const insert = db.prepare('INSERT OR IGNORE INTO triggers (keyword) VALUES (?)');
  for (const kw of keywords) insert.run(kw);
}

// Seed settings globais
const settingInsert = db.prepare('INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)');
settingInsert.run('claude_model',      'claude-haiku-4-5-20251001', 'Modelo Claude usado nas narrações');
settingInsert.run('claude_max_tokens', '400',  'Máximo de tokens por resposta de narração');
settingInsert.run('claude_action_max_tokens', '300', 'Máximo de tokens por narração de ação');
settingInsert.run('default_dc',        '12',   'DC padrão quando nenhuma regra bate');

// Seed dc_rules (regras de dificuldade por padrão de texto)
const dcRulesCount = db.prepare('SELECT COUNT(*) as n FROM dc_rules').get();
if (dcRulesCount.n === 0) {
  const dcInsert = db.prepare('INSERT INTO dc_rules (pattern, dc, label, priority) VALUES (?, ?, ?, ?)');
  dcInsert.run('atirar|disparar|atacar|golpear|cortar|esfaquear|espada|flecha|arco|ferir|lutar', 13, 'Combate', 10);
  dcInsert.run('esconder|infiltrar|furtivo|silencioso|ocultar|esgueirar', 14, 'Furtividade', 10);
  dcInsert.run('hackear|invadir|sistema|terminal|dados|encrypt|magia|encantamento|runa|feitiço|arcano|canalizar', 15, 'Hacking/Magia', 10);
  dcInsert.run('observar|perceber|notar|ouvir|escutar|detectar|procurar', 11, 'Percepção', 10);
  dcInsert.run('convencer|negociar|blefar|enganar|persuadir', 12, 'Social', 10);
  dcInsert.run('correr|pular|escalar|fugir|empurrar', 12, 'Atletismo', 10);
  dcInsert.run('curar|tratar|estabilizar|medikit|ervas|bandagem', 14, 'Medicina', 10);
}

// Seed comandos customizados de exemplo
const cmdInsert = db.prepare('INSERT OR IGNORE INTO custom_commands (keyword, description, action_prompt) VALUES (?, ?, ?)');
cmdInsert.run('!translateenpt', 'Traduz inglês → português', 'Traduza o texto a seguir do inglês para o português brasileiro. Responda APENAS com a tradução, sem explicações:\n\n{{text}}');
cmdInsert.run('!translatepten', 'Traduz português → inglês', 'Translate the following text from Brazilian Portuguese to English. Respond ONLY with the translation, no explanations:\n\n{{text}}');

module.exports = { db };
