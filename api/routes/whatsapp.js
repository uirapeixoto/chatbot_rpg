const { Router } = require('express');
const { waState } = require('../../whatsapp/state');

const router = Router();

router.get('/status', (req, res) => {
  res.json({ status: waState.status, qr: waState.qr ?? null });
});

module.exports = router;
