import { pgTable, serial, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type Attribute = { label: string; value: string };
export type AlternativeMatch = { name: string; confidence: number; reason?: string | null };

export const identificationsTable = pgTable("identifications", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  confidence: real("confidence").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  facts: jsonb("facts").$type<string[]>().notNull().default([]),
  attributes: jsonb("attributes").$type<Attribute[]>().notNull().default([]),
  identifyingFeatures: jsonb("identifying_features").$type<string[]>().notNull().default([]),
  alternativeMatches: jsonb("alternative_matches").$type<AlternativeMatch[]>().notNull().default([]),
  relatedItems: jsonb("related_items").$type<string[]>().notNull().default([]),
  safetyNote: text("safety_note"),
  estimatedValue: text("estimated_value"),
  origin: text("origin"),
  scientificName: text("scientific_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIdentificationSchema = createInsertSchema(identificationsTable).omit({ id: true, createdAt: true });
export type InsertIdentification = z.infer<typeof insertIdentificationSchema>;
export type Identification = typeof identificationsTable.$inferSelect;
