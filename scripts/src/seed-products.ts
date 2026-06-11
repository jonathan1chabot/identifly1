import { getStripeClient } from "./stripeClient";

async function seedProducts() {
  const stripe = await getStripeClient();

  const existing = await stripe.products.search({
    query: "name:'Single Scan' AND active:'true'",
  });

  if (existing.data.length > 0) {
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    console.log("✅ Single Scan product already exists");
    console.log("   Product ID:", existing.data[0].id);
    console.log("   Price ID:  ", prices.data[0]?.id ?? "(no prices)");
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
}

seedProducts().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
