// ─── Abertura da Campanha ────────────────────────────────────────────────────
const intro = `
🌆 *[ CAMPANHA CYBERPUNK — NEON CITY 2087 ]*

A megacorporação *OmniTech* domina 73% da economia de Neon City. Leis são sugestões. A polícia trabalha para quem paga mais. E vocês — mercenários, hackers, sobreviventes — estão prestes a fazer o trabalho mais perigoso de suas vidas.

Uma fixer chamada *Zara "Espinho" Vasquez* os contratou. A missão: infiltrar o *Armazém 9-Delta* na Zona Industrial e recuperar um chip de dados comprometedores sobre o CEO da OmniTech antes que ele desapareça para sempre.

Pagamento: 80.000 créditos digitais. Adiantamento: já transferido.

⚠️ _Ninguém falha trabalho da Zara e continua vivo._
`.trim();

// ─── Abertura do Turno 1 ─────────────────────────────────────────────────────
const turn1Opening = `
━━━━━━━━━━━━━━━━━━━━━━
⏱️ *TURNO 1 — APROXIMAÇÃO*
━━━━━━━━━━━━━━━━━━━━━━

🎭 *[MESTRE]:* A chuva ácida cai sobre as ruas de neon da Zona Industrial. São 23h47. O *Armazém 9-Delta* está a 200 metros — um prédio cinzento de 4 andares com câmeras de segurança na entrada principal.

Visível daqui:
• 🚪 *Entrada de carga* — fechada, dois seguranças visíveis
• 🔩 *Saída de incêndio lateral* — enferrujada, sem guardas aparentes
• 🌐 *Antena no telhado* — parece ser o nó de comunicação local

_Declarem suas ações com *!acao [descrição]*_
_Exemplo: !acao Observo a movimentação dos guardas pela entrada de carga_
`.trim();

// ─── Narrativas por Turno ────────────────────────────────────────────────────
const turnNarratives = [
  // Turno 2
  `A saída de incêndio cede com um rangido metálico ensurdecedor. Por três segundos que parecem eternos, ninguém reage — depois o alarme interno começa a piscar em vermelho. Vocês têm minutos antes do reforço chegar. No corredor interno, fileiras de contêineres de aço bloqueiam a visão. No fundo, uma luz azul-ciano pulsa — o servidor.`,

  // Turno 3
  `Um dos seguranças fala no rádio: *"Setor B, verificar anomalia."* Passos pesados ecoam no metal acima de vocês. Há uma escotilha de acesso 3 metros à frente. Ao lado, um terminal de controle — tela ligada, ninguém operando. A Zara manda mensagem criptografada: _"Cuidado. Minha fonte diz que tem alguém de dentro trabalhando pra OmniTech."_`,

  // Turno 4
  `*ALERTA DE SEGURANÇA NÍVEL 2.* Drones de patrulha são ativados no andar superior. O chip está num cofre biométrico *Sentinel-3* — precisa de impressão digital de nível gerencial. O gerente de turno, um homem nervoso de meia-idade chamado *Sr. Petrov*, está trancado na sala de controle no 2º andar. Ele sabe que vocês estão aqui.`,

  // Turno 5
  `O Sr. Petrov quebrou — cooperou após uma conversa _muito persuasiva_. O cofre abre. Mas o chip não está lá. Em seu lugar, um bilhete físico: *"Chegaram tarde. —V"* Uma silhueta some pela janela do 2º andar. Alguém chegou antes de vocês. Ainda dá pra alcançar — se correrem agora.`,

  // Turno 6+
  `A perseguição leva ao telhado. A cidade de neon se estende 360° ao redor. A figura — uma mulher com implantes oculares brilhando em violeta — aponta uma arma para o chip e sorri: *"Eu trabalho pra mesma pessoa que vocês. Só que minha versão da missão é diferente."* Ela joga o chip para o alto. Todos têm um segundo para reagir.`
];

// ─── Narrativas de Resultado de Ação ────────────────────────────────────────

// Arrays de narrativas por tipo de ação — selecionados aleatoriamente para variedade

