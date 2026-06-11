---
name: OpenAI AI Integration fallback
description: What to do when setupReplitAIIntegrations returns awaiting_account_upgrade (free tier user)
---

When `setupReplitAIIntegrations` returns `{ success: false, status: "awaiting_account_upgrade" }`:

1. `setEnvVars({ values: { AI_INTEGRATIONS_OPENAI_BASE_URL: "https://api.openai.com/v1" } })`
2. `requestEnvVar({ requestType: "secret", keys: ["AI_INTEGRATIONS_OPENAI_API_KEY"], userMessage: "..." })` — gets the real key from user
3. If server crashes on startup before key is provided: temporarily `setEnvVars({ values: { AI_INTEGRATIONS_OPENAI_API_KEY: "sk-placeholder" } })` so the server starts; delete it once the real secret is saved.

**Why:** `lib/integrations-openai-ai-server/src/client.ts` throws at module import time if either env var is missing — the server won't start at all. The placeholder trick lets everything else work while the user provides their real key.

**How to apply:** Any project using `@workspace/integrations-openai-ai-server` on a free-tier repl.
