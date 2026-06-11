import Stripe from "stripe";
import { getStripeClient, getWebhookSecret } from "./stripeClient";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Received type: " + typeof payload + ". " +
        "This usually means express.json() parsed the body before reaching this handler. " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const stripe = getStripeClient();
    const webhookSecret = getWebhookSecret();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    // Log event type — extend here to handle specific events
    if (event.type === "checkout.session.completed") {
      // Scan tokens are created on verify-scan, not via webhook — nothing extra needed
    }
  }
}
