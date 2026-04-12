# DER — Diagrama Entidade-Relacionamento

Bot RPG WhatsApp — Banco de Dados

```mermaid
erDiagram
    users {
        SERIAL      id          PK
        VARCHAR(100) username   UK "NOT NULL"
        TEXT        password_hash   "NOT NULL"
    }

    campaigns {
        SERIAL      id          PK
        VARCHAR(200) name       "NOT NULL"
        VARCHAR(100) jid        UK
        VARCHAR(200) theme      "DEFAULT ''"
        TEXT        prompt      "DEFAULT ''"
        TEXT        context_data "DEFAULT ''"
        BOOLEAN     active      "DEFAULT true"
        TIMESTAMPTZ created_at  "DEFAULT now()"
    }

    triggers {
        SERIAL      id          PK
        VARCHAR(100) keyword    UK "NOT NULL, CITEXT"
    }

    custom_commands {
        SERIAL      id          PK
        VARCHAR(100) keyword    UK "NOT NULL"
        VARCHAR(300) description "DEFAULT ''"
        TEXT        action_prompt "NOT NULL"
        TIMESTAMPTZ created_at  "DEFAULT now()"
    }

    conversations {
        SERIAL      id              PK
        VARCHAR(100) jid            "NOT NULL"
        INTEGER     campaign_id     FK
        TIMESTAMPTZ started_at      "DEFAULT now()"
        TIMESTAMPTZ last_message_at "DEFAULT now()"
    }

    messages {
        SERIAL      id              PK
        INTEGER     conversation_id FK "NOT NULL"
        VARCHAR(20) role            "CHECK IN (user, assistant)"
        TEXT        content         "NOT NULL"
        TIMESTAMPTZ sent_at         "DEFAULT now()"
    }

    campaigns    ||--o{ conversations  : "vincula"
    conversations ||--o{ messages      : "contém"
```

## Descrição das Entidades

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do painel admin (autenticação JWT) |
| `campaigns` | Campanhas de RPG — cada uma vinculada a um grupo WhatsApp via JID |
| `triggers` | Palavras-chave monitoradas pelo bot (ex: `!acao`, `!mestre`) |
| `custom_commands` | Comandos personalizados com prompt de IA e suporte a `{{text}}` |
| `conversations` | Sessões de conversa por JID, opcionalmente vinculadas a uma campanha |
| `messages` | Mensagens individuais de cada conversa (role: `user` ou `assistant`) |

## Relacionamentos

- `campaigns` → `conversations`: uma campanha pode ter muitas conversas (1:N)
- `conversations` → `messages`: uma conversa contém muitas mensagens (1:N)
- `triggers` e `custom_commands` são independentes (sem FK)
