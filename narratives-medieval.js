// ─── Abertura da Campanha ────────────────────────────────────────────────────
const intro = `
🏔️ *[ CAMPANHA MEDIEVAL — O FRAGMENTO DE ANAR ]*

Em Eriador, terra de reinos antigos e caminhos esquecidos, uma sombra cresce no leste. O Senhor das Sombras desperta em Morduin, e seus servos pálidos cavalcam pelos vales em silêncio mortal.

Mirathas, o Mago Cinzento, convocou-os. A missão: adentrar as *Ruínas de Khazad-Tor* e recuperar o *Fragmento de Anar* — uma gema de luz ancestral capaz de selar as Portais de Morduin para sempre.

Os servos das trevas também buscam a gema. O tempo é curto.

⚠️ _"Nem todo que vagueia está perdido — mas quem hesita, perece."_ — Mirathas, o Cinzento
`.trim();

// ─── Abertura do Turno 1 ─────────────────────────────────────────────────────
const turn1Opening = `
━━━━━━━━━━━━━━━━━━━━━━
⚔️ *TURNO 1 — APROXIMAÇÃO*
━━━━━━━━━━━━━━━━━━━━━━

🎭 *[MESTRE]:* A chuva fria cai sobre as pedras cobertas de musgo do Vale dos Ossos. São horas da noite. As *Ruínas de Khazad-Tor* erguem-se a trezentos passos — torres partidas contra um céu cor de chumbo, iluminadas por relâmpagos distantes.

Visível daqui:
• 🚪 *Portal principal* — dois pilares caídos, marcas de garras em pedra antiga
• 🌿 *Passagem lateral* — coberta por hera densa, sem vigilância aparente
• 🪨 *Torre norte* — ainda de pé, abertura no segundo andar

_Declarem suas ações com *!acao [descrição]*_
_Exemplo: !acao Observo o portal principal em busca de armadilhas_
`.trim();

// ─── Narrativas por Turno ────────────────────────────────────────────────────
const turnNarratives = [
  // Turno 2
  `A passagem lateral cede ao toque — pedras rolam com um som surdo que ecoa pelos salões. Por um instante de terror, o silêncio responde. Depois: passos arrastados nas sombras. *Não estão sozinhos.* O corredor à frente bifurca — à esquerda, o brilho de tochas; à direita, escuridão absoluta e o cheiro de pedra muito antiga.`,

  // Turno 3
  `Uma voz chegada do nada: _"Eu esperava mais... refinamento da parte dos heróis de Mirathas."_ Korthul, o Cavaleiro Pálido, emerge das sombras — sua armadura não reflete luz, seus olhos são dois pontos de fogo gelado. Ele não ataca. *Observa.* "O Fragmento não é de vocês," ele sussurra. "Nunca foi. Mas podem morrer tentando tomá-lo."`,

  // Turno 4
  `A Câmara do Fragmento. No centro, sobre um altar de pedra negra, o *Fragmento de Anar* pulsa em luz dourada — quente como o sol de verão, num lugar onde o sol nunca chegou. Mas ao redor do altar, cinco runas no chão brilham em vermelho. *Uma armadilha.* E das paredes emergem figuras encurvadas — Guardiões de Pedra, antigos como as ruínas, movendo-se pela primeira vez em séculos.`,

  // Turno 5+
  `O Fragmento está em suas mãos — e as ruínas desmoronam. Korthul grita numa língua morta e as paredes racham. A saída está a cinquenta passos. As pedras caem. Os Guardiões perseguem. E nas sombras lá fora, algo muito maior que Korthul aguarda na chuva. _Este é o momento que será cantado — ou esquecido para sempre._`
];

// ─── Narrativas de Resultado de Ação ────────────────────────────────────────

