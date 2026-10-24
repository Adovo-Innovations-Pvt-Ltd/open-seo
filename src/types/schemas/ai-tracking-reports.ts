import { z } from "zod";
import { aiEngineSchema } from "./ai-visibility";
const n = z.number().int().nonnegative();
const rate = z.number().min(0).max(100).nullable();
const position = z.number().positive().nullable();
const metric = z.object({
  answered: n,
  eligible: n,
  mentions: n,
  citations: n,
  mentionRate: rate,
  citationRate: rate,
  shareOfVoice: rate,
});
const coverage = z.object({
  expected: n,
  completed: n,
  failed: n,
  noAnswer: n,
  pending: n,
});
const matrix = z.object({
  both: n,
  mentionedOnly: n,
  citedOnly: n,
  neither: n,
});
const brand = z.object({
  domain: z.string(),
  name: z.string(),
  own: z.boolean(),
  answers: n,
  mentions: n,
  citations: n,
  mentionRate: rate,
  citationRate: rate,
  shareOfVoice: rate,
  averageMentionOrder: position,
  averageCitationPosition: position,
  mentionPositionAnswers: n,
  citationPositionAnswers: n,
  topThreeCitations: n,
  matrix,
  sources: n,
  sharedOwnSources: n,
  sourceOverlapEligibleAnswers: n,
  sourceOverlap: rate,
});
const page = { totalCount: n, page: n, pages: n };
export const aiTrackingReportsSchema = z.object({
  brands: z.array(brand),
  matrix: z.object({
    brandDomain: z.string().nullable(),
    eligible: n,
    ...matrix.shape,
  }),
  rankings: z.object({
    ...page,
    rows: z.array(
      z.object({
        observationId: z.string(),
        prompt: z.string(),
        topic: z.string(),
        trackerId: z.string(),
        market: z.string(),
        engine: aiEngineSchema,
        status: z.string(),
        gap: z.enum(["missing", "shared", "unique", "neither", "unknown"]),
        change: z.enum(["gained", "lost", "retained", "absent", "unknown"]),
        brands: z.array(
          z.object({
            domain: z.string(),
            own: z.boolean(),
            mentioned: z.boolean(),
            cited: z.boolean(),
            mentionOrder: position,
            citationPosition: position,
          }),
        ),
      }),
    ),
  }),
  sources: z.object({
    ...page,
    rows: z.array(
      z.object({
        key: z.string(),
        domain: z.string(),
        url: z.string().nullable(),
        title: z.string().nullable(),
        channel: z.enum(["reddit", "youtube", "web"]),
        answers: n,
        visibility: rate,
        averagePosition: position,
        firstCitations: n,
        topThreeCitations: n,
        withBrandEligible: n,
        withBrandMentions: n,
        withBrandMentionRate: rate,
        withoutBrandEligible: n,
        withoutBrandMentionRate: rate,
        gapAnswers: n,
        brands: z.array(z.string()),
        comparisonAnswers: n.nullable(),
        previousAnswers: n.nullable(),
        change: z.enum(["new", "lost", "retained", "unavailable"]),
      }),
    ),
  }),
  sourceCategories: z.array(
    z.object({ label: z.string(), answers: n, visibility: rate }),
  ),
  modelTopics: z.array(
    z.object({
      topic: z.string(),
      engine: aiEngineSchema,
      expected: n,
      answered: n,
      mentionRate: rate,
      citationRate: rate,
      shareOfVoice: rate,
    }),
  ),
  period: z.object({
    status: z.enum([
      "comparable",
      "no_previous",
      "scope_changed",
      "incomplete",
      "explicit_check",
    ]),
    reason: z.string(),
    currentStart: z.string(),
    previousStart: z.string(),
    currentEnd: z.string(),
    commonCells: n,
    currentCoverage: coverage,
    previousCoverage: coverage,
    current: metric,
    previous: metric,
    mentionDelta: z.number().nullable(),
    citationDelta: z.number().nullable(),
    shareDelta: z.number().nullable(),
    brands: z.array(
      z.object({
        domain: z.string(),
        own: z.boolean(),
        current: metric,
        previous: metric,
        mentionDelta: z.number().nullable(),
        citationDelta: z.number().nullable(),
        shareDelta: z.number().nullable(),
      }),
    ),
  }),
});
export type AiTrackingReports = z.infer<typeof aiTrackingReportsSchema>;
