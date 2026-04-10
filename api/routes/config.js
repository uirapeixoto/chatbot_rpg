const { Router } = require('express');
const { db } = require('../../db/database');

const router = Router();

router.get('/', (req, res) => {
  const cfg = db.prepare('SELECT prompt, context_data FROM config WHERE id = 1').get();
  const triggers = db.prepare('SELECT id, keyword FROM triggers ORDER BY keyword COLLATE NOCASE').all();
  res.json({ ...cfg, triggers });
});

router.put('/', (req, res) => {
  const { prompt, context_data } = req.body ?? {};
  db.prepare(`UPDATE config SET prompt = ?, context_data = ?, updated_at = datetime('now') WHERE id = 1`)
    .run(prompt ?? '', context_data ?? '');
  res.json({ ok: true });
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