const _critSuccessNarratives = {
  'golpear|atacar|espada|cortar|ferir|flecha|arco|atirar|lutar': [
    `O golpe é digno de lenda. A lâmina encontra a fresta perfeita na armadura — o inimigo cai com um brado que ecoa pelas pedras antigas. *Os aliados ao redor sentem a coragem renovada.*`,
    `A flecha rasga o ar com precisão de mestre arqueiro. Acerta o ombro do Guardião que segurava a alavanca da armadilha — o mecanismo trava. *O caminho à frente está livre.*`,
    `Um golpe tão certeiro que a pedra atrás do inimigo racha ao meio. O choque derruba dois adversários de uma vez. *O nome do herói será lembrado neste lugar.*`,
    `Acerto cirúrgico. O inimigo não grita — simplesmente cessa. No silêncio que se segue, você percebe algo: ele carregava um mapa das câmaras internas. *Informação vale mais que ouro aqui.*`
  ],
  'esgueirar|furtivo|ocultar|esconder|silencioso|infiltrar': [
    `Invisível como névoa no amanhecer. Você desliza por entre as sombras tão completamente que um patrulheiro passa a centímetros e vai embora. *E você interceptou sua senha de reconhecimento ao passar.*`,
    `Tão silencioso quanto a morte. Você não apenas passa despercebido — você alcança a posição elevada que dá visão de toda a câmara. *O grupo tem vantagem em todas as ações desta área.*`,
    `A escuridão o aceita como filho. Você some nas sombras e reaparece do outro lado da sala, deixando os guardas confusos e desorientados. *Eles já não confiam nos próprios olhos.*`,
    `Uma furtividade de mestre. No silêncio perfeito, você ouve sussurros dos Guardiões de Pedra — e entende que eles têm um ponto fraco. *Um símbolo nos calcanhares. Um golpe ali os imobiliza.*`
  ],
  'magia|encantamento|runa|feitiço|arcano|canalizar': [
    `O encantamento floresce com um poder que surpreende até a você. As runas vermelhas no chão apagam — e se reacendem em *dourado*, tornando-se agora um guia seguro pelo altar. *A armadilha foi invertida em proteção.*`,
    `A magia responde com uma força que não esperava. A runa que você traçou pulsa e expande — e as sombras recuam visivelmente, como se tivessem medo. *Um corredor de luz segura se abre.*`,
    `O feitiço vai fundo demais e revela algo oculto: uma câmara secreta atrás da parede norte, gravada no próprio tecido da pedra. *Havia uma saída que ninguém conhecia.*`,
    `Seu domínio do arcano faz as tochas se apagarem ao redor dos inimigos enquanto ilumina o caminho do grupo. *Visão perfeita para os heróis, escuridão absoluta para os adversários.*`
  ],
  'observar|perceber|notar|ouvir|escutar|detectar|procurar': [
    `Seus sentidos captam o que outros ignorariam: o padrão das pegadas na poeira revela que Korthul veio — e *saiu* desta câmara recentemente. Ele esteve aqui há menos de uma hora. *Vocês estão mais próximos do que pensavam.*`,
    `Um detalhe imperceptível: a pedra do altar não é sólida — há um compartimento abaixo. *O verdadeiro Fragmento pode estar escondido ali, e o que está em cima é uma isca.*`,
    `Você escuta o padrão das respirações nas sombras. *Cinco inimigos, não três.* Dois estão atrás de pilares que pareciam vazios. O grupo não será surpreendido.`,
    `Seu olhar cai sobre os hieróglifos na parede — e você reconhece: é a língua élfica arcaica. Uma instrução. *"Pronuncie o nome de Anar e as pedras obedecerão."* Vocês têm uma palavra de comando.`
  ]
};

