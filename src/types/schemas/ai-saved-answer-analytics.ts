import { aiTrackingReportsSchema } from "./ai-tracking-reports";
import { z } from "zod";
import { aiEngineSchema, aiProjectSchema } from "./ai-visibility";

export const savedAnswerAnalyticsSchema = aiProjectSchema
  .extend({
    allMarkets: z.boolean().default(false),
    days: z
      .union([z.literal(7), z.literal(28), z.literal(30), z.literal(90)])
      .default(28),
    runId: z.string().uuid().optional(),
    topic: z.string().trim().max(100).optional(),
    engines: z.array(aiEngineSchema).min(1).max(5).optional(),
    branded: z.enum(["neutral", "branded", "all"]).default("neutral"),
    responseSearch: z.string().trim().max(200).default(""),
    signal: z.enum(["mentioned", "cited", "gap"]).optional(),
    brandDomain: z.string().trim().max(253).optional(),
    source: z.string().max(2048).optional(),
    answerState: z
      .enum(["all", "answered", "failed", "no_answer", "pending"])
      .default("all"),
    groupBy: z.enum(["domain", "url"]).default("domain"),
    ownership: z.enum(["all", "own", "competitor", "other"]).default("all"),
    responsePage: z.number().int().min(1).max(10000).default(1),
    sourcePage: z.number().int().min(1).max(10000).default(1),
    reportPage: z.number().int().min(1).max(10000).default(1),
    reportSearch: z.string().trim().max(200).default(""),
    reportBrand: z.string().trim().max(253).optional(),
    reportGap: z
      .enum(["all", "missing", "shared", "unique", "neither"])
      .default("all"),
    reportMatrix: z
      .enum(["all", "both", "mentionedOnly", "citedOnly", "neither"])
      .default("all"),
    reportChange: z
      .enum(["all", "gained", "lost", "retained", "absent"])
      .default("all"),
    sourceChannel: z.enum(["all", "reddit", "youtube", "web"]).default("all"),
    limit: z.number().int().min(1).max(50).default(25),
  })
  .refine((v) => !v.allMarkets || (!v.trackerId && !v.runId), {
    message:
      "Select one market for trackerId or runId, or omit both for allMarkets.",
  });
export type SavedAnswerAnalyticsInput = z.infer<
  typeof savedAnswerAnalyticsSchema
>;

const count = z.number().int().nonnegative();
const rate = z.number().min(0).max(100).nullable();
const text = z.string();
const coverage = z.object({
  expected: count,
  completed: count,
  failed: count,
  noAnswer: count,
  pending: count,
});
const run = z.object({
  id: text,
  createdAt: text,
  trigger: text,
  status: text,
});
const brand = z.object({
  domain: text,
  name: text,
  matchedNames: z.array(text),
  own: z.boolean(),
  answers: count,
  mentions: count,
  citations: count,
  shareOfVoice: rate,
  gapCount: count,
  gapEligibleAnswers: count,
});
const totals = z.object({
  answered: count,
  ownEligibleAnswers: count,
  mentions: count,
  citations: count,
  mentionRate: rate,
  citationRate: rate,
  shareOfVoice: rate,
  totalMentions: count,
  gaps: count,
});
const response = z.object({
  id: text,
  runId: text,
  promptId: text,
  prompt: text,
  topic: text,
  trackerId: text,
  market: text,
  engine: aiEngineSchema,
  status: text,
  answerStatus: text.nullable(),
  collectedAt: text.nullable(),
  snippet: text.nullable(),
  gap: z.boolean(),
});
const source = z.object({
  key: text,
  url: text.nullable(),
  domain: text,
  title: text.nullable(),
  ownership: z.enum(["own", "competitor", "other", "mixed"]),
  answerCount: count,
  promptCount: count,
  visibility: rate,
  gapCount: count,
});
const breakdown = z.object({
  shareOfVoice: rate,
  label: text,
  expected: count,
  answered: count,
  mentions: count,
  citations: count,
  mentionRate: rate,
  citationRate: rate,
});
const market = z.object({
  trackerId: text,
  label: text,
  locationCode: count,
  languageCode: text,
  runId: text.nullable(),
  createdAt: text.nullable(),
  status: text.nullable(),
  snapshotPrompts: count,
  configuredPrompts: count,
  uncollectedPrompts: count,
  coverage,
  totals,
});
const pagination = { totalCount: count, page: count, pages: count };
export const savedAnswerAnalyticsOutput = z.object({
  version: z.literal(1),
  trackingReports: aiTrackingReportsSchema,
  scope: z.object({
    since: text,
    days: count,
    allMarkets: z.boolean(),
    branded: text,
    topic: text.nullable(),
    engines: z.array(aiEngineSchema),
    brandSetsDiffer: z.boolean(),
    mixedMethods: z.boolean(),
  }),
  coverage,
  totals,
  history: z.object({
    truncated: z.boolean(),
    rows: z.array(
      z.object({ date: text, coverage, totals, brands: z.array(brand) }),
    ),
  }),
  brands: z.array(brand),
  markets: z.array(market),
  availableMarkets: z.array(z.object({ id: text, label: text })),
  topics: z.array(text),
  citationSummary: z.object({
    answersWithSources: count,
    citations: count,
    domains: count,
    urls: count,
  }),
  topSources: z.array(source),
  availableRuns: z.array(run),
  warnings: z.array(text),
  engines: z.array(breakdown),
  topicBreakdown: z.array(breakdown),
  sources: z.object({ rows: z.array(source), ...pagination }),
  responses: z.object({ rows: z.array(response), ...pagination }),
  comparison: z.object({
    commonPrompts: count,
    commonCells: count,
    comparable: z.boolean(),
    reason: text,
    rows: z.array(z.object({ trackerId: text, label: text, coverage, totals })),
  }),
});
export type SavedAnswerAnalytics = z.infer<typeof savedAnswerAnalyticsOutput>;
