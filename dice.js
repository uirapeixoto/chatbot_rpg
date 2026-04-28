const { db } = require('./db/database');

function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

function formatDiceResult(playerName, roll, dc) {
  let icon, status, detail;

  if (roll === 20) {
    icon = '🌟'; status = 'ACERTO CRÍTICO!';
    detail = 'Algo extraordinário acontece — o destino favorece o audacioso.';
  } else if (roll === 1) {
    icon = '💥'; status = 'FALHA CRÍTICA!';
    detail = 'Um desastre se abate — o pior cenário possível se concretiza.';
  } else if (dc !== null) {
    if (roll >= dc) {
      icon = '✅'; status = 'SUCESSO'; detail = `${roll} ≥ ${dc} — Ação bem-sucedida.`;
    } else {
      icon = '❌'; status = 'FALHA'; detail = `${roll} < ${dc} — A ação não saiu como planejado.`;
    }
  } else {
    icon = '🎲'; status = 'ROLAGEM LIVRE'; detail = `Resultado: ${roll}`;
  }

  return (
    `${icon} *${status}*\n\n` +
    `🎲 *${playerName}* rolou: ${getDiceEmoji(roll)} *${roll}*\n` +
    (dc !== null ? `🔒 Dificuldade: *${dc}*\n` : '') +
    `\n_${detail}_`
  );
}

function getDiceEmoji(roll) {
  if (roll === 20) return '⬡';
  if (roll >= 16) return '🔵';
  if (roll >= 11) return '🟡';
  if (roll >= 6)  return '🟠';
  if (roll > 1)   return '🔴';
  return '💀';
}

function getDCForAction(action) {
  const lower = action.toLowerCase();
  const rules = db.prepare('SELECT pattern, dc FROM dc_rules ORDER BY priority DESC, id ASC').all();
  for (const rule of rules) {
    try {
      if (new RegExp(rule.pattern).test(lower)) return rule.dc;
    } catch (_) { /* padrão inválido, ignora */ }
  }
  const defaultDC = db.prepare("SELECT value FROM settings WHERE key = 'default_dc'").get();
  return defaultDC ? parseInt(defaultDC.value, 10) : 12;
}

module.exports = { rollD20, formatDiceResult, getDCForAction };
