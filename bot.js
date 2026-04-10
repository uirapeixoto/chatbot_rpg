const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const GameManager = require('./gameManager');
const { rollD20, formatDiceResult } = require('./dice');
const narratives = require('./narratives');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'rpg-cyberpunk-bot' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }
});

const games = new Map(); // groupId -> GameManager instance

// ─── QR Code ───────────────────────────────────────────────────────────────
client.on('qr', (qr) => {
  console.log('\n📱 Escaneie o QR code abaixo com o WhatsApp:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot CampanhaCyberpunk conectado e pronto!');
  console.log('📡 Aguardando comandos no grupo...\n');
});

client.on('auth_failure', () => {
  console.error('❌ Falha na autenticação. Delete a pasta .wwebjs_auth e tente novamente.');
});

// ─── Helper: guarda de Mestre ─────────────────────────────────────────────
function replyIfNotGM(game, msg, commandName) {
  if (!game.gmId) {
    msg.reply(`⚠️ Nenhum Mestre foi definido ainda. Use *!mestre* para assumir o papel.`);
    return true;
  }
  if (!game.isGM(msg.from)) {
    msg.reply(`🚫 Apenas o *Mestre* pode usar *${commandName}*.`);
    return true;
  }
  return false;
}

// ─── Processamento de Mensagens ─────────────────────────────────────────────
client.on('message', async (msg) => {
  const chat = await msg.getChat();

  // Só processa mensagens de grupo
  if (!chat.isGroup) {
    if (msg.body === '!ajuda') {
      await msg.reply(narratives.helpPrivate);
    }
    return;
  }

  const groupId = chat.id._serialized;
  const senderName = msg._data.notifyName || msg.from;
  const body = msg.body.trim();

  // Inicializa o jogo para o grupo se não existir
  if (!games.has(groupId)) {
    games.set(groupId, new GameManager(groupId));
  }
  const game = games.get(groupId);

  // ─── Comandos ──────────────────────────────────────────────────────────────
  try {

    // !mestre — reivindica papel de Game Master
    if (body === '!mestre') {
      const result = game.claimGM(msg.from);
      if (result.success) {
        await chat.sendMessage(
          `🎭 *${senderName}* assumiu o papel de *MESTRE* desta campanha!\n\n` +
          `_Apenas o Mestre pode usar: !iniciar, !encerrar, !turno, !cena, !definirDC, !criarNPC, !acaoNPC_`
        );
      } else if (result.self) {
        await msg.reply(`ℹ️ Você já é o Mestre desta campanha.`);
      } else {
        await msg.reply(`🚫 Já existe um Mestre nesta campanha.`);
      }
      return;
    }

    // !iniciar — inicia a campanha (apenas Mestre)
    if (body === '!iniciar') {
      if (replyIfNotGM(game, msg, '!iniciar')) return;
      if (game.started) {
        await chat.sendMessage('⚠️ A campanha já está em andamento! Use *!status* para ver o turno atual.');
        return;
      }
      game.start();
      await chat.sendMessage(narratives.intro);
      await sleep(1500);
      await chat.sendMessage(narratives.turn1Opening);
      return;
    }

    // !personagem [descrição] — registra ou atualiza personagem do jogador
    if (body.startsWith('!personagem ')) {
      const desc = body.replace('!personagem ', '').trim();
      if (!desc) {
        await msg.reply('❌ Use: *!personagem [descrição do seu personagem]*');
        return;
      }
      game.registerPlayer(msg.from, senderName, desc);
      const count = game.playerCount();
      await chat.sendMessage(
        `🟢 *${senderName}* entrou na campanha!\n\n` +
        `📋 *Personagem:* ${desc}\n\n` +
        `👥 Jogadores registrados: ${count}\n\n` +
        `_Quando todos estiverem prontos, o Mestre digita *!iniciar*_`
      );
      return;
    }

    // !d20 — rola dado livremente
    if (body === '!d20') {
      const result = rollD20();
      await chat.sendMessage(formatDiceResult(senderName, result, null));
      return;
    }

    // !acao [descrição] — declara ação e rola dado automaticamente
    if (body.startsWith('!acao ')) {
      if (!game.started) {
        await msg.reply('⚠️ A campanha ainda não foi iniciada. O Mestre deve usar *!iniciar*.');
        return;
      }
      const actionDesc = body.replace('!acao ', '').trim();
      if (!actionDesc) {
        await msg.reply('❌ Use: *!acao [descrição da sua ação]*');
        return;
      }

      const player = game.getPlayer(msg.from);
      const playerLabel = player ? `*${player.name}* _(${player.character})_` : `*${senderName}*`;

      const dc = game.getDifficultyForAction(actionDesc);
      const result = rollD20();
      game.logAction(msg.from, senderName, actionDesc, result, dc);

      await chat.sendMessage(
        `⚡ *AÇÃO DECLARADA*\n\n` +
        `👤 Jogador: ${playerLabel}\n` +
        `🎯 Ação: _${actionDesc}_\n` +
        `🔒 Grau de Dificuldade: *${dc}*\n\n` +
        formatDiceResult(senderName, result, dc)
      );

      // Narrativa automática após ação
      await sleep(1000);
      const margin = result - dc;
      const narrative = narratives.getActionNarrative(actionDesc, result, dc, margin);
      if (narrative) {
        await chat.sendMessage(`🎭 *[MESTRE]:* ${narrative}`);
      }

      // Verifica se todos os jogadores já agiram neste turno
      const actedResult = game.markActed(msg.from);
      if (actedResult.allActed) {
        await sleep(500);
        await chat.sendMessage(
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

    // !turno — avança para o próximo turno (apenas Mestre)
    if (body === '!turno') {
      if (replyIfNotGM(game, msg, '!turno')) return;
      if (!game.started) {
        await msg.reply('⚠️ A campanha ainda não foi iniciada.');
        return;
      }
      game.nextTurn();
      const turnNarrative = narratives.getTurnNarrative(game.turn);
      await chat.sendMessage(
        `\n━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ *TURNO ${game.turn} — INICIADO*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🎭 *[MESTRE]:* ${turnNarrative}\n\n` +
        `_Declarem suas ações com *!acao [descrição]*_`
      );
      return;
    }

    // !definirDC [número] — GM define DC para a próxima ação
    if (body.startsWith('!definirDC ')) {
      if (replyIfNotGM(game, msg, '!definirDC')) return;
      const dcStr = body.replace('!definirDC ', '').trim();
      const dc = parseInt(dcStr, 10);
      if (isNaN(dc) || dc < 1 || dc > 20) {
        await msg.reply('❌ Use: *!definirDC [número entre 1 e 20]*');
        return;
      }
      game.setCustomDC(dc);
      await chat.sendMessage(
        `🔒 *[MESTRE definiu a dificuldade]*\n\n` +
        `A próxima ação declarada terá *DC ${dc}*.\n` +
        `_Use !acao normalmente._`
      );
      return;
    }

    // !criarNPC nome | tipo | descrição | motivação — GM cria NPC dinâmico
    if (body.startsWith('!criarNPC ')) {
      if (replyIfNotGM(game, msg, '!criarNPC')) return;
      const parts = body.replace('!criarNPC ', '').split('|').map(s => s.trim());
      if (parts.length < 4) {
        await msg.reply('❌ Use: *!criarNPC [nome] | [tipo] | [descrição] | [motivação]*');
        return;
      }
      const [name, type, desc, motivation] = parts;
      const npc = game.createNPC(name, type, desc, motivation);
      await chat.sendMessage(
        `🤖 *[NOVO PERSONAGEM INSERIDO NA CENA — TURNO ${game.turn}]*\n\n` +
        `👤 *Nome:* ${npc.name}\n` +
        `🏷️ *Tipo:* ${npc.type}\n` +
        `📝 *Descrição:* ${npc.desc}\n` +
        `⚠️ *Motivação:* ${npc.motivation}`
      );
      return;
    }

    // !acaoNPC nome | ação — GM declara ação de NPC no turno
    if (body.startsWith('!acaoNPC ')) {
      if (replyIfNotGM(game, msg, '!acaoNPC')) return;
      const parts = body.replace('!acaoNPC ', '').split('|').map(s => s.trim());
      if (parts.length < 2) {
        await msg.reply('❌ Use: *!acaoNPC [nome do NPC] | [descrição da ação]*');
        return;
      }
      const [npcName, action] = parts;
      game.logNPCAction(npcName, action);
      await chat.sendMessage(narratives.getNPCActionMessage(npcName, action));
      return;
    }

    // !npc — apresenta um NPC na cena (estático ou dinâmico)
    if (body === '!npc') {
      const dynamic = game.dynamicNpcs;
      let npc;
      if (dynamic.length > 0) {
        // NPCs dinâmicos têm peso 2x, estáticos peso 1x
        const pool = [...dynamic, ...dynamic, narratives.getNPCFromStatic()];
        npc = pool[Math.floor(Math.random() * pool.length)];
      } else {
        npc = narratives.getRandomNPC();
      }
      await chat.sendMessage(
        `🤖 *[PERSONAGEM NA CENA]*\n\n` +
        `👤 *Nome:* ${npc.name}\n` +
        `🏷️ *Tipo:* ${npc.type}\n` +
        `📝 *Descrição:* ${npc.desc}\n` +
        `⚠️ *Motivação:* ${npc.motivation}` +
        (npc.createdAtTurn !== undefined ? `\n\n_Introduzido no Turno ${npc.createdAtTurn}_` : '')
      );
      return;
    }

    // !npcs — lista NPCs criados pelo Mestre
    if (body === '!npcs') {
      const dynamic = game.dynamicNpcs;
      if (dynamic.length === 0) {
        await msg.reply('ℹ️ Nenhum NPC foi criado pelo Mestre ainda nesta campanha.\n\n_Use *!npc* para ver os personagens da história._');
        return;
      }
      let text = `🤖 *NPCs ATIVOS NA CAMPANHA*\n\n`;
      dynamic.forEach((npc, i) => {
        text += `*${i + 1}. ${npc.name}* _(${npc.type})_\n`;
        text += `   📝 ${npc.desc}\n`;
        text += `   ⚠️ ${npc.motivation}\n`;
        text += `   _Introduzido no Turno ${npc.createdAtTurn}_\n\n`;
      });
      await chat.sendMessage(text.trim());
      return;
    }

    // !status — mostra estado atual da campanha
    if (body === '!status') {
      await chat.sendMessage(game.getStatusMessage());
      return;
    }

    // !jogadores — lista jogadores registrados
    if (body === '!jogadores') {
      await chat.sendMessage(game.getPlayersMessage());
      return;
    }

    // !encerrar — encerra a campanha (apenas Mestre)
    if (body === '!encerrar') {
      if (replyIfNotGM(game, msg, '!encerrar')) return;
      game.end();
      await chat.sendMessage(narratives.outro);
      return;
    }

    // !ajuda — lista de comandos
    if (body === '!ajuda') {
      await chat.sendMessage(narratives.help);
      return;
    }

    // !cena — descreve a cena atual (apenas Mestre)
    if (body === '!cena') {
      if (replyIfNotGM(game, msg, '!cena')) return;
      const scene = narratives.getSceneDescription(game.turn);
      await chat.sendMessage(`🌆 *[CENA ATUAL — TURNO ${game.turn}]*\n\n${scene}`);
      return;
    }

  } catch (err) {
    console.error('Erro ao processar mensagem:', err);
    await msg.reply('❌ Ocorreu um erro interno. Tente novamente.');
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Inicialização ──────────────────────────────────────────────────────────
console.log('🚀 Iniciando bot CampanhaCyberpunk...');
client.initialize();
