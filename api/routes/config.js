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
