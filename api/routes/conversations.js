const { Router } = require('express');
const { db } = require('../../db/database');

const router = Router();

router.get('/', (req, res) => {
  const { campaign_id } = req.query;
  const where = campaign_id ? 'WHERE c.campaign_id = ?' : '';
  const rows = db.prepare(`
    SELECT
      c.id, c.jid, c.campaign_id, c.started_at, c.last_message_at,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) AS message_count
    FROM conversations c
    ${where}
    ORDER BY c.last_message_at DESC
    LIMIT 200
  `).all(...(campaign_id ? [campaign_id] : []));
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });
  const messages = db.prepare(`
    SELECT role, content, sent_at FROM messages
    WHERE conversation_id = ? ORDER BY id
  `).all(req.params.id);
  res.json({ ...conv, messages });
});

module.exports = router;
