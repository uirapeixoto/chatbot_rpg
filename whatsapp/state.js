// Shared WhatsApp connection state — updated by bot.js, read by the API
const waState = {
  status: 'connecting', // 'connecting' | 'qr' | 'connected' | 'disconnected'
  qr: null,
};

module.exports = { waState };
