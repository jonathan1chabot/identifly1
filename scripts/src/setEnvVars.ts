/**
 * Saves env vars to the Replit shared environment using the Replit API.
 * Only works inside the Replit environment (REPLIT_DB_URL must be available).
 */
export async function setEnvVars(vars: Record<string, string>): Promise<void> {
  const replId = process.env.REPL_ID;
  const token = process.env.REPLIT_API_KEY ?? process.env.REPL_TOKEN;

  if (!replId || !token) {
    console.warn("⚠️  Cannot save env vars: REPL_ID or auth token not available. Set STRIPE_SCAN_PRICE_ID manually.");
    return;
  }

  const resp = await fetch(`https://replit.com/data/repls/${replId}/env`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Cookie: `connect.sid=${token}`,
    },
    body: JSON.stringify(vars),
  });

  if (!resp.ok) {
    console.warn(`⚠️  Could not save env vars automatically (${resp.status}). Set STRIPE_SCAN_PRICE_ID manually.`);
  }
}
