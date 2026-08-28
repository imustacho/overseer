# Overseer

AI-powered Discord management bot. Mention the bot, tell it what to do in natural language — it handles the rest.

```
@Overseer ban John for spamming
@Overseer kick Alex
@Overseer timeout Mike 30s
@Overseer lock #general
```

Every destructive action goes through a confirmation system before execution. The AI **never** acts on its own.

## Setup

```bash
# 1. Clone & install
git clone <repo>
cd violation-overseer
npm install

# 2. Configure
cp .env.example .env
# Fill in your values (see below)

# 3. Build & run
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from [Discord Developer Portal](https://discord.com/developers) |
| `DISCORD_CLIENT_ID` | ✅ | Application ID |
| `AI_PROVIDER` | ✅ | `gemini`, `openrouter`, `groq`, or `openai` |
| `AI_API_KEY` | ✅ | API key for the selected provider |
| `AI_MODEL` | ✅ | Model name (e.g. `gemini-2.0-flash`, `openrouter/free`) |
| `AI_BASE_URL` | ❌ | Custom base URL for OpenAI-compatible providers |
| `CONFIRMATION_TIMEOUT` | ❌ | Seconds before confirmation expires (default: 60) |

## Discord Bot Settings

Required intents:
- **Server Members Intent** (privileged)
- **Message Content Intent** (privileged)

Required permissions:
- Administrator (or individual permissions per tool)

## Docker

```bash
docker build -t overseer .
docker run --env-file .env overseer
```

## Architecture

```
User message → AI (tool calling) → ActionManager → Permission check → Confirmation → Execute
```

- **19 tools**: ban, kick, timeout, warn, purge, role CRUD, channel CRUD, server settings
- **i18n**: Auto-detects server language (EN/TR)
- **Security**: Every action requires confirmation via button click
- **Context-aware**: Remembers recent conversation per channel

## License

MIT
