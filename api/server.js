require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { authMiddleware } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const configRoutes = require('./routes/config');
const conversationsRoutes = require('./routes/conversations');
const whatsappRoutes = require('./routes/whatsapp');

const PORT = parseInt(process.env.PORT || '3009', 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definida no arquivo .env');
}

async function startServer() {
  // Seed admin user
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log(`[API] Usuário admin criado. Senha: ${ADMIN_PASSWORD}`);
  }

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.use('/api/auth', authRoutes);
  app.use('/api/whatsapp', authMiddleware, whatsappRoutes);
  app.use('/api/config', authMiddleware, configRoutes);
  app.use('/api/conversations', authMiddleware, conversationsRoutes);

  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  app.listen(PORT, () => {
    console.log(`[API] Painel disponível em http://localhost:${PORT}`);
  });
}

module.exports = { startServer };
