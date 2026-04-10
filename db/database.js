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

  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    prompt TEXT NOT NULL DEFAULT '',
    context_data TEXT NOT NULL DEFAULT '',
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
`);

const configExists = db.prepare('SELECT id FROM config WHERE id = 1').get();
if (!configExists) {
  db.prepare('INSERT INTO config (id, prompt, context_data) VALUES (1, ?, ?)').run(
    `Você é o Mestre de um RPG de mesa no estilo Cyberpunk, ambientado em Neon City no ano 2087. Narre os resultados das ações dos jogadores de forma imersiva e cinematográfica. Use tom noir/cyberpunk: sombrio, tenso, com detalhes sensoriais de neon, chuva ácida e metal.`,
    `Campanha: Infiltração no Armazém 9-Delta\nMegacorporação OmniTech domina Neon City.\nFixer: Zara "Espinho" Vasquez\nObjetivo: recuperar chip de dados comprometedores do CEO da OmniTech.\nPagamento: 80.000 créditos digitais.`
  );
}

const triggersCount = db.prepare('SELECT COUNT(*) as n FROM triggers').get();
if (triggersCount.n === 0) {
  const keywords = ['!acao', '!mestre', '!iniciar', '!turno', '!personagem', '!d20', '!status', '!ajuda'];
  const insert = db.prepare('INSERT OR IGNORE INTO triggers (keyword) VALUES (?)');
  for (const kw of keywords) insert.run(kw);
}

module.exports = { db };
