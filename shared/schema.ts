import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversionJobs = pgTable("conversion_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalSize: integer("original_size").notNull(),
  convertedSize: integer("converted_size"),
  duration: text("duration"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  progress: integer("progress").notNull().default(0),
  errorMessage: text("error_message"),
  quality: integer("quality").notNull().default(128),
  sampleRate: integer("sample_rate").notNull().default(44100),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

export const insertConversionJobSchema = createInsertSchema(conversionJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertConversionJob = z.infer<typeof insertConversionJobSchema>;
export type ConversionJob = typeof conversionJobs.$inferSelect;
