# CampanhaCyberpunk — Bot RPG para WhatsApp

## Visão Geral

CampanhaCyberpunk é um bot para WhatsApp que transforma um grupo de mensagens em uma mesa de RPG temática de ficção científica distópica. O bot atua como árbitro automático de regras: rola dados virtuais, calcula dificuldades, gera narrativas contextuais e gerencia o estado de jogo de múltiplos jogadores simultaneamente — tudo dentro do próprio WhatsApp, sem aplicativos externos.

A ambientação é Neon City, 2087: uma megalópole governada por megacorporações, onde jogadores interpretam mercenários, hackers e sobreviventes em missões de infiltração e conflito corporativo.

---

## Problema que Resolve

Jogar RPG de mesa à distância exige ferramentas externas: Discord, Foundry VTT, Roll20 ou similares. Para grupos que já se comunicam pelo WhatsApp, mudar de plataforma é uma barreira. Este bot elimina essa fricção: o jogo acontece onde as pessoas já estão, sem cadastro, sem instalação, sem aprendizado de nova ferramenta.

---

## Público-Alvo

Grupos de amigos que já usam WhatsApp e querem jogar RPG de forma casual, sem compromisso com sistemas complexos. Ideal para sessões rápidas de 1-2 horas com 2 a 6 participantes.

---

## Funcionalidades Principais

### Sistema de Mestre (GM)
Um jogador assume o papel de Mestre de Campanha com `!mestre`. O Mestre tem acesso exclusivo a comandos de controle narrativo: iniciar e encerrar campanhas, avançar turnos, descrever cenas, criar NPCs dinâmicos e definir graus de dificuldade personalizados para ações específicas.

### Registro de Personagens
Cada membro do grupo registra seu personagem com `!personagem [descrição]`. A descrição é livre — o jogador define nome, aparência, habilidades e backstory em texto corrido. Não há fichas, atributos numéricos ou classes pré-definidas.

### Sistema de Turnos por Fase
O jogo é dividido em turnos com duas fases distintas:
1. **Fase dos Jogadores** — cada membro declara sua ação com `!acao [descrição]`
2. **Fase dos NPCs** — o Mestre reage com `!acaoNPC` descrevendo o comportamento dos personagens não-jogáveis

Quando todos os jogadores registrados agem no turno, o bot notifica automaticamente o grupo e sinaliza a transição para a fase dos NPCs.

### Rolagem de Dados (D20)
O bot rola dados de 20 faces virtualmente. Para cada ação declarada, o grau de dificuldade (DC) é calculado automaticamente por palavras-chave na descrição da ação (combate, furtividade, hacking, percepção, etc.) ou definido manualmente pelo Mestre com `!definirDC`.

| Resultado | Efeito |
|-----------|--------|
| 20 | Acerto Crítico — consequência extraordinária |
| ≥ DC | Sucesso — ação executada com resultado proporcional à margem |
| < DC | Falha — consequência moderada |
| 1 | Falha Crítica — desastre com efeitos duradouros |

### Narrativas Contextuais
Após cada ação, o bot gera automaticamente uma narrativa baseada no tipo de ação (atirar, hackear, se esconder, observar) e no resultado do dado. Críticos e falhas críticas possuem múltiplas variações para evitar repetição. Sucessos incluem um indicador de margem: "por um fio", "sucesso confortável" ou "execução impecável".

### NPCs Dinâmicos
O Mestre pode criar personagens não-jogáveis durante a campanha com `!criarNPC`, definindo nome, tipo, descrição e motivação. Esses NPCs são inseridos no universo narrativo em tempo real e aparecem quando jogadores usam `!npc`.

---

## Campanha Pré-escrita: Armazém 9-Delta

O bot acompanha uma campanha de seis turnos já escrita:

| Turno | Localização | Situação |
|-------|-------------|----------|
| 1 | Exterior do armazém | Reconhecimento, chuva ácida, dois guardas visíveis |
| 2 | Corredor interno, térreo | Alarme disparado, servidores ao fundo |
| 3 | Setor B | Terminal desprotegido, agente encoberto infiltrado |
| 4 | Sala de controle, 2º andar | Alerta nível 2, cofre biométrico Sentinel-3 |
| 5 | 2º andar | Chip roubado por agente rival, perseguição |
| 6 | Telhado | Confronto final, chip em jogo, um segundo para reagir |

O objetivo: infiltrar o Armazém 9-Delta e recuperar um chip de dados comprometedores sobre o CEO da OmniTech. Recompensa: 80.000 créditos digitais.

---

## Tecnologia

- **Runtime:** Node.js 18+
- **Integração WhatsApp:** `whatsapp-web.js` com autenticação local persistente via Puppeteer
- **Persistência:** Estado em memória (sem banco de dados); sessão WhatsApp salva em `.wwebjs_auth/`
- **Dependências:** `whatsapp-web.js`, `qrcode-terminal`

---

## Limitações Conhecidas

- Estado de jogo é perdido ao reiniciar o bot (sem banco de dados)
- Uma campanha por grupo; múltiplos grupos são suportados simultaneamente
- Requer Chrome/Chromium instalado no servidor
- O Mestre não pode ser substituído sem reiniciar o bot (sem comando `!resetMestre`)
