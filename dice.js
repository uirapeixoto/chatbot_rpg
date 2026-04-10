/**
 * Rola um dado de 20 faces (D20)
 * @returns {number} Valor entre 1 e 20
 */
function rollD20() {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Formata o resultado do dado em mensagem para o WhatsApp
 * @param {string} playerName - Nome do jogador
 * @param {number} roll - Resultado do dado
 * @param {number|null} dc - Grau de Dificuldade (null = rolagem livre)
 * @returns {string}
 */
function formatDiceResult(playerName, roll, dc) {
  let icon, status, detail;

  if (roll === 20) {
    icon = '🌟';
    status = 'ACERTO CRÍTICO!';
    detail = 'Algo extraordinário acontece — o destino favorece o audacioso.';
  } else if (roll === 1) {
    icon = '💥';
    status = 'FALHA CRÍTICA!';
    detail = 'Um desastre se abate — o pior cenário possível se concretiza.';
  } else if (dc !== null) {
    if (roll >= dc) {
      icon = '✅';
      status = 'SUCESSO';
      detail = `${roll} ≥ ${dc} — Ação bem-sucedida.`;
    } else {
      icon = '❌';
      status = 'FALHA';
      detail = `${roll} < ${dc} — A ação não saiu como planejado.`;
    }
  } else {
    icon = '🎲';
    status = 'ROLAGEM LIVRE';
    detail = `Resultado: ${roll}`;
  }

  const diceVisual = getDiceEmoji(roll);

  return (
    `${icon} *${status}*\n\n` +
    `🎲 *${playerName}* rolou: ${diceVisual} *${roll}*\n` +
    (dc !== null ? `🔒 Dificuldade: *${dc}*\n` : '') +
    `\n_${detail}_`
  );
}

/**
 * Retorna um emoji visual de dado baseado no resultado
 */
function getDiceEmoji(roll) {
  if (roll === 20) return '⬡';
  if (roll >= 16) return '🔵';
  if (roll >= 11) return '🟡';
  if (roll >= 6)  return '🟠';
  if (roll > 1)   return '🔴';
  return '💀';
}

/**
 * Determina grau de dificuldade baseado no tipo de ação descrita
 * @param {string} action - Descrição da ação
 * @returns {number} DC entre 8 e 18
 */
function getDCForAction(action) {
  const lower = action.toLowerCase();

  // Ações de combate direto
  if (/atirar|disparar|atacar|golpear|cortar|esfaquear/.test(lower)) return 13;

  // Ações furtivas
  if (/esconder|infiltrar|furtivo|silencioso|ocultar/.test(lower)) return 14;

  // Hacking e tecnologia
  if (/hackear|invadir|sistema|terminal|dados|encrypt/.test(lower)) return 15;

  // Percepção e observação
  if (/observar|perceber|notar|ouvir|detectar|procurar/.test(lower)) return 11;

  // Ações sociais
  if (/convencer|negociar|blefar|enganar|persuadir/.test(lower)) return 12;

  // Ações físicas / atletismo
  if (/correr|pular|escalar|fugir|empurrar/.test(lower)) return 12;

  // Medicina / primeiros socorros
  if (/curar|tratar|estabilizar|medikit/.test(lower)) return 14;

  // Padrão
  return 12;
}

module.exports = { rollD20, formatDiceResult, getDCForAction };
