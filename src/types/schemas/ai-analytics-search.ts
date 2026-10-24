import { z } from "zod";
import { aiEngineSchema } from "./ai-visibility";

export const savedAnswerAnalyticsSearchSchema = z.object({
  market: z.string().uuid().optional().catch(undefined),
  view: z
    .enum([
      "overview",
      "rankings",
      "sources",
      "gaps",
      "responses",
      "markets",
      "models",
      "topics",
      "periods",
      "ai-rankings",
      "rankings-gap",
      "source-analysis",
      "reddit",
      "youtube",
      "rankings-citations",
      "competitors",
    ])
    .default("overview")
    .catch("overview"),
  scope: z.enum(["market", "all"]).default("all").catch("all"),
  days: z
    .union([z.literal(7), z.literal(28), z.literal(30), z.literal(90)])
    .default(28)
    .catch(28),
  run: z.string().uuid().optional().catch(undefined),
  engine: aiEngineSchema.optional().catch(undefined),
  topic: z.string().max(100).optional().catch(undefined),
  branded: z
    .enum(["neutral", "branded", "all"])
    .default("neutral")
    .catch("neutral"),
  q: z.string().max(200).default("").catch(""),
  signal: z.enum(["mentioned", "cited", "gap"]).optional().catch(undefined),
  brand: z.string().max(253).optional().catch(undefined),
  source: z.string().max(2048).optional().catch(undefined),
  answerState: z
    .enum(["all", "answered", "failed", "no_answer", "pending"])
    .default("all")
    .catch("all"),
  groupBy: z.enum(["domain", "url"]).default("domain").catch("domain"),
  ownership: z
    .enum(["all", "own", "competitor", "other"])
    .default("all")
    .catch("all"),
  reportPage: z.number().int().min(1).max(10000).default(1).catch(1),
  reportSearch: z.string().max(200).default("").catch(""),
  reportBrand: z.string().max(253).optional().catch(undefined),
  reportGap: z
    .enum(["all", "missing", "shared", "unique", "neither"])
    .default("all")
    .catch("all"),
  reportMatrix: z
    .enum(["all", "both", "mentionedOnly", "citedOnly", "neither"])
    .default("all")
    .catch("all"),
  reportChange: z
    .enum(["all", "gained", "lost", "retained", "absent"])
    .default("all")
    .catch("all"),
  sourceChannel: z
    .enum(["all", "reddit", "youtube", "web"])
    .default("all")
    .catch("all"),
  responsePage: z.number().int().min(1).max(10000).default(1).catch(1),
  sourcePage: z.number().int().min(1).max(10000).default(1).catch(1),
});
export type AnalyticsSearch = z.infer<typeof savedAnswerAnalyticsSearchSchema>;
