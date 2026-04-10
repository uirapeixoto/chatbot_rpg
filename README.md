# CampanhaCyberpunk — Bot WhatsApp RPG

Bot de RPG Cyberpunk para grupos de WhatsApp com sistema de Mestre, turnos por fase, rolagem de D20 e narrativa automática contextual.

---

## Requisitos

- Node.js 18 ou superior
- Chrome/Chromium instalado no sistema
- Uma conta WhatsApp (número real)

---

## Instalação

```bash
npm install
node bot.js
```

Na primeira execução, um QR Code aparecerá no terminal.
Escaneie com o WhatsApp: **Dispositivos conectados → Conectar dispositivo**

A sessão é salva automaticamente — reinicializações subsequentes não precisam de novo scan.

---

## Como Jogar

### 1. Defina o Mestre
```
!mestre
```
O primeiro a usar o comando assume o papel de Mestre da campanha. Apenas o Mestre pode iniciar, encerrar, avançar turnos e criar NPCs.

### 2. Jogadores registram personagens
```
!personagem Kai Tanaka — ex-policial corporativo, implante ocular, braço cibernético esquerdo
```

### 3. Mestre inicia a campanha
```
!iniciar
```

### 4. Jogadores declaram ações (o bot rola o D20 automaticamente)
```
!acao Observo a movimentação dos guardas pela janela
!acao Tento hackear o terminal de controle
!acao Cubro meus companheiros com a pistola enquanto eles avançam
```

Quando todos os jogadores registrados agirem, o bot notifica o grupo e passa para a fase dos NPCs.

### 5. Mestre reage com os NPCs
```
!acaoNPC Guardião-7 | Avança pelo corredor varrendo o ambiente com o sensor térmico
```

### 6. Mestre avança o turno
```
!turno
```

---

## Comandos

### Para todos os jogadores

| Comando | Descrição |
|---------|-----------|
| `!personagem [desc]` | Registra seu personagem |
| `!acao [descrição]` | Declara ação e rola D20 automaticamente |
| `!d20` | Rola um dado livremente |
| `!jogadores` | Lista jogadores registrados |
| `!npc` | Apresenta um NPC da cena |
| `!npcs` | Lista NPCs criados pelo Mestre |
| `!status` | Status da campanha |
| `!ajuda` | Menu de ajuda completo |

### Exclusivo do Mestre

| Comando | Descrição |
|---------|-----------|
| `!mestre` | Reivindica o papel de Mestre |
| `!iniciar` | Inicia a campanha |
| `!turno` | Avança para o próximo turno |
| `!encerrar` | Encerra a sessão |
| `!cena` | Descreve a situação atual |
| `!definirDC [número]` | Define DC da próxima ação (1–20) |
| `!criarNPC nome \| tipo \| descrição \| motivação` | Cria um NPC dinâmico |
| `!acaoNPC nome \| ação` | Declara ação de um NPC no turno |

---

## Sistema de Dados

| Resultado D20 | Efeito |
|---------------|--------|
| **20** | Acerto Crítico — algo extraordinário acontece |
| **≥ DC** | Sucesso — resultado proporcional à margem de acerto |
| **< DC** | Falha — consequência moderada |
| **1** | Falha Crítica — desastre com efeitos duradouros |

### Graus de Dificuldade padrão

| Tipo de Ação | DC |
|--------------|----|
| Percepção / Observar | 11 |
| Combate / Atirar | 13 |
| Furtividade / Infiltração | 14 |
| Hacking / Tecnologia | 15 |
| Social / Persuasão | 12 |
| Ações físicas | 12 |
| Medicina | 14 |

O Mestre pode sobrescrever o DC de qualquer ação com `!definirDC [número]` antes do jogador usar `!acao`.

---

## Estrutura do Projeto

```
chatbot_rpg/
├── bot.js            # Entrada — cliente WhatsApp e roteamento de comandos
├── gameManager.js    # Estado do jogo por grupo (Mestre, turnos, jogadores, NPCs)
├── dice.js           # Rolagem D20 e cálculo de dificuldade
├── narratives.js     # Textos, narrativas contextuais e NPCs da campanha
├── package.json
├── README.md
└── docs/
    ├── projeto.md         # Descrição detalhada do projeto
    ├── arquitetura.md     # Arquitetura técnica e fluxos de dados
    └── prompt-cyber-bot.md # Prompt original de criação
```

---

## Solução de Problemas

**Reconectar o bot:**
```bash
rm -rf .wwebjs_auth
node bot.js
```

**Erro de Chromium no Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install -y chromium-browser
```

**Mensagens não chegam:**
- Confirme que o bot está no grupo
- O número do bot precisa ter WhatsApp ativo

---

## Documentação

- [Descrição do Projeto](docs/projeto.md)
- [Arquitetura Técnica](docs/arquitetura.md)
- [Prompt Original de Criação](docs/prompt-cyber-bot.md)
