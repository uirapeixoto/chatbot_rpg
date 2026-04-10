require('dotenv').config();
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { waState } = require('./state');

let reconnectDelay = 3000;
let _sock = null;

async function startWhatsApp(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState('.auth');
  const { version } = await fetchLatestBaileysVersion();

  console.log(`[WhatsApp] Usando versão WA: ${version.join('.')}`);

  const sock = makeWASocket({ auth: state, version, printQRInTerminal: false });
  _sock = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      waState.status = 'qr';
      waState.qr = qr;
      console.log('\n📱 Escaneie o QR code abaixo com o WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      waState.status = 'disconnected';
      waState.qr = null;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.warn(`[WhatsApp] Conexão encerrada. Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) {
        waState.status = 'connecting';
        setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          startWhatsApp(onMessage);
        }, reconnectDelay);
      }
    } else if (connection === 'open') {
      waState.status = 'connected';
      waState.qr = null;
      reconnectDelay = 3000;
      console.log('✅ Bot CampanhaCyberpunk conectado e pronto!');
      console.log('📡 Aguardando comandos no grupo...\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    await onMessage(sock, msg);
  });
}

function getSock() { return _sock; }

module.exports = { startWhatsApp, getSock };