const _critSuccessNarratives = {
  'atirar|disparar|atacar': [
    `O tiro é cirúrgico. O projétil perfura o ombro do alvo com precisão milimétrica — ele gira e cai contra a parede, derrubando caixas que bloqueiam a câmera de segurança. *Trabalho limpo. Sem testemunhas eletrônicas.*`,
    `O projétil atravessa o braço do alvo e estilhaça o vidro atrás dele. O barulho atrai dois policiais encobertos que estavam na viela — eles dominam o segundo guarda antes que você precise agir. *Consequência inesperada, resultado favorável.*`,
    `Headshot limpo. O alvo cai sem emitir um som. Ao verificar o corpo, você encontra um comunicador ainda ativo — a próxima mensagem da OmniTech chega em tempo real. *Vocês têm inteligência de fonte primária.*`,
    `Além de neutralizar o alvo, o projétil atravessa a câmera de segurança atrás dele, apagando os registros dos últimos 10 minutos. *Trabalho impecável.*`
  ],
  'hackear|invadir|sistema|terminal|dados': [
    `Não só invadiu o sistema — você encontrou uma backdoor esquecida do desenvolvedor original. *Acesso total. Câmeras desativadas. Logs apagados.* A OmniTech não vai saber que você esteve aqui até ser tarde demais.`,
    `O sistema cede e revela mais do que o esperado: uma lista de pagamento de seguranças corruptos e a localização exata do chip. *Você tem um mapa completo do que era para ser um labirinto.*`,
    `Acesso total obtido. E um bônus: você encontrou o arquivo pessoal do gerente Petrov. Ele tem família. Tem fraquezas. Tem medos. *A negociação ficou muito mais fácil.*`,
    `A invasão vai fundo demais e expõe um protocolo secreto: há uma saída de emergência desbloqueada no subsolo que não aparece em nenhuma planta oficial. *Rota de fuga garantida.*`
  ],
  'esconder|infiltrar|furtivo|silencioso|ocultar': [
    `Invisível como sombra de neon. Você passa pelo corredor enquanto dois guardas conversam a um metro de você — e intercepta a frequência do rádio deles. *Agora você ouve cada movimento da segurança em tempo real.*`,
    `Tão furtivo que o cão de guarda para de farejar e deita. Você aproveita para mapear todos os pontos cegos das câmeras. *Cobertura perfeita — e um corredor livre pela frente.*`,
    `Um guarda passa por você e acha que é uma sombra. Ele vai verificar outra área, deixando o corredor desimpedido por pelo menos 3 minutos. *Janela aberta.*`,
    `Sua infiltração é tão silenciosa que você passa despercebido e ainda consegue marcar a posição de todos os guardas no andar. *O grupo inteiro tem vantagem nas próximas ações de movimento.*`
  ],
  'observar|perceber|notar|ouvir|detectar|procurar': [
    `Seus olhos captam o detalhe que muda tudo: um dos "seguranças" usa a insígnia da OmniTech virada ao contrário — sinal de agente encoberto hostil. *Vocês sabem em quem não confiar antes mesmo de entrar.*`,
    `Você nota o padrão da ronda: 90 segundos de janela entre as passagens. Mais importante — o guarda da saída lateral manca levemente. *Se precisar fugir por ali, ele não vai dar problema.*`,
    `A análise revela uma câmera com campo de visão comprometido por condensação de vapor industrial. *Há um corredor invisível direto para o servidor.*`,
    `Você identifica o ponto fraco da grade de segurança: um sensor de movimento com bateria fraca que pisca a cada 45 segundos. *Timing é tudo — e agora vocês têm o timing.*`
  ]
};

