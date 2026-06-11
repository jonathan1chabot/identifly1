import Stripe from "stripe";

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set.");
  }
  return key;
}

function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set.");
  }
  return secret;
}

export function getStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey());
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(getStripeSecretKey());
}

export function getWebhookSecret(): string {
  return getStripeWebhookSecret();
}
