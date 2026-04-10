# Arquitetura — CampanhaCyberpunk Bot

## Visão Geral

O sistema é uma aplicação Node.js de processo único que conecta a API não-oficial do WhatsApp Web a um motor de RPG em memória. Não há servidor HTTP, banco de dados ou interface gráfica — toda a interação acontece via mensagens de texto no WhatsApp.

```
WhatsApp Web (Puppeteer)
        │
        │  eventos de mensagem
        ▼
    bot.js  ──── roteamento de comandos
        │
   ┌────┼────────────────────┐
   │    │                    │
   ▼    ▼                    ▼
dice.js  narratives.js  gameManager.js
(dados)  (conteúdo)     (estado)
```

---

## Módulos

### `bot.js` — Entrada e Roteamento

Responsabilidades:
- Inicializar o cliente WhatsApp (`whatsapp-web.js`) com autenticação local persistente
- Filtrar mensagens: apenas grupos são processados; DMs recebem apenas `!ajuda`
- Manter o Map `games: Map<groupId, GameManager>` — uma instância por grupo, criada na primeira mensagem
- Rotear comandos via `startsWith()` / igualdade de string para os handlers
- Aplicar o guard `replyIfNotGM()` nos comandos exclusivos do Mestre
- Orquestrar a sequência de mensagens (ação → formatação → sleep → narrativa → verificação de turno completo)

**Não contém lógica de negócio** — delega tudo para os módulos abaixo.

---

### `gameManager.js` — Estado do Jogo

Cada instância de `GameManager` representa uma campanha em um grupo específico. É a única fonte de verdade sobre o estado do jogo.

**Propriedades de estado:**

```
groupId         string          ID do grupo WhatsApp
started         boolean         campanha ativa
ended           boolean         campanha encerrada
turn            number          turno atual (1-indexed)
startedAt       Date            timestamp de início
gmId            string|null     userId do Mestre
phase           'player'|'npc'  fase do turno atual
actedThisTurn   Set<userId>     jogadores que já agiram neste turno
customDC        number|null     DC definido pelo Mestre para próxima ação
players         Map<userId, PlayerObj>
actionLog       ActionEntry[]
dynamicNpcs     NPCObj[]
npcActionLog    NPCActionEntry[]
```

**Estrutura PlayerObj:**
```js
{
  name: string,
  character: string,
  actions: ActionEntry[]
}
```

**Estrutura ActionEntry:**
```js
{
  turn, from, name, action,
  roll, dc,
  success,   // roll===20 || (roll!==1 && roll>=dc)
  critical,  // roll===20
  critFail,  // roll===1
  timestamp
}
```

**Fluxo de turno dentro do GameManager:**

```
start()
  └─ actedThisTurn = new Set(), phase = 'player'

markActed(userId)
  └─ retorna { allActed: true } apenas quando o ÚLTIMO jogador age pela primeira vez no turno

startNPCPhase()
  └─ phase = 'npc'

nextTurn()
  └─ turn++, actedThisTurn = new Set(), phase = 'player', customDC = null
```

**DC customizado — ciclo de vida:**
```
!definirDC 15 → setCustomDC(15)
!acao ...     → getDifficultyForAction() chama consumeCustomDC() → retorna 15, zera customDC
próxima !acao → customDC é null, usa getDCForAction() normalmente
```

---

### `dice.js` — Dados e Dificuldade

Funções exportadas:

| Função | Descrição |
|--------|-----------|
| `rollD20()` | `Math.floor(Math.random() * 20) + 1` |
| `formatDiceResult(name, roll, dc)` | Formata resultado com emoji, status e detalhe para WhatsApp |
| `getDCForAction(actionText)` | Retorna DC 11–15 baseado em palavras-chave da descrição |

**Tabela de DCs padrão:**

| Palavras-chave | DC |
|----------------|----|
| atirar, disparar, atacar, golpear | 13 |
| esconder, infiltrar, furtivo, silencioso | 14 |
| hackear, invadir, sistema, terminal | 15 |
| observar, perceber, notar, ouvir | 11 |
| convencer, negociar, blefar, persuadir | 12 |
| correr, pular, escalar, fugir | 12 |
| curar, tratar, estabilizar | 14 |
| (padrão) | 12 |

**Lógica de resultado:**
```
roll === 20          → Acerto Crítico (independe do DC)
roll === 1           → Falha Crítica (independe do DC)
roll >= dc && roll≠1 → Sucesso
roll < dc            → Falha
```

---

### `narratives.js` — Conteúdo Narrativo

Contém todo o texto da campanha e as funções de geração de narrativa.

