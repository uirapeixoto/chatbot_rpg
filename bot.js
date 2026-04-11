require('dotenv').config();
const GameManager = require('./gameManager');
const { rollD20, formatDiceResult } = require('./dice');
const { generateActionNarrative, generateTurnNarrative } = require('./ai/claude');
const { startWhatsApp } = require('./whatsapp/client');
const { startServer } = require('./api/server');
const { db } = require('./db/database');

const games = new Map(); // groupId -> GameManager

// ─── Campaign routing ────────────────────────────────────────────────────────
function getCampaignForJid(jid) {
  return db.prepare(
    'SELECT * FROM campaigns WHERE lower(trim(jid)) = lower(trim(?)) AND active = 1'
  ).get(jid) || null;
}

async function getCampaignForGroup(sock, jid) {
  // 1. Tenta por JID exato
  const byJid = getCampaignForJid(jid);
  if (byJid) return byJid;

  // 2. Fallback: busca pelo nome do grupo
  try {
    const meta = await sock.groupMetadata(jid);
    const groupName = (meta?.subject || '').trim();
    if (groupName) {
      const byName = db.prepare(
        'SELECT * FROM campaigns WHERE lower(trim(name)) = lower(trim(?)) AND active = 1'
      ).get(groupName);
      if (byName) return byName;
    }
  } catch (_) {}

  return null;
}

function getNarrativesForTheme(theme) {
  const t = (theme || '').toLowerCase();
  if (t.includes('medieval') || t.includes('tolkien') || t.includes('fantasia')) {
    return require('./narratives-medieval');
  }
  return require('./narratives');
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getBody(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ''
  ).trim();
}

function getJid(msg) { return msg.key.remoteJid; }
function isGroup(msg) { return getJid(msg).endsWith('@g.us'); }

function getSenderName(msg) {
  return msg.pushName || msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
}

function getSenderId(msg) {
  // In groups, participant is the sender; in DMs, remoteJid
  return msg.key.participant || msg.key.remoteJid;
}

