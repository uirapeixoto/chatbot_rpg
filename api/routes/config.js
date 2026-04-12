const { Router } = require('express');
const { db } = require('../../db/database');

const router = Router();

// ── Campaigns ────────────────────────────────────────────────────────────────
router.get('/campaigns', (req, res) => {
  res.json(db.prepare('SELECT * FROM campaigns ORDER BY id').all());
});

router.post('/campaigns', (req, res) => {
  const { name, jid, theme, prompt, context_data } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  try {
    const result = db.prepare(
      'INSERT INTO campaigns (name, jid, theme, prompt, context_data) VALUES (?, ?, ?, ?, ?)'
    ).run(name, jid?.trim() || null, theme ?? '', prompt ?? '', context_data ?? '');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch {
    res.status(409).json({ error: 'JID já vinculado a outra campanha' });
  }
});

router.put('/campaigns/:id', (req, res) => {
  const { name, jid, theme, prompt, context_data, active } = req.body ?? {};
  db.prepare(
    'UPDATE campaigns SET name=?, jid=?, theme=?, prompt=?, context_data=?, active=? WHERE id=?'
  ).run(name ?? '', jid?.trim() || null, theme ?? '', prompt ?? '', context_data ?? '', active ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/campaigns/:id', (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Custom Commands ───────────────────────────────────────────────────────────
router.get('/commands', (req, res) => {
  res.json(db.prepare('SELECT * FROM custom_commands ORDER BY keyword').all());
});

router.post('/commands', (req, res) => {
  const { keyword, description, action_prompt } = req.body ?? {};
  if (!keyword?.trim() || !action_prompt?.trim()) return res.status(400).json({ error: 'keyword e action_prompt obrigatórios' });
  try {
    const result = db.prepare('INSERT INTO custom_commands (keyword, description, action_prompt) VALUES (?, ?, ?)').run(keyword.trim().toLowerCase(), description ?? '', action_prompt.trim());
    res.status(201).json({ id: result.lastInsertRowid, keyword: keyword.trim().toLowerCase() });
  } catch {
    res.status(409).json({ error: 'Keyword já existe' });
  }
});

router.put('/commands/:id', (req, res) => {
  const { keyword, description, action_prompt } = req.body ?? {};
  db.prepare('UPDATE custom_commands SET keyword=?, description=?, action_prompt=? WHERE id=?')
    .run(keyword?.trim().toLowerCase() ?? '', description ?? '', action_prompt ?? '', req.params.id);
  res.json({ ok: true });
});

router.delete('/commands/:id', (req, res) => {
  db.prepare('DELETE FROM custom_commands WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Triggers ─────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({ triggers: db.prepare('SELECT id, keyword FROM triggers ORDER BY keyword COLLATE NOCASE').all() });
});

router.post('/triggers', (req, res) => {
  const keyword = req.body?.keyword?.trim().toLowerCase();
  if (!keyword) return res.status(400).json({ error: 'Keyword obrigatória' });
  try {
    const result = db.prepare('INSERT INTO triggers (keyword) VALUES (?)').run(keyword);
    res.status(201).json({ id: result.lastInsertRowid, keyword });
  } catch {
    res.status(409).json({ error: 'Keyword já existe' });
  }
});

router.delete('/triggers/:id', (req, res) => {
  db.prepare('DELETE FROM triggers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