**Conteúdo estático:**
- `intro` — abertura da campanha
- `turn1Opening` — narração do turno 1
- `turnNarratives[]` — narração dos turnos 2 a 6+
- `scenes[]` — descrição de cena por turno
- `npcs[]` — 5 NPCs pré-escritos da campanha
- `outro` — encerramento
- `help` / `helpPrivate` — textos de ajuda

**Geração dinâmica de narrativas:**

`getActionNarrative(action, roll, dc, margin)` seleciona narrativa baseada em:
1. Tipo de resultado: crítico, falha crítica, sucesso, falha
2. Tipo de ação: palavra-chave na descrição (atirar, hackear, esconder, observar, etc.)
3. Margem de sucesso: `margin = roll - dc`, appended como flavor text

Cada bucket (tipo × resultado) contém um array de 3–4 narrativas. A seleção é aleatória (`Math.random()`), garantindo variedade entre sessões.

**Funções exportadas:**

| Função | Uso |
|--------|-----|
| `getActionNarrative(action, roll, dc, margin)` | Narrativa pós-ação |
| `getTurnNarrative(turn)` | Narrativa de abertura do turno |
| `getSceneDescription(turn)` | Descrição da cena atual |
| `getRandomNPC()` | NPC aleatório do pool estático |
| `getNPCFromStatic()` | Alias de `getRandomNPC()` para uso em mesclagem com pool dinâmico |
| `getNPCActionMessage(npcName, action)` | Formata declaração de ação de NPC |

---

## Fluxo Completo de uma Ação

```
Jogador envia: "!acao atirar no guarda pela janela"
                        │
                        ▼
              bot.js: body.startsWith('!acao')
                        │
              game.getDifficultyForAction(actionDesc)
                  │
                  ├─ consumeCustomDC() → retorna DC do Mestre se definido
                  └─ getDCForAction()  → analisa palavras-chave → DC 13
                        │
                        ▼
              rollD20() → ex: 17
                        │
              game.logAction(from, name, actionDesc, 17, 13)
                  └─ success: true, critical: false, critFail: false
                        │
              chat.sendMessage(formatDiceResult(...))
                        │  [1 segundo de delay]
                        │
              margin = 17 - 13 = 4
              getActionNarrative('atirar...', 17, 13, 4)
                  └─ bucket 'atirar|disparar|atacar', sucesso normal
                  └─ _pickRandom([...]) → narrativa aleatória
                  └─ + _getMarginFlavor(4) → "\n_Sucesso confortável._"
                        │
              chat.sendMessage("🎭 *[MESTRE]:* ...")
                        │
              game.markActed(from)
                  └─ allActed? → se sim: notificação + game.startNPCPhase()
```

---

## Gerenciamento de Múltiplos Grupos

O Map `games` em `bot.js` isola completamente o estado entre grupos:

```
games = {
  "120363000000@g.us" → GameManager { gmId: "5511...", turn: 3, ... }
  "120363000001@g.us" → GameManager { gmId: null,    turn: 0, ... }
}
```

Cada grupo tem sua própria campanha, Mestre, jogadores e histórico de ações. Não há comunicação entre grupos.

---

## Autenticação WhatsApp

A sessão é persistida em `.wwebjs_auth/` via `LocalAuth({ clientId: 'rpg-cyberpunk-bot' })`. Após o primeiro scan do QR code, reinicializações subsequentes reconectam automaticamente sem nova autenticação.

```
.wwebjs_auth/
└── session-rpg-cyberpunk-bot/   ← cookies e dados de sessão do Puppeteer
```

Para forçar nova autenticação: `rm -rf .wwebjs_auth && node bot.js`

---

## Diagrama de Sequência — Início de Campanha

```
Mestre          Bot             WhatsApp Group
  │                │                  │
  │─ !mestre ─────►│                  │
  │                │── claimGM() ─────►│
  │                │◄─ success ────────│
  │                │── "X assumiu papel de MESTRE" ──►│
  │                │                  │
  │─ !iniciar ────►│                  │
  │                │── isGM()? sim ───►│
  │                │── game.start() ──►│
  │                │── intro ─────────►│
  │                │   [1.5s]          │
  │                │── turn1Opening ──►│
  │                │                  │
Jogador1           │                  │
  │─ !personagem ─►│                  │
  │                │── registerPlayer()►│
  │                │── "entrou!" ─────►│
  │                │                  │
  │─ !acao atacar ►│                  │
  │                │── getDC() → 13   │
  │                │── rollD20() → 17 │
  │                │── logAction()    │
  │                │── formatResult() ►│
  │                │   [1s]           │
  │                │── narrative ─────►│
  │                │── markActed()    │
  │                │   allActed? não  │
```