const _critFailNarratives = {
  'golpear|atacar|espada|cortar|ferir|flecha|arco|atirar|lutar': [
    `⚠️ *FALHA CRÍTICA:* A lâmina escorrega na pedra úmida e vira contra você — um corte raso no antebraço. *-1 em ações de combate até receber tratamento.* O barulho do metal ecoou por toda a ala.`,
    `⚠️ *FALHA CRÍTICA:* A flecha desvia e acerta uma corrente que sustentava uma pedra no teto. *Um bloco cai bloqueando a saída norte.* A única rota agora é para dentro das ruínas.`,
    `⚠️ *FALHA CRÍTICA:* O golpe erra tão catastroficamente que você acerta o altar — e acorda algo que dormia há séculos. *Dois Guardiões de Pedra abrem os olhos nas paredes laterais.*`,
    `⚠️ *FALHA CRÍTICA:* Sua arma prende em uma fresta de pedra e quebra na metade. *Você está desarmado.* E o inimigo que você tentou atingir agora sorri — se é que a coisa pode sorrir.`
  ],
  'esgueirar|furtivo|ocultar|esconder|silencioso|infiltrar': [
    `⚠️ *FALHA CRÍTICA:* Você pisa numa placa de pedra solta que dispara um mecanismo antigo. Setas de pedra varrem o corredor. *Status: Ferido leve. A armadilha foi ativada — e outros podem ter ouvido.*`,
    `⚠️ *FALHA CRÍTICA:* Você tropeça e cai contra uma prateleira de ossos empilhados. O barulho é ensurdecedor. *Três patrulheiros viram ao mesmo tempo. Sua posição está completamente exposta.*`,
    `⚠️ *FALHA CRÍTICA:* Na escuridão, você se esconde no lugar errado — dentro de uma câmara que se fecha. *Está preso. O grupo precisa encontrar o mecanismo de abertura antes de continuar.*`,
    `⚠️ *FALHA CRÍTICA:* A sombra que você escolheu como cobertura *move-se sozinha*. Um Guardião estava imóvel ali desde o início. *Ele agora ergue a cabeça. Lentamente.*`
  ],
  'magia|encantamento|runa|feitiço|arcano|canalizar': [
    `⚠️ *FALHA CRÍTICA:* O feitiço reverte sobre você. A energia arcana dispara em todas as direções, apagando todas as tochas num raio de dez passos. *O grupo está em escuridão absoluta. Algo se move nas sombras.*`,
    `⚠️ *FALHA CRÍTICA:* A runa que você tentou traçar reage com a magia das Ruínas — a parede explode em fragmentos. *O barulho acordou algo no andar inferior. Passos pesados sobem as escadas.*`,
    `⚠️ *FALHA CRÍTICA:* O encantamento atraiu a atenção de Korthul. Você sente o olhar gelado dele em seu pescoço — *ele agora sabe exatamente onde vocês estão.*`,
    `⚠️ *FALHA CRÍTICA:* A magia escapa do seu controle e sela a entrada por onde vieram. *Não há mais recuo.* O único caminho é em frente, para dentro das trevas mais profundas.`
  ],
  'observar|perceber|notar|ouvir|escutar|detectar|procurar': [
    `⚠️ *FALHA CRÍTICA:* Você estava tão concentrado observando à frente que não percebeu o inimigo atrás. *Ele está a dois passos — e você só sabe disso porque sentiu o sopro do ar frio antes do golpe.*`,
    `⚠️ *FALHA CRÍTICA:* Ao examinar de perto, você ativa um mecanismo oculto na parede. *Uma grade de ferro desce, separando você do resto do grupo.* Vocês estão divididos.`,
    `⚠️ *FALHA CRÍTICA:* Você interpretou completamente errado o que viu. *O grupo agiu com base em informação falsa — e caminhou direto para uma emboscada.* O Mestre revelará as consequências.`
  ]
};

