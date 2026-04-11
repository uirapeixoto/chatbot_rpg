const { Router } = require('express');
const { db } = require('../../db/database');

const router = Router();

// Listar todas as campanhas
router.get('/', (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  res.json(campaigns);
});

// Criar campanha
router.post('/', (req, res) => {
  const { name, jid, theme, prompt, context_data } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  const cleanJid = jid?.trim() || null;
  if (cleanJid && !cleanJid.includes('@')) {
    return res.status(400).json({ error: 'JID inválido. Use o comando !jid no grupo WhatsApp para obter o ID correto (formato: 120363...@g.us)' });
  }
  try {
    const result = db.prepare(
      'INSERT INTO campaigns (name, jid, theme, prompt, context_data) VALUES (?, ?, ?, ?, ?)'
    ).run(name.trim(), cleanJid, theme ?? '', prompt ?? '', context_data ?? '');
    res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Este JID já está vinculado a outra campanha' });
    }
    throw err;
  }
});

// Obter campanha
router.get('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  res.json(campaign);
});

// Atualizar campanha
router.put('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
  const { name, jid, theme, prompt, context_data, active } = req.body ?? {};
  const cleanName = name?.trim() || campaign.name;
  const cleanJid = jid?.trim() || null;
  if (cleanJid && !cleanJid.includes('@')) {
    return res.status(400).json({ error: 'JID inválido. Use !jid no grupo para obter o formato correto (120363...@g.us)' });
  }
  try {
    db.prepare(`UPDATE campaigns SET name=?, jid=?, theme=?, prompt=?, context_data=?, active=? WHERE id=?`)
      .run(cleanName, cleanJid, theme ?? campaign.theme, prompt ?? campaign.prompt, context_data ?? campaign.context_data, active ?? campaign.active, req.params.id);
    res.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id));
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Este JID já está vinculado a outra campanha' });
    }
    throw err;
  }
});

// Excluir campanha
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Conversas de uma campanha
router.get('/:id/conversations', (req, res) => {
  const rows = db.prepare(`
    SELECT
      c.id, c.jid, c.campaign_id, c.started_at, c.last_message_at,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) AS message_count
    FROM conversations c
    WHERE c.campaign_id = ?
    ORDER BY c.last_message_at DESC
    LIMIT 200
  `).all(req.params.id);
  res.json(rows);
});

module.exports = router;
