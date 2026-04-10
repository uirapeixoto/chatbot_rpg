const { getDCForAction } = require('./dice');

class GameManager {
  constructor(groupId) {
    this.groupId = groupId;
    this.started = false;
    this.ended = false;
    this.turn = 0;
    this.players = new Map(); // from -> { name, character, actions: [] }
    this.actionLog = [];
    this.startedAt = null;

    // Mestre e controle de turno
    this.gmId = null;              // userId do GM
    this.actedThisTurn = new Set(); // quem já agiu neste turno
    this.phase = 'player';         // 'player' | 'npc'
    this.dynamicNpcs = [];         // NPCs criados pelo GM durante a campanha
    this.npcActionLog = [];        // { turn, npcName, action, timestamp }
    this.customDC = null;          // DC definido pelo GM para a próxima ação
  }

  // ─── GM ───────────────────────────────────────────────────────────────────

  claimGM(userId) {
    if (this.gmId === null) {
      this.gmId = userId;
      return { success: true };
    }
    if (this.gmId === userId) {
      return { success: false, alreadyClaimed: true, self: true };
    }
    return { success: false, alreadyClaimed: true };
  }

  isGM(userId) {
    return userId === this.gmId;
  }

  // ─── Ciclo de Jogo ────────────────────────────────────────────────────────

  start() {
    this.started = true;
    this.ended = false;
    this.turn = 1;
    this.startedAt = new Date();
    this.actedThisTurn = new Set();
    this.phase = 'player';
    this.customDC = null;
  }

  end() {
    this.started = false;
    this.ended = true;
  }

  nextTurn() {
    this.turn++;
    this.actedThisTurn = new Set();
    this.phase = 'player';
    this.customDC = null;
  }

  startNPCPhase() {
    this.phase = 'npc';
  }

  // ─── Jogadores ────────────────────────────────────────────────────────────

  registerPlayer(from, name, characterDesc) {
    this.players.set(from, {
      name,
      character: characterDesc,
      actions: []
    });
  }

  getPlayer(from) {
    return this.players.get(from) || null;
  }

  playerCount() {
    return this.players.size;
  }

  markActed(userId) {
    if (!this.players.has(userId)) {
      return { allActed: false, actedCount: this.actedThisTurn.size, totalPlayers: this.players.size };
    }
    const wasAlreadyActed = this.actedThisTurn.has(userId);
    this.actedThisTurn.add(userId);
    const actedCount = this.actedThisTurn.size;
    const totalPlayers = this.players.size;
    const allActed = totalPlayers > 0 && actedCount === totalPlayers && !wasAlreadyActed;
    return { allActed, actedCount, totalPlayers };
  }

  // ─── Dificuldade ──────────────────────────────────────────────────────────

  setCustomDC(dc) {
    this.customDC = dc;
  }

  consumeCustomDC() {
    const dc = this.customDC;
    this.customDC = null;
    return dc;
  }

  getDifficultyForAction(actionDesc) {
    const pending = this.consumeCustomDC();
    if (pending !== null) return pending;
    return getDCForAction(actionDesc);
  }

  // ─── Ações ────────────────────────────────────────────────────────────────

  logAction(from, name, action, roll, dc) {
    const entry = {
      turn: this.turn,
      from,
      name,
      action,
      roll,
      dc,
      success: roll === 20 || (roll !== 1 && roll >= dc),
      critical: roll === 20,
      critFail: roll === 1,
      timestamp: new Date()
    };
    this.actionLog.push(entry);

    const player = this.players.get(from);
    if (player) {
      player.actions.push(entry);
    }
    return entry;
  }

  // ─── NPCs Dinâmicos ───────────────────────────────────────────────────────

  createNPC(name, type, desc, motivation) {
    const npc = { name, type, desc, motivation, createdAtTurn: this.turn, createdAt: new Date() };
    this.dynamicNpcs.push(npc);
    return npc;
  }

  getNPC(name) {
    const lower = name.toLowerCase();
    return this.dynamicNpcs.find(n => n.name.toLowerCase() === lower) || null;
  }

  logNPCAction(npcName, action) {
    const entry = { turn: this.turn, npcName, action, timestamp: new Date() };
    this.npcActionLog.push(entry);
    return entry;
  }

  // ─── Mensagens de Status ──────────────────────────────────────────────────

  getStatusMessage() {
    const gmStatus = this.gmId ? '*Definido*' : '_Não definido — use !mestre_';

    if (!this.started && !this.ended) {
      const count = this.playerCount();
      return (
        `📊 *STATUS DA CAMPANHA*\n\n` +
        `⏸️ Estado: _Aguardando início_\n` +
        `🎭 Mestre: ${gmStatus}\n` +
        `👥 Jogadores registrados: *${count}*\n\n` +
        `_O Mestre deve digitar *!iniciar* para começar._`
      );
    }

    if (this.ended) {
      return `📊 *STATUS:* Campanha encerrada. Use *!iniciar* para uma nova sessão.`;
    }

    const elapsed = this._elapsedTime();
    const successCount = this.actionLog.filter(a => a.success).length;
    const totalActions = this.actionLog.length;
    const faseLabel = this.phase === 'player' ? 'Ações dos Jogadores' : 'Reações dos NPCs';

    return (
      `📊 *STATUS DA CAMPANHA*\n\n` +
      `▶️ Estado: *Em andamento*\n` +
      `⏱️ Turno atual: *${this.turn}*\n` +
      `🎭 Fase: *${faseLabel}*\n` +
      `⚔️ Agiram neste turno: *${this.actedThisTurn.size}/${this.playerCount()}*\n` +
      `👥 Jogadores: *${this.playerCount()}*\n` +
      `🤖 NPCs criados: *${this.dynamicNpcs.length}*\n` +
      `🎲 Ações realizadas: *${totalActions}*\n` +
      `✅ Sucessos: *${successCount}* | ❌ Falhas: *${totalActions - successCount}*\n` +
      `🕐 Tempo de jogo: *${elapsed}*\n\n` +
      `_Use *!cena* para ver a situação atual._`
    );
  }

  getPlayersMessage() {
    if (this.players.size === 0) {
      return '👥 Nenhum jogador registrado ainda.\n\n_Use *!personagem [descrição]* para entrar na campanha._';
    }

    let msg = `👥 *JOGADORES DA CAMPANHA*\n\n`;
    let i = 1;
    for (const [, p] of this.players) {
      const acertos = p.actions.filter(a => a.success).length;
      msg += `*${i}. ${p.name}*\n`;
      msg += `   📋 _${p.character}_\n`;
      msg += `   🎲 Ações: ${p.actions.length} | ✅ Sucessos: ${acertos}\n\n`;
      i++;
    }
    return msg.trim();
  }

  _elapsedTime() {
    if (!this.startedAt) return '—';
    const ms = Date.now() - this.startedAt.getTime();
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}min ${sec}s`;
  }
}

module.exports = GameManager;
