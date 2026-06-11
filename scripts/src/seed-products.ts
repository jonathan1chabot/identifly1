import { getStripeClient } from "./stripeClient";
import { setEnvVars } from "./setEnvVars";

async function seedProducts() {
  const stripe = getStripeClient();

  // Check for existing product by listing (avoids search indexing delay)
  const products = await stripe.products.list({ active: true, limit: 100 });
  const existing = products.data.find((p) => p.name === "Single Scan");

  if (existing) {
    const prices = await stripe.prices.list({ product: existing.id, active: true });
    const priceId = prices.data[0]?.id;
    console.log("✅ Single Scan product already exists");
    console.log("   Product ID:", existing.id);
    console.log("   Price ID:  ", priceId ?? "(no prices)");

    if (priceId) {
      await setEnvVars({ STRIPE_SCAN_PRICE_ID: priceId });
      console.log("   Saved STRIPE_SCAN_PRICE_ID to env vars");
    }
    return;
  }

  const product = await stripe.products.create({
    name: "Single Scan",
    description: "One AI-powered identification scan — $1.00",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 100,
    currency: "usd",
  });

  console.log("✅ Created Single Scan product");
  console.log("   Product ID:", product.id);
  console.log("   Price ID:  ", price.id);

  await setEnvVars({ STRIPE_SCAN_PRICE_ID: price.id });
  console.log("   Saved STRIPE_SCAN_PRICE_ID to env vars");
}

seedProducts().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
