# Prompt de Criação — CampanhaCyberpunk Bot

Este documento registra o prompt original que deu origem ao projeto, conforme descrito pelo usuário.

---

## Prompt Original

> Você é um mestre de RPG no tema cyberpunk e quer mestrar uma aventura para jogadores pelo WhatsApp.
>
> Um grupo do WhatsApp é criado chamado CampanhaCyberpunk e os membros que estão nele iniciarão fazendo uma descrição de seus personagens.
>
> O mestre de campanha criará os NPCs ou personagens do mestre que comporão a aventura, também chamada de campanha. Iniciará a aventura descrevendo o cenário de aventura.
>
> O jogo é dividido em turnos. Cada turno é composto por uma ação de cada personagem membro do grupo do WhatsApp e dos NPCs; depois vem uma nova narrativa do mestre e inicia-se o próximo turno.
>
> Quando houver uma ação de combate, sorte, percepção para observar detalhes do cenário ou acontecimentos do turno, o jogador (membro do grupo, pessoa real) deverá jogar um dado de 20 faces, também chamado D20. Um valor deve ser estabelecido como grau de dificuldade para a ação, ao qual o membro deverá jogar o dado de forma virtual — pode até ser uma funcionalidade do bot — e o valor deverá ser maior ou igual ao grau de dificuldade indicado.
>
> Caso caia o valor 1, é considerado um erro crítico e uma ação desastrosa deve acontecer. Se cair 20, é um acerto crítico e algo extraordinário deve acontecer para aquela ação.
>
> **Exemplo:** O jogador decide atirar da janela de seu apartamento com sua arma de fogo calibre 9 milímetros contra um assaltante que está em frente a um café, dando cobertura a outro assaltante que está dentro do café ameaçando e exigindo o dinheiro que está no caixa. Na ação, ao jogar o dado onde o grau de dificuldade de acertar o assaltante seja 13:
>
> - Se o número apresentado pelo D20 for **14**: ele acerta o assaltante, que cai no chão de dor.
> - Se o valor do dado for **20**: ele acerta o braço do assaltante, atravessando e quebrando a vidraça, chamando a atenção dos policiais à paisana que estavam passando perto do local, que logo imobilizam os dois assaltantes.
> - Se o valor do dado jogado pelo jogador for **1**: a arma explode por que havia um defeito na câmara da arma, amputando dois dedos do jogador e chamando a atenção das pessoas do lado de fora do apartamento.

---

## Interpretação Técnica

O prompt estabeleceu os seguintes requisitos que guiaram a arquitetura do sistema:

| Requisito do Prompt | Implementação |
|---------------------|---------------|
| Mestre com papel exclusivo | Comando `!mestre`, guard `replyIfNotGM()` em comandos restritos |
| Jogadores descrevem personagens | Comando `!personagem [descrição]` com texto livre |
| Mestre cria NPCs | Comando `!criarNPC nome \| tipo \| descrição \| motivação` |
| Turnos com ação por jogador + NPCs | `actedThisTurn` Set, notificação automática, `!acaoNPC` |
| Dado D20 virtual | `rollD20()` em `dice.js`, integrado ao `!acao` |
| Grau de dificuldade por tipo de ação | `getDCForAction()` por palavras-chave; `!definirDC` para override manual |
| Acerto crítico (20) — algo extraordinário | Arrays de narrativas críticas variadas por tipo de ação |
| Falha crítica (1) — desastre com consequências | Arrays de narrativas de falha crítica com efeitos duradouros (ferimentos, alertas, explosões) |
| Exemplo do tiro: margem importa | `getMarginFlavor()` distingue "por um fio" de "execução impecável" |
| Narrativa automática do mestre | `getActionNarrative()` gera texto contextual após cada `!acao` |