const _critFailNarratives = {
  'atirar|disparar|atacar': [
    `⚠️ *FALHA CRÍTICA:* A arma trava num defeito de câmara com um estralo seco e violento. O recuo arranca dois dedos. Você está sangrando e gritando — *todo o armazém ouviu.* Status: _Ferido / Exposto._`,
    `⚠️ *FALHA CRÍTICA:* O tiro desvia no pior ângulo possível — acerta uma tubulação de gás. Uma chama azul começa a lamber o teto. *Vocês têm minutos antes do incêndio tornar o andar inabitável.*`,
    `⚠️ *FALHA CRÍTICA:* A arma explode na mão. Sua cobertura está destruída, sua posição revelada, e o barulho acordou até os guardas que estavam cochilando. *Todo o andar sabe onde você está.*`,
    `⚠️ *FALHA CRÍTICA:* O tiro ricocheteou e acertou um contêiner pressurizado. A explosão derruba duas prateleiras e ativa o alarme de incêndio. *Luzes vermelhas inundam o corredor.*`
  ],
  'hackear|invadir|sistema|terminal|dados': [
    `⚠️ *FALHA CRÍTICA:* O sistema detecta a intrusão e contra-ataca com um vírus de retorno. Seu dispositivo superaquece e desliga permanentemente. *Um alerta automático foi para a segurança — eles sabem que há um hacker no prédio.*`,
    `⚠️ *FALHA CRÍTICA:* Você inadvertidamente ativou o protocolo de lockdown do Setor A. Grades de aço descem em todas as saídas do andar. *Você criou sua própria armadilha.*`,
    `⚠️ *FALHA CRÍTICA:* O firewall capturou seu identificador de chip neural. A OmniTech agora sabe quem você é. *Seu perfil completo aparece na tela antes de você conseguir fechar a conexão.*`,
    `⚠️ *FALHA CRÍTICA:* O contra-ataque digital provoca uma descarga elétrica pelo implante. Você sofre um curto-circuito temporário — *status: Atordoado por 1 turno. Sem ações ofensivas.*`
  ],
  'esconder|infiltrar|furtivo|silencioso|ocultar': [
    `⚠️ *FALHA CRÍTICA:* Você tropeça num contêiner metálico com estrondo ensurdecedor. Três guardas viram ao mesmo tempo. *Cobertura comprometida — e um deles já está no rádio.*`,
    `⚠️ *FALHA CRÍTICA:* Ao tentar se ocultar, você ativa um sensor de movimento que não tinha visto. Holofotes inundam o corredor. *Sirene de alerta nível 1 ativada.*`,
    `⚠️ *FALHA CRÍTICA:* Você se esconde no lugar errado — atrás de uma grade ventilada que colapsa sob seu peso. Você cai no andar de baixo com um impacto audível. *Status: Atordoado por 1 turno.*`,
    `⚠️ *FALHA CRÍTICA:* Um guarda tropeça em você no escuro. Ele não identificou sua face ainda — mas o alarme que ele disparou no rádio já foi. *Todos os seguranças do andar estão em alerta máximo.*`
  ],
  'observar|perceber|notar|ouvir|detectar|procurar': [
    `⚠️ *FALHA CRÍTICA:* Você se concentra tanto na observação que não percebe o guarda se aproximando por trás. *Ele viu seu rosto. Se sair daqui, vai saber descrever você.*`,
    `⚠️ *FALHA CRÍTICA:* Sua tentativa de observar aciona um sensor de presença embutido na parede. *Um drone de patrulha é redirecionado para sua posição — chegará em 30 segundos.*`,
    `⚠️ *FALHA CRÍTICA:* Você interpretou completamente errado o que viu — e tomou uma decisão baseada em informação falsa. O grupo age com base numa premissa errada. *O Mestre revelará as consequências no próximo turno.*`
  ]
};

const _successNarratives = {
  'observar|perceber|notar|ouvir|detectar|procurar': [
    `Você nota algo importante: a troca de turno dos guardas acontece em 4 minutos. *Uma janela de oportunidade.*`,
    `Seus sentidos captam o padrão das câmeras — 8 segundos de rotação, 2 segundos de ponto cego na esquina esquerda. *Timing calculado.*`,
    `Você identifica que um dos guardas está distraído com o celular. *Vulnerabilidade confirmada.*`
  ],
  'hackear|invadir|sistema|terminal|dados': [
    `Acesso obtido. *Você tem 90 segundos antes que o sistema detecte a sessão aberta.* Use bem o tempo.`,
    `Dentro do sistema. Você localiza o mapa de segurança do andar — câmeras, sensores, zonas de patrulha. *Dados baixados.*`,
    `Invasão bem-sucedida. Um alerta foi suprimido antes de disparar. *Janela de 2 minutos sem monitoramento ativo.*`
  ],
  'atirar|disparar|atacar|golpear|cortar|esfaquear': [
    `Alvo neutralizado. Mas o som chamou atenção — *alguém no andar acima parou de se mover.*`,
    `Golpe certeiro. O alvo cai sem barulho excessivo. *Caminho desobstruído — por enquanto.*`,
    `Ação executada. O alvo está fora de combate. *Um guarda no corredor adjacente olhou na sua direção — mas não confirmou nada ainda.*`
  ],
  'esconder|infiltrar|furtivo|silencioso|ocultar': [
    `Você se moveu sem ser detectado. *O corredor está livre por mais alguns minutos.*`,
    `Passagem bem-sucedida. *Um guarda passou a menos de meio metro — mas não percebeu.*`,
    `Infiltração concluída. *Você está na posição desejada sem alertar ninguém.*`
  ],
  'convencer|negociar|blefar|enganar|persuadir': [
    `Suas palavras tiveram efeito. *O alvo hesitou — isso é o suficiente para continuar.*`,
    `Argumento aceito. *A situação está mais favorável, mas ele ainda não está totalmente convencido.*`,
    `Blefe bem executado. *A pessoa acreditou por agora — mas qualquer inconsistência vai desfazer isso.*`
  ],
  'curar|tratar|estabilizar|medikit': [
    `Tratamento aplicado. *O ferimento foi estabilizado — sem risco imediato de vida.*`,
    `Medicação administrada. *O alvo está estável. Não está ótimo, mas está de volta ao combate.*`
  ]
};

