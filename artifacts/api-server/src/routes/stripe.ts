import { Router } from "express";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient";
import { db, scanTokens } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/stripe/create-scan-checkout", async (req, res) => {
  try {
    const stripe = await getUncachableStripeClient();

    const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost"}`;

    const products = await stripe.products.search({
      query: "name:'Single Scan' AND active:'true'",
    });

    if (products.data.length === 0) {
      res.status(503).json({ error: "Scan product not configured. Run the seed-products script." });
      return;
    }

    const prices = await stripe.prices.list({
      product: products.data[0].id,
      active: true,
    });

    if (prices.data.length === 0) {
      res.status(503).json({ error: "Scan price not configured. Run the seed-products script." });
      return;
    }

    const priceId = prices.data[0].id;

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