const _successNarratives = {
  'golpear|atacar|espada|cortar|ferir|flecha|arco|atirar|lutar': [
    `Golpe certeiro. O inimigo recua e cobre o ferimento. *Está enfraquecido — a próxima ação contra ele terá DC reduzido em 2.*`,
    `A lâmina encontra seu alvo. O adversário cai de joelhos. *O caminho está desobstruído — por enquanto.*`,
    `Acerto limpo. O inimigo não grita — mas o som do impacto chamou atenção no corredor acima. *Alguém está descendo.*`
  ],
  'esgueirar|furtivo|ocultar|esconder|silencioso|infiltrar': [
    `Você passa despercebido. *O corredor à frente está livre por mais alguns minutos.*`,
    `Movimento fluido e silencioso. *Um guarda passou a menos de um metro — mas não percebeu nada.*`,
    `Infiltração bem-sucedida. *Você está na posição desejada sem alertar ninguém.* O grupo pode avançar.`
  ],
  'magia|encantamento|runa|feitiço|arcano|canalizar': [
    `O encantamento funciona. *As runas no chão resfriam de vermelho para cinza — a armadilha está temporariamente desativada.*`,
    `A runa foi traçada com precisão. *Uma barreira translúcida protege o grupo por este turno — ataques físicos causarão metade do dano.*`,
    `O feitiço alcança seu alvo. *90 segundos antes que o efeito se dissipe. Use bem o tempo.*`
  ],
  'observar|perceber|notar|ouvir|escutar|detectar|procurar': [
    `Você nota algo útil: a troca de ronda acontece em quatro minutos. *Uma janela de oportunidade.*`,
    `Seus sentidos captam o padrão da patrulha — 90 segundos de corredor livre a cada ronda. *Timing calculado.*`,
    `Você identifica o ponto fraco da formação inimiga. *Um dos Guardiões está posicionado de forma a bloquear os outros — elimine-o primeiro.*`
  ]
};

const _failNarratives = {
  'golpear|atacar|espada|cortar|ferir|flecha|arco|atirar|lutar': [
    `O golpe erra. O inimigo recua e se posiciona atrás de uma coluna. *Está protegido — DC +2 na próxima tentativa.*`,
    `A lâmina passa raspando. O adversário contra-ataca com um rugido que ecoa pelas paredes. *Alguém no andar acima parou de se mover.*`,
    `Tiro disperso — a flecha crava numa pedra. *O barulho foi suficiente para chamar atenção.*`
  ],
  'esgueirar|furtivo|ocultar|esconder|silencioso|infiltrar': [
    `Você está parcialmente coberto, mas *um guarda olhou um instante longo demais na sua direção.*`,
    `Movimento detectado — ainda não identificado. *Um patrulheiro se aproxima para verificar a área.*`,
    `Cobertura comprometida. *Você precisa se reposicionar antes do próximo turno ou será encontrado.*`
  ],
  'magia|encantamento|runa|feitiço|arcano|canalizar': [
    `A magia resiste. As runas antigas são mais fortes do que esperava. *Você não conseguiu desativá-las — mas agora sabe o padrão delas. DC -2 na próxima tentativa.*`,
    `O feitiço falha e deixa um rastro de luz visível. *Um Guardião girou a cabeça na sua direção.*`,
    `Encantamento bloqueado. *A magia das Ruínas é mais antiga e mais funda. Outra abordagem é necessária.*`
  ],
  'observar|perceber|notar|ouvir|escutar|detectar|procurar': [
    `As sombras enganam seus sentidos. *Nada de concreto identificado desta posição.*`,
    `A observação foi inconclusiva. *Você perdeu tempo que poderia ter sido usado de outra forma.*`
  ]
};

function _pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function _matchKey(lower, buckets) {
  for (const pattern of Object.keys(buckets)) {
    if (new RegExp(pattern).test(lower)) return buckets[pattern];
  }
  return null;
}

function _getMarginFlavor(margin) {
  if (margin >= 7) return `\n_Feito digno de canção — margem de ${margin} acima da dificuldade._`;
  if (margin >= 4) return `\n_Execução sólida._`;
  if (margin === 1) return `\n_Por um fio — mas a coragem prevaleceu._`;
  return '';
}