const _failNarratives = {
  'atirar|disparar|atacar|golpear|cortar|esfaquear': [
    `O tiro erra e espatifa uma lâmpada. *Fragmentos de vidro. O alvo se joga atrás de um contêiner.*`,
    `O golpe foi desviado. *O alvo recuou, mas está em posição de contra-atacar.*`,
    `Tiro disperso — acertou a parede. *O barulho foi suficiente para chamar atenção.*`
  ],
  'hackear|invadir|sistema|terminal|dados': [
    `O firewall resistiu. Você não entrou — mas plantou um sniffer passivo. *Na próxima tentativa, o DC cai em 2.*`,
    `Acesso negado. Um log de tentativa foi registrado. *Se tentarem de novo logo, vão acionar um alerta.*`,
    `Invasão bloqueada. *O sistema agora está em estado de alerta passivo — mais difícil na próxima.*`
  ],
  'esconder|infiltrar|furtivo|silencioso|ocultar': [
    `Você está parcialmente encoberto, mas *um guarda olhou um instante longo demais na sua direção.*`,
    `Movimento detectado — não identificado ainda. *Um guarda se aproxima para verificar a área.*`,
    `Cobertura comprometida. *Você precisa se reposicionar antes do próximo turno ou será encontrado.*`
  ],
  'observar|perceber|notar|ouvir|detectar|procurar': [
    `Você procurou, mas o ambiente é confuso demais. *Nada de útil identificado desta posição.*`,
    `A observação foi inconclusiva. *Você perdeu tempo que poderia ter sido usado de outra forma.*`
  ],
  'convencer|negociar|blefar|enganar|persuadir': [
    `A tentativa de persuasão falhou. *O alvo está mais desconfiado agora do que antes.*`,
    `Seu blefe foi lido. *A situação ficou mais tensa — outra abordagem é necessária.*`
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
  if (margin >= 7) return `\n_Execução impecável — margem de ${margin} acima da dificuldade._`;
  if (margin >= 4) return `\n_Sucesso confortável._`;
  if (margin === 1) return `\n_Por um fio — mas funcionou._`;
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
    return `Uma execução impecável. Além do resultado esperado, você percebe uma vantagem não planejada — o ambiente reage a seu favor de forma inesperada.`;
  }

  if (critFail) {
    const bucket = _matchKey(lower, _critFailNarratives);
    if (bucket) return _pickRandom(bucket);
    return `⚠️ *FALHA CRÍTICA:* Algo deu terrivelmente errado. As consequências se espalham além do esperado — o grupo inteiro sofre os efeitos.`;
  }

  if (success) {
    const bucket = _matchKey(lower, _successNarratives);
    const base = bucket
      ? _pickRandom(bucket)
      : `Ação bem-sucedida. O caminho à frente está um pouco mais claro agora.`;
    return base + _getMarginFlavor(margin);
  }

  // Falha normal
  const failBucket = _matchKey(lower, _failNarratives);
  if (failBucket) return _pickRandom(failBucket);
  return `A ação não saiu como planejado. O ambiente fica ligeiramente mais hostil.`;
}

