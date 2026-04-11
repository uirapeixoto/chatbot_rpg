require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT } = require('./prompt');

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY não definida no arquivo .env');
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Gera narração da ação via Claude
 * @param {string} playerName - Nome do jogador
 * @param {string} action - Descrição da ação
 * @param {number} roll - Resultado do D20
 * @param {number} dc - Grau de dificuldade
 * @param {number} turn - Turno atual
 * @param {string[]} recentActions - Últimas ações do turno para contexto
 * @returns {Promise<string>}
 */
async function generateActionNarrative(playerName, action, roll, dc, turn, recentActions = [], systemPrompt = null) {
  const margin = roll - dc;
  const outcome =
    roll === 20 ? 'ACERTO CRÍTICO (D20=20)' :
    roll === 1  ? 'FALHA CRÍTICA (D20=1)' :
    roll >= dc  ? `SUCESSO (${roll} >= ${dc}, margem +${margin})` :
                  `FALHA (${roll} < ${dc}, margem ${margin})`;

  const context = recentActions.length > 0
    ? `\nAções anteriores neste turno:\n${recentActions.map(a => `- ${a}`).join('\n')}`
    : '';

  const userMessage =
    `Turno ${turn}. Jogador: ${playerName}.\n` +
    `Ação declarada: "${action}"\n` +
    `Resultado do dado: ${outcome}${context}\n\n` +
    `Narre o resultado desta ação.`;

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt || SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    return res.content[0].text.trim();
  } catch (err) {
    if (err.status === 429) {
      console.warn('[Claude] Rate limit atingido:', err.message);
      return _fallbackNarrative(roll, dc);
    }
    console.error('[Claude] Erro:', err.message);
    return _fallbackNarrative(roll, dc);
  }
}

/**
 * Gera narração de abertura de turno via Claude
 * @param {number} turn - Número do turno
 * @param {string} lastTurnSummary - Resumo do turno anterior
 * @returns {Promise<string>}
 */
async function generateTurnNarrative(turn, lastTurnSummary = '', systemPrompt = null) {
  const context = lastTurnSummary
    ? `Resumo do turno anterior: ${lastTurnSummary}`
    : 'É o início da missão.';

  const userMessage =
    `${context}\n\n` +
    `Narre a abertura do Turno ${turn}. ` +
    `Descreva o ambiente, a tensão e o que os jogadores percebem ao redor. ` +
    `Termine convidando-os a declarar suas ações.`;

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt || SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    return res.content[0].text.trim();
  } catch (err) {
    console.error('[Claude] Erro ao gerar narrativa de turno:', err.message);
    return `O turno ${turn} começa. A tensão no ar é palpável. Declarem suas ações.`;
  }
}

function _fallbackNarrative(roll, dc) {
  if (roll === 20) return 'Uma execução impecável. O destino favorece o audacioso — algo inesperado e favorável acontece.';
  if (roll === 1)  return '⚠️ *FALHA CRÍTICA:* Algo deu terrivelmente errado. As consequências se espalham além do esperado.';
  if (roll >= dc)  return 'Ação bem-sucedida. O caminho à frente está um pouco mais claro agora.';
  return 'A ação não saiu como planejado. O ambiente fica ligeiramente mais hostil.';
}

module.exports = { generateActionNarrative, generateTurnNarrative };
