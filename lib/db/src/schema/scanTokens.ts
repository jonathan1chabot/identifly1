import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const scanTokens = pgTable("scan_tokens", {
  id: text("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ScanToken = typeof scanTokens.$inferSelect;