function getActionNarrative(action, roll, dc, margin = 0) {
  const lower = action.toLowerCase();
  const success = roll === 20 || (roll !== 1 && roll >= dc);
  const crit = roll === 20;
  const critFail = roll === 1;

  if (crit) {
    const bucket = _matchKey(lower, _critSuccessNarratives);
    if (bucket) return _pickRandom(bucket);
    return `Um feito extraordinário — digno das crônicas de Eriador. O destino favorece os corajosos, e hoje o destino está de olho em você.`;
  }

  if (critFail) {
    const bucket = _matchKey(lower, _critFailNarratives);
    if (bucket) return _pickRandom(bucket);
    return `⚠️ *FALHA CRÍTICA:* A fortuna vira suas costas nos piores momentos. As consequências se espalham além do esperado — o grupo inteiro sente os efeitos.`;
  }

  if (success) {
    const bucket = _matchKey(lower, _successNarratives);
    const base = bucket
      ? _pickRandom(bucket)
      : `Ação bem-sucedida. O caminho à frente está um pouco mais claro.`;
    return base + _getMarginFlavor(margin);
  }

  const failBucket = _matchKey(lower, _failNarratives);
  if (failBucket) return _pickRandom(failBucket);
  return `A ação não saiu como planejado. As trevas das Ruínas ficam ligeiramente mais hostis.`;
}

// ─── NPCs ────────────────────────────────────────────────────────────────────
const npcs = [
  {
    name: 'Mirathas o Cinzento',
    type: '🧙 Mago Errante — Aliado',
    desc: 'Velho de barba prateada e manto cinzento gasto. Olhos que viram reinos nascerem e caírem. Carrega um cajado de madeira de carvalho com uma pedra âmbar na ponta.',
    motivation: 'Quer selar as Portais de Morduin. O que ele não conta: o preço do ritual é alto demais para um homem suportar sozinho.'
  },
  {
    name: 'Korthul o Cavaleiro Pálido',
    type: '🖤 Servo das Trevas — Antagonista',
    desc: 'Armadura negra que não reflete luz. Rosto oculto por elmo selado. Cavalga um corcel sem cor, cujos cascos não fazem barulho. Fala em sussurros que gelam o ar.',
    motivation: 'Recuperar o Fragmento de Anar para o Senhor das Sombras. Não tem medo da morte — porque já morreu uma vez.'
  },
  {
    name: 'Durgin Ferreiro de Ferro',
    type: '⚒️ Guia Anão — Aliado',
    desc: 'Anão de armadura enferrujada e machado que passou por cinco gerações da família. Conhece cada túnel de Khazad-Tor. Fala pouco, mas o que diz é verdade.',
    motivation: 'Khazad-Tor foi a cidade de seus ancestrais. Quer morrer dentro dela, se preciso for, para ver os antigos salões uma última vez.'
  },
  {
    name: 'Sylaran das Matas Prateadas',
    type: '🌿 Explorador Élfico — Neutro',
    desc: 'Elfa de cabelos prateados e arco de madeira de bétula. Passou três décadas estudando as ruínas por fora. Sabe de armadilhas que nem Durgin conhece.',
    motivation: 'O Fragmento contém uma memória élfica de mil anos atrás. Ela quer essa memória antes que o artefato seja destruído ou usado.'
  },
  {
    name: 'A Sombra da Teia',
    type: '🕷️ Tenente das Trevas — Antagonista',
    desc: 'Não tem forma fixa. Aparece como uma figura encurvada coberta de trapos negros que se movem sozinhos. Sussurros onde deveria haver voz. Olhos como buracos.',
    motivation: 'Não serve ao Senhor das Sombras por lealdade — serve por medo. Se vislumbrar uma saída, pode ser convencido a trair o amo.'
  }
];

function getRandomNPC() {
  return npcs[Math.floor(Math.random() * npcs.length)];
}

