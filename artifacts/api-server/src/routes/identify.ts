import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { IdentifyImageBody } from "@workspace/api-zod";
import { db, identificationsTable, scanTokens } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.post("/identify", async (req, res) => {
  const token = req.headers["x-scan-token"] as string | undefined;
  if (!token) {
    res.status(402).json({ error: "Payment required. A valid scan token is required." });
    return;
  }

  const tokenRows = await db
    .select()
    .from(scanTokens)
    .where(eq(scanTokens.id, token));

  if (tokenRows.length === 0) {
    res.status(402).json({ error: "Invalid scan token." });
    return;
  }

  if (tokenRows[0].used) {
    res.status(402).json({ error: "This scan token has already been used." });
    return;
  }

  await db
    .update(scanTokens)
    .set({ used: true })
    .where(eq(scanTokens.id, token));

  const parsed = IdentifyImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { imageData, mimeType = "image/jpeg" } = parsed.data;

  const base64 = imageData.startsWith("data:")
    ? imageData.split(",")[1]
    : imageData;

  const imageUrl = `data:${mimeType};base64,${base64}`;

  let content: string;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content:
            "You are a world-class identification expert combining the knowledge of a zoologist, botanist, mycologist, geologist, art historian, gemologist, antiques appraiser, food scientist, and engineer. You examine images with forensic attention to detail and identify the subject as precisely as possible — down to the species, breed, cultivar, model, maker, era, or variant whenever the visual evidence supports it. You are rigorous about uncertainty: you cite the exact visual cues that justify your conclusion and you offer plausible alternatives when an image is ambiguous.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
            {
              type: "text",
              text: `Identify the primary subject of this image with maximum precision and expert depth. Examine fine details: shape, color, texture, proportions, markings, materials, wear, context, and any text or logos. Be as specific as the evidence allows (exact species/breed/cultivar/model/maker/era), not just a broad category.

Respond ONLY with a valid JSON object in EXACTLY this format (no markdown, no text outside the JSON):
{
  "name": "<most specific accurate name>",
  "description": "<3-4 sentence expert description covering what it is and why it is notable>",
  "category": "<one of: Animal, Plant, Fungi, Food, Object, Landmark, Person, Vehicle, Art, Technology, Mineral, Insect, Bird, Nature, Other>",
  "subcategory": "<more specific classification like breed/species variant/style/model, or null>",
  "confidence": <number between 0 and 1 reflecting genuine certainty>,
  "tags": ["<5-7 specific keywords>"],
  "facts": ["<3-4 genuinely interesting, specific facts>"],
  "attributes": [{"label": "<characteristic e.g. Family, Habitat, Lifespan, Material, Era, Diet, Height>", "value": "<value>"}],
  "identifyingFeatures": ["<3-5 specific visual cues IN THIS IMAGE that led to the identification>"],
  "alternativeMatches": [{"name": "<other plausible identification>", "confidence": <0-1>, "reason": "<why it could be this instead, or null>"}],
  "relatedItems": ["<3-5 closely related or commonly confused subjects>"],
  "safetyNote": "<safety, edibility, toxicity, or handling caution if relevant, else null>",
  "estimatedValue": "<approximate monetary value or rarity if relevant, else null>",
  "origin": "<geographic or cultural origin, or null>",
  "scientificName": "<scientific/latin name, or null>"
}
Provide 4-7 attributes that are genuinely relevant to this specific subject. Include 1-3 alternativeMatches only if there is real ambiguity (use an empty array if you are highly confident). Do not include any text outside the JSON object.`,
            },
          ],
        },
      ],
    });
    content = response.choices[0]?.message?.content ?? "{}";
  } catch (err) {
    req.log.error({ err }, "OpenAI identification request failed");
    res.status(502).json({ error: "Identification service is unavailable. Please try again." });
    return;
  }

  let result: {
    name?: string;
    description?: string;
    category?: string;
    subcategory?: string | null;
    confidence?: number;
    tags?: string[];
    facts?: string[];
    attributes?: { label: string; value: string }[];
    identifyingFeatures?: string[];
    alternativeMatches?: { name: string; confidence: number; reason?: string | null }[];
    relatedItems?: string[];
    safetyNote?: string | null;
    estimatedValue?: string | null;
    origin?: string | null;
    scientificName?: string | null;
  };

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  if (!result.name || !result.description || !result.category) {
    res.status(500).json({ error: "Identification was incomplete. Please try another image." });
    return;
  }

  const rawConfidence = Number(result.confidence);
  const confidence = Number.isFinite(rawConfidence)
    ? Math.min(1, Math.max(0, rawConfidence))
    : 0;

  const normalized = {
    name: result.name,
    description: result.description,
    category: result.category,
    subcategory: result.subcategory ?? null,
    confidence,
    tags: result.tags ?? [],
    facts: result.facts ?? [],
    attributes: result.attributes ?? [],
    identifyingFeatures: result.identifyingFeatures ?? [],
    alternativeMatches: result.alternativeMatches ?? [],
    relatedItems: result.relatedItems ?? [],
    safetyNote: result.safetyNote ?? null,
    estimatedValue: result.estimatedValue ?? null,
    origin: result.origin ?? null,
    scientificName: result.scientificName ?? null,
  };

  try {
    await db.insert(identificationsTable).values(normalized);
  } catch (err) {
    req.log.error({ err }, "Failed to persist identification");
  }

  res.json(normalized);
});

router.get("/identify/history", async (_req, res) => {
  const rows = await db
    .select()
    .from(identificationsTable)
    .orderBy(desc(identificationsTable.createdAt))
    .limit(20);

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      confidence: r.confidence,
      tags: r.tags,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export { router as identifyRouter };
