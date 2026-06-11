import { Router } from "express";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient";
import { db, scanTokens } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getScanPriceId(): Promise<string | null> {
  // Fast path: price ID seeded into env var
  if (process.env.STRIPE_SCAN_PRICE_ID) {
    return process.env.STRIPE_SCAN_PRICE_ID;
  }

  // Fallback: list all active prices and find one for a $1 product named "Single Scan"
  const stripe = await getUncachableStripeClient();
  const prices = await stripe.prices.list({ active: true, limit: 100 });

  for (const price of prices.data) {
    if (price.unit_amount === 100 && price.currency === "usd") {
      // Fetch the product to verify the name
      const product = await stripe.products.retrieve(price.product as string);
      if (product.name === "Single Scan" && product.active) {
        return price.id;
      }
    }
  }

  return null;
}

router.post("/stripe/create-scan-checkout", async (req, res) => {
  try {
    const priceId = await getScanPriceId();

    if (!priceId) {
      res.status(503).json({ error: "Scan product not configured. Run the seed-products script." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost"}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Failed to create scan checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/stripe/verify-scan", async (req, res) => {
  const sessionId = req.query["session_id"] as string | undefined;

  if (!sessionId) {
    res.status(400).json({ error: "Missing session_id" });
    return;
  }

  const existing = await db
    .select()
    .from(scanTokens)
    .where(eq(scanTokens.stripeSessionId, sessionId));

  if (existing.length > 0) {
    if (existing[0].used) {
      res.status(409).json({ error: "This payment has already been used for a scan." });
      return;
    }
    res.json({ token: existing[0].id });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      res.status(402).json({ error: "Payment not completed" });
      return;
    }

    const tokenId = randomUUID();
    await db.insert(scanTokens).values({
      id: tokenId,
      stripeSessionId: sessionId,
      used: false,
    });

    res.json({ token: tokenId });
  } catch (err) {
    req.log.error({ err }, "Failed to verify scan payment");
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export { router as stripeRouter };