async function send(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

async function reply(sock, msg, text) {
  await sock.sendMessage(getJid(msg), { text }, { quoted: msg });
}

function replyIfNotGM(game, sock, msg, commandName) {
  if (!game.gmId) {
    reply(sock, msg, `⚠️ Nenhum Mestre foi definido ainda. Use *!mestre* para assumir o papel.`);
    return true;
  }
  if (!game.isGM(getSenderId(msg))) {
    reply(sock, msg, `🚫 Apenas o *Mestre* pode usar *${commandName}*.`);
    return true;
  }
  return false;
}

// ─── Handler de mensagens ────────────────────────────────────────────────────
async function handleMessage(sock, msg) {
  const jid = getJid(msg);
  const body = getBody(msg);
  if (!body) return;

  const campaign = await getCampaignForGroup(sock, jid);
  const nar = getNarrativesForTheme(campaign?.theme);
  const campaignPrompt = campaign?.prompt || null;

  // DM: só responde !ajuda
  if (!isGroup(msg)) {
    if (body === '!ajuda') await send(sock, jid, nar.helpPrivate);
    return;
  }

  const senderName = getSenderName(msg);
  const senderId = getSenderId(msg);

  if (!games.has(jid)) games.set(jid, new GameManager(jid));
  const game = games.get(jid);

  try {

    if (body === '!jid') {
      const campInfo = campaign
        ? `\n🗡️ Campanha vinculada: *${campaign.name}*`
        : '\n⚠️ Nenhuma campanha vinculada a este grupo no painel admin.';
      await reply(sock, msg,
        `📋 *JID deste grupo:*\n\`${jid}\`${campInfo}\n\n_Copie o JID acima e cole no painel admin → Configurações da campanha._`
      );
      return;
    }

    if (body === '!mestre') {
      const result = game.claimGM(senderId);
      if (result.success) {
        await send(sock, jid,
          `🎭 *${senderName}* assumiu o papel de *MESTRE* desta campanha!\n\n` +
          `_Apenas o Mestre pode usar: !iniciar, !encerrar, !turno, !cena, !definirDC, !criarNPC, !acaoNPC_`
        );
      } else if (result.self) {
        await reply(sock, msg, `ℹ️ Você já é o Mestre desta campanha.`);
      } else {
        await reply(sock, msg, `🚫 Já existe um Mestre nesta campanha.`);
      }
      return;
    }

    if (body === '!iniciar') {
      if (replyIfNotGM(game, sock, msg, '!iniciar')) return;
      if (game.started) { await send(sock, jid, '⚠️ A campanha já está em andamento! Use *!status* para ver o turno atual.'); return; }
      game.start();
      await send(sock, jid, nar.intro);
      await sleep(1500);
      await send(sock, jid, nar.turn1Opening);
      return;
    }

    if (body.startsWith('!personagem ')) {
      const desc = body.replace('!personagem ', '').trim();
      if (!desc) { await reply(sock, msg, '❌ Use: *!personagem [descrição do seu personagem]*'); return; }
      game.registerPlayer(senderId, senderName, desc);
      await send(sock, jid,
        `🟢 *${senderName}* entrou na campanha!\n\n` +
        `📋 *Personagem:* ${desc}\n\n` +
        `👥 Jogadores registrados: ${game.playerCount()}\n\n` +
        `_Quando todos estiverem prontos, o Mestre digita *!iniciar*_`
      );
      return;
    }

    if (body === '!d20') {
      const result = rollD20();
      await send(sock, jid, formatDiceResult(senderName, result, null));
      return;
    }

    if (body.startsWith('!acao ')) {
      if (!game.started) { await reply(sock, msg, '⚠️ A campanha ainda não foi iniciada. O Mestre deve usar *!iniciar*.'); return; }
      const actionDesc = body.replace('!acao ', '').trim();
      if (!actionDesc) { await reply(sock, msg, '❌ Use: *!acao [descrição da sua ação]*'); return; }

      // Auto-registra jogador se ainda não usou !personagem
      if (!game.getPlayer(senderId)) game.registerPlayer(senderId, senderName, 'Personagem não definido');

      const player = game.getPlayer(senderId);
      const playerLabel = player ? `*${player.name}* _(${player.character})_` : `*${senderName}*`;
      const dc = game.getDifficultyForAction(actionDesc);
      const result = rollD20();
      game.logAction(senderId, senderName, actionDesc, result, dc);

      await send(sock, jid,
        `⚡ *AÇÃO DECLARADA*\n\n` +
        `👤 Jogador: ${playerLabel}\n` +
        `🎯 Ação: _${actionDesc}_\n` +
        `🔒 Grau de Dificuldade: *${dc}*\n\n` +
        formatDiceResult(senderName, result, dc)
      );

      await sleep(500);
      const recentActions = game.actionLog.filter(a => a.turn === game.turn).slice(-3).map(a => `${a.name}: ${a.action}`);
      const narrative = await generateActionNarrative(senderName, actionDesc, result, dc, game.turn, recentActions, campaignPrompt);
      await send(sock, jid, `🎭 *[MESTRE]:* ${narrative}`);

      const actedResult = game.markActed(senderId);
      if (actedResult.allActed) {
        await sleep(500);
        await send(sock, jid,
          `\n⚔️ *TODOS OS JOGADORES AGIRAM — TURNO ${game.turn}*\n\n` +
          `🎭 *[MESTRE]:* É hora das reações dos NPCs.\n` +
          `Use *!acaoNPC [nome] | [ação]* para declarar as ações dos personagens.\n` +
          `Quando terminar, avance com *!turno*.\n\n` +
          `_Aguardando o Mestre..._`
        );
        game.startNPCPhase();
      }
      return;
    }

    if (body === '!turno') {
      if (replyIfNotGM(game, sock, msg, '!turno')) return;
      if (!game.started) { await reply(sock, msg, '⚠️ A campanha ainda não foi iniciada.'); return; }
      game.nextTurn();
      const lastTurnSummary = game.actionLog
        .filter(a => a.turn === game.turn - 1)
        .map(a => `${a.name} ${a.success ? 'teve sucesso em' : 'falhou em'}: ${a.action}`)
        .join('; ');
      const turnNarrative = await generateTurnNarrative(game.turn, lastTurnSummary, campaignPrompt);
      await send(sock, jid,
        `\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ *TURNO ${game.turn} — INICIADO*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎭 *[MESTRE]:* ${turnNarrative}\n\n` +
        `_Declarem suas ações com *!acao [descrição]*_`
      );
      return;
    }

    if (body.startsWith('!definirDC ')) {
      if (replyIfNotGM(game, sock, msg, '!definirDC')) return;
      const dc = parseInt(body.replace('!definirDC ', '').trim(), 10);
      if (isNaN(dc) || dc < 1 || dc > 20) { await reply(sock, msg, '❌ Use: *!definirDC [número entre 1 e 20]*'); return; }
      game.setCustomDC(dc);
      await send(sock, jid, `🔒 *[MESTRE definiu a dificuldade]*\n\nA próxima ação declarada terá *DC ${dc}*.\n_Use !acao normalmente._`);
      return;
    }

    if (body.startsWith('!criarNPC ')) {
      if (replyIfNotGM(game, sock, msg, '!criarNPC')) return;
      const parts = body.replace('!criarNPC ', '').split('|').map(s => s.trim());
      if (parts.length < 4) { await reply(sock, msg, '❌ Use: *!criarNPC [nome] | [tipo] | [descrição] | [motivação]*'); return; }
      const [name, type, desc, motivation] = parts;
      const npc = game.createNPC(name, type, desc, motivation);
      await send(sock, jid,
        `🤖 *[NOVO PERSONAGEM INSERIDO NA CENA — TURNO ${game.turn}]*\n\n` +
        `👤 *Nome:* ${npc.name}\n🏷️ *Tipo:* ${npc.type}\n📝 *Descrição:* ${npc.desc}\n⚠️ *Motivação:* ${npc.motivation}`
      );
      return;
    }

    if (body.startsWith('!acaoNPC ')) {
      if (replyIfNotGM(game, sock, msg, '!acaoNPC')) return;
      const parts = body.replace('!acaoNPC ', '').split('|').map(s => s.trim());
      if (parts.length < 2) { await reply(sock, msg, '❌ Use: *!acaoNPC [nome do NPC] | [descrição da ação]*'); return; }
      const [npcName, action] = parts;
      game.logNPCAction(npcName, action);
      await send(sock, jid, nar.getNPCActionMessage(npcName, action));
      return;
    }

    if (body === '!npc') {
      const dynamic = game.dynamicNpcs;
      const npc = dynamic.length > 0
        ? [...dynamic, ...dynamic, nar.getNPCFromStatic()][Math.floor(Math.random() * (dynamic.length * 2 + 1))]
        : nar.getRandomNPC();
      await send(sock, jid,
        `🤖 *[PERSONAGEM NA CENA]*\n\n` +
        `👤 *Nome:* ${npc.name}\n🏷️ *Tipo:* ${npc.type}\n📝 *Descrição:* ${npc.desc}\n⚠️ *Motivação:* ${npc.motivation}` +
        (npc.createdAtTurn !== undefined ? `\n\n_Introduzido no Turno ${npc.createdAtTurn}_` : '')
      );
      return;
    }

    if (body === '!npcs') {
      const dynamic = game.dynamicNpcs;
      if (dynamic.length === 0) { await reply(sock, msg, 'ℹ️ Nenhum NPC foi criado pelo Mestre ainda.\n\n_Use *!npc* para ver os personagens da história._'); return; }
      let text = `🤖 *NPCs ATIVOS NA CAMPANHA*\n\n`;
      dynamic.forEach((npc, i) => {
        text += `*${i + 1}. ${npc.name}* _(${npc.type})_\n   📝 ${npc.desc}\n   ⚠️ ${npc.motivation}\n   _Turno ${npc.createdAtTurn}_\n\n`;
      });
      await send(sock, jid, text.trim());
      return;
    }

    if (body === '!status') { await send(sock, jid, game.getStatusMessage()); return; }
    if (body === '!jogadores') { await send(sock, jid, game.getPlayersMessage()); return; }

    if (body === '!encerrar') {
      if (replyIfNotGM(game, sock, msg, '!encerrar')) return;
      game.end();
      await send(sock, jid, nar.outro);
      return;
    }

    if (body === '!ajuda') { await send(sock, jid, nar.help); return; }

    if (body === '!cena') {
      if (replyIfNotGM(game, sock, msg, '!cena')) return;
      const lastTurnSummary = game.actionLog.filter(a => a.turn === game.turn).map(a => `${a.name}: ${a.action}`).join('; ');
      const scene = await generateTurnNarrative(game.turn, lastTurnSummary, campaignPrompt);
      await send(sock, jid, `🌆 *[CENA ATUAL — TURNO ${game.turn}]*\n\n${scene}`);
      return;
    }

  } catch (err) {
    console.error('Erro ao processar mensagem:', err);
    await reply(sock, msg, '❌ Ocorreu um erro interno. Tente novamente.');
  }
}

// ─── Inicialização ──────────────────────────────────────────────────────────
console.log('🚀 Iniciando bot CampanhaCyberpunk...');
startServer();
startWhatsApp(handleMessage);