// ─── NPCs Estáticos ───────────────────────────────────────────────────────────
const npcs = [
  {
    name: 'Guardião-7',
    type: '🤖 Segurança Cibernético — OmniTech',
    desc: 'Dois metros de músculo e aço. Braço direito substituído por implante militar com arma integrada. Rosto coberto por visor tático.',
    motivation: 'Cumprir ordens. Sem exceções. Sem negociação.'
  },
  {
    name: 'Dra. Lyra Vex',
    type: '🧬 Cientista Renegada',
    desc: 'Ex-pesquisadora sênior da OmniTech. Cabelo branco, olhos dourados (implantes). Carrega o código de acesso ao cofre.',
    motivation: 'Quer sair de Neon City viva. Troca o código por proteção e passagem segura.'
  },
  {
    name: 'Slice',
    type: '💻 Ladrão de Dados Freelancer',
    desc: 'Jovem andrógino com dedos cobertos de implantes de interface direta. Trabalha para quem pagar mais.',
    motivation: 'Dinheiro agora. Lealdade é um produto como qualquer outro.'
  },
  {
    name: 'Coronel "Ferrão" Matos',
    type: '🔫 Segurança Privada — Mercenário',
    desc: 'Veterano de guerra corporativa. Cicatrizes cobrindo metade do rosto. Lidera um esquadrão de 4 homens.',
    motivation: 'Foi contratado pela OmniTech especificamente para impedir esta missão.'
  },
  {
    name: 'Zara "Espinho" Vasquez',
    type: '🕵️ Fixer — Empregadora',
    desc: 'Aparece apenas via holograma. Mulher de 40 anos, olhar calculista, fala sempre em sussurro.',
    motivation: 'Quer o chip. Por que? Essa resposta custa mais 80.000 créditos.'
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
    `🤖 *[NPC — ${npcName}]*\n\n` +
    `_${action}_\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━`
  );
}

// ─── Cenas por Turno ─────────────────────────────────────────────────────────
const scenes = [
  `Exterior do Armazém 9-Delta. Chuva ácida. Dois guardas na entrada principal. Saída de incêndio lateral sem vigilância visível. Antena de comunicação no telhado.`,
  `Corredor interno, Térreo. Contêineres de aço empilhados. Câmeras em rotação a cada 8 segundos. Luz azul-ciano pulsando no fundo — o servidor.`,
  `Setor B, Térreo. Terminal de controle sem operador. Escotilha para o subsolo. Passos de guarda ouvidos no 1º andar.`,
  `Sala de Controle, 2º Andar. O cofre Sentinel-3. O Sr. Petrov, suando frio. Drones de patrulha circulando pelo corredor externo.`,
  `2º Andar → Telhado. Janela quebrada. Silhueta fugindo. O chip em jogo.`,
  `Telhado. Vista panorâmica de Neon City. A mulher de olhos violeta. Um segundo para reagir.`
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
🏁 *[ CAMPANHA ENCERRADA ]*

A noite de Neon City continua — mas a missão chegou ao fim.

O que aconteceu aqui... ficará registrado nas memórias de implante de quem sobreviveu.

_Obrigado por jogar. Para nova sessão, use *!iniciar*._
`.trim();

// ─── Ajuda ───────────────────────────────────────────────────────────────────
const help = `
📖 *COMANDOS DO BOT — CampanhaCyberpunk*

*— Para todos os jogadores —*
*!personagem [desc]* — Registra seu personagem
*!acao [desc]* — Declara uma ação e rola D20
*!d20* — Rola um dado livremente
*!jogadores* — Lista todos os jogadores
*!npcs* — Lista NPCs criados pelo Mestre
*!npc* — Apresenta um NPC na cena
*!status* — Status da campanha
*!ajuda* — Exibe este menu

*— Exclusivo do Mestre 🎭 —*
*!mestre* — Reivindica o papel de Mestre
*!iniciar* — Inicia a campanha
*!turno* — Avança para o próximo turno
*!encerrar* — Encerra a sessão
*!cena* — Descreve a situação atual
*!definirDC [número]* — Define DC da próxima ação
*!criarNPC nome | tipo | desc | motivação* — Cria um NPC
*!acaoNPC nome | ação* — Declara ação de um NPC

━━━━━━━━━━━━━
🎲 *Sistema de Dados:*
• D20 ≥ Dificuldade = Sucesso ✅
• D20 = 20 → Acerto Crítico 🌟
• D20 = 1 → Falha Crítica 💥
`.trim();

const helpPrivate = `
👋 Olá! Sou o bot da *CampanhaCyberpunk*.

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
