---
name: Stripe integration dismissed — secret fallback
description: When user dismisses the Replit Stripe connector, collect raw credentials as secrets
---

When `proposeIntegration` for Stripe is dismissed, the automatic_updates message says:
"You cannot proceed with these integrations until they complete the authorization flow. Alternatively, ask for credentials to store as secrets."

**Fallback approach:**
```javascript
await requestEnvVar({
  requestType: "secret",
  keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  userMessage: "..."
});
```

Then update `stripeClient.ts` to read directly from `process.env.STRIPE_SECRET_KEY` / `process.env.STRIPE_WEBHOOK_SECRET` instead of fetching from the Replit connectors API.

**Why:** The stripeClient.ts template uses Replit's connector API to fetch credentials — it won't work without the integration connected. The env-var path is a clean fallback.

**How to apply:** Any project where the user skips/dismisses the Replit Stripe integration.