function getNPCFromStatic() {
  return npcs[Math.floor(Math.random() * npcs.length)];
}

function getNPCActionMessage(npcName, action) {
  return (
    `⚔️ *[PERSONAGEM — ${npcName}]*\n\n` +
    `_${action}_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// ─── Cenas por Turno ─────────────────────────────────────────────────────────
const scenes = [
  `Exterior das Ruínas de Khazad-Tor. Chuva fria. Dois pilares caídos na entrada principal. Passagem lateral coberta de hera. Torre norte ainda de pé com abertura no segundo andar.`,
  `Corredor interno, térreo. Pedras cobertas de musgo e inscrições em anão antigo. Tochas acesas recentemente — alguém esteve aqui. Bifurcação à frente: luz à esquerda, escuridão à direita.`,
  `Salão das Colunas. Korthul em posição defensiva. Cinco runas vermelhas ao redor do altar central. Guardiões de Pedra enfileirados nas paredes.`,
  `Câmara do Fragmento. O Fragmento de Anar pulsa em luz dourada sobre o altar negro. As runas brilham. Os Guardiões se movem. O teto treme.`,
  `Tudo desmorona. Cinquenta passos até a saída. Pedras caindo. Korthul em colapso atrás de vocês. Algo maior aguarda lá fora na chuva.`
];

function getSceneDescription(turn) {
  const idx = Math.min(turn - 1, scenes.length - 1);
  return scenes[Math.max(0, idx)];
}

function getTurnNarrative(turn) {
  const idx = Math.min(turn - 2, turnNarratives.length - 1);
  return turnNarratives[Math.max(0, idx)];
}

// ─── Encerramento ────────────────────────────────────────────────────────────
const outro = `
🏔️ *[ CAMPANHA ENCERRADA — O FRAGMENTO DE ANAR ]*

As Ruínas de Khazad-Tor ficaram para trás. O Fragmento — seja lá em que mãos — mudará o destino de Eriador.

O que aconteceu aqui será cantado pelos bardos ou enterrado com os que falharam.

_Obrigado por jogar. Para nova sessão, use *!iniciar*._
`.trim();

// ─── Ajuda ───────────────────────────────────────────────────────────────────
const help = `
📖 *COMANDOS DO BOT — CampanhaMedieval*

*— Para todos os heróis —*
*!personagem [desc]* — Registra seu herói
*!acao [desc]* — Declara uma ação e rola D20
*!d20* — Rola um dado livremente
*!jogadores* — Lista todos os heróis
*!npcs* — Lista personagens criados pelo Mestre
*!npc* — Apresenta um personagem da cena
*!status* — Status da campanha
*!ajuda* — Exibe este menu

*— Exclusivo do Mestre 🎭 —*
*!mestre* — Reivindica o papel de Mestre
*!iniciar* — Inicia a campanha
*!turno* — Avança para o próximo turno
*!encerrar* — Encerra a sessão
*!cena* — Descreve a situação atual
*!definirDC [número]* — Define DC da próxima ação
*!criarNPC nome | tipo | desc | motivação* — Cria um personagem
*!acaoNPC nome | ação* — Declara ação de um personagem

━━━━━━━━━━━━━
🎲 *Sistema de Dados:*
• D20 ≥ Dificuldade = Sucesso ✅
• D20 = 20 → Acerto Crítico 🌟 _(digno de canção!)_
• D20 = 1 → Falha Crítica 💥 _(os bardos não vão cantar isso)_
`.trim();

const helpPrivate = `
👋 Saudações, viajante! Sou o guardião da *CampanhaMedieval*.

Para jogar, entre no grupo e use *!ajuda* para ver os comandos disponíveis.
`.trim();

module.exports = {
  intro,
  turn1Opening,
  outro,
  help,
  helpPrivate,
  getActionNarrative,
  getTurnNarrative,
  getSceneDescription,
  getRandomNPC,
  getNPCFromStatic,
  getNPCActionMessage
};
