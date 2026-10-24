import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { projects } from "@/db/schema";
import { loadSavedAnswerAnalytics } from "./aiSavedAnswerAnalytics";
import {
  savedAnswerAnalyticsSchema,
  type SavedAnswerAnalyticsInput,
} from "@/types/schemas/ai-saved-answer-analytics";
import { seedSavedAnswerAnalyticsRun as seed } from "./savedAnswerAnalyticsTestFixtures";
const { testDb } = await vi.hoisted(async () => {
  const { createAiVisibilityTestDb } = await import("../aiVisibilityTestDb");
  return { testDb: await createAiVisibilityTestDb() };
});
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/db", () => ({ db: testDb.db }));
vi.mock("@/db/runBatch", () => ({ runBatch: testDb.runBatch }));
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-24T12:00:00Z") });
  await testDb.seedProject();
});
afterEach(() => {
  vi.useRealTimers();
});
function input(patch: Partial<SavedAnswerAnalyticsInput> = {}) {
  return {
    ...savedAnswerAnalyticsSchema.parse({
      projectId: "00000000-0000-4000-8000-000000000001",
    }),
    projectId: "project",
    ...patch,
  };
}
it("keeps mention/citation quadrants, tracked-brand order and actual source positions distinct", async () => {
  await seed([
    {
      own: true,
      ownCited: true,
      rival: true,
      ownOffset: 20,
      rivalOffset: 5,
      sources: [
        "https://reddit.com/r/adobe/comments/1",
        "https://openseo.so/guide",
        "https://openseo.so/guide",
      ],
      positions: [1, 2, 4],
    },
    { own: true, sources: ["https://www.youtube.com/watch?v=one"] },
    { ownCited: true, sources: ["https://openseo.so/other"] },
    { rival: true, sources: ["https://reddit.com.evil.example/fake"] },
    {
      status: "failed",
      own: true,
      ownCited: true,
      sources: ["https://openseo.so/stale"],
    },
    { includeOwn: false },
  ]);
  const reports = (await loadSavedAnswerAnalytics(input())).trackingReports;
  expect(reports.matrix).toMatchObject({
    eligible: 4,
    both: 1,
    mentionedOnly: 1,
    citedOnly: 1,
    neither: 1,
  });
  expect(reports.brands.find((b) => b.own)).toMatchObject({
    averageMentionOrder: 1.5,
    averageCitationPosition: 1.5,
    mentionPositionAnswers: 2,
    citationPositionAnswers: 2,
    topThreeCitations: 2,
  });
  expect(
    reports.sources.rows.find((s) => s.domain === "openseo.so"),
  ).toMatchObject({
    answers: 2,
    averagePosition: 1.5,
    firstCitations: 1,
    topThreeCitations: 2,
  });
  const reddit = await loadSavedAnswerAnalytics(
    input({ sourceChannel: "reddit" }),
  );
  expect(reddit.trackingReports.sources.rows.map((s) => s.domain)).toEqual([
    "reddit.com",
  ]);
  expect(reddit.trackingReports.sources.rows[0]).toMatchObject({
    withBrandEligible: 1,
    withBrandMentionRate: 100,
    withoutBrandEligible: 3,
  });
  expect(
    reddit.trackingReports.sources.rows[0].withoutBrandMentionRate,
  ).toBeCloseTo(100 / 3);
  const failed = reports.rankings.rows.find((r) => r.status === "failed");
  expect(failed).toMatchObject({
    brands: [],
    gap: "unknown",
    change: "unknown",
  });
  expect(
    reports.sourceCategories.find((c) => c.label === "Reddit")?.answers,
  ).toBe(1);
});
it("selects the preceding snapshot, compares exact answered pairs and detects new/lost citation sources", async () => {
  const first = await seed(
    [{ sources: ["https://old.example/a"] }, { rival: true }],
    2840,
    { createdAt: "2026-10-12T12:00:00Z" },
  );
  await seed([{ own: true }, { own: true }], 2840, {
    trackerId: first.trackerId,
    trigger: "manual",
    createdAt: "2026-10-16T12:00:00Z",
  });
  await seed(
    [
      { own: true, ownCited: true, sources: ["https://new.example/a"] },
      { rival: true },
    ],
    2840,
    { trackerId: first.trackerId },
  );
  const reports = (await loadSavedAnswerAnalytics(input({ days: 7 })))
    .trackingReports;
  expect(reports.period).toMatchObject({
    status: "comparable",
    commonCells: 2,
    mentionDelta: 50,
    citationDelta: 50,
    shareDelta: 50,
  });
  expect(reports.rankings.rows.map((r) => r.change)).toEqual([
    "gained",
    "absent",
  ]);
  expect(
    reports.sources.rows.find((s) => s.domain === "new.example"),
  ).toMatchObject({ change: "new", comparisonAnswers: 1, previousAnswers: 0 });
  expect(
    reports.sources.rows.find((s) => s.domain === "old.example"),
  ).toMatchObject({ change: "lost", comparisonAnswers: 0, previousAnswers: 1 });
});
it("does not call a source lost when its paired current answer failed", async () => {
  const previous = await seed(
    Array.from({ length: 10 }, (_, i) => ({
      status: i === 1 ? ("failed" as const) : ("completed" as const),
      own: i < 2,
      sources: i === 0 ? ["https://unobserved.example/a"] : [],
    })),
    2840,
    { createdAt: "2026-10-12T12:00:00Z" },
  );
  await seed(
    Array.from({ length: 10 }, (_, i) => ({
      status: i === 0 ? ("failed" as const) : ("completed" as const),
      own: i < 2,
      sources: i === 1 ? ["https://current-only.example/a"] : [],
    })),
    2840,
    { trackerId: previous.trackerId },
  );
  const reports = (await loadSavedAnswerAnalytics(input({ days: 7 })))
    .trackingReports;
  expect(reports.period).toMatchObject({
    status: "comparable",
    currentCoverage: { expected: 10, completed: 9 },
    previousCoverage: { expected: 10, completed: 9 },
  });
  expect(reports.period.current).toMatchObject({ answered: 8, mentions: 0 });
  expect(reports.period.previous).toMatchObject({ answered: 8, mentions: 0 });
  expect(
    reports.sources.rows.find((s) => s.domain === "current-only.example")
      ?.change,
  ).toBe("unavailable");
  expect(
    reports.sources.rows.some((s) => s.domain === "unobserved.example"),
  ).toBe(false);
  expect(
    reports.rankings.rows.filter((r) => r.change === "unknown"),
  ).toHaveLength(2);
});
it("withholds comparison deltas when historical brand definitions change", async () => {
  const previous = await seed([{ own: true }], 2840, {
    createdAt: "2026-10-12T12:00:00Z",
    ownName: "Old brand",
  });
  await seed([{ own: false }], 2840, {
    trackerId: previous.trackerId,
    ownName: "New brand",
  });
  const reports = (await loadSavedAnswerAnalytics(input({ days: 7 })))
    .trackingReports;
  expect(reports.period).toMatchObject({
    status: "scope_changed",
    mentionDelta: null,
    citationDelta: null,
    shareDelta: null,
  });
  expect(reports.rankings.rows[0].change).toBe("unknown");
});
it("paginates filtered reports after aggregate calculation and keeps foreign evidence out", async () => {
  await seed(
    Array.from({ length: 30 }, (_, i) => ({
      own: i % 2 === 0,
      rival: i % 2 === 1,
      sources: [`https://source${i}.example/a`],
    })),
  );
  await testDb.db.insert(projects).values({
    id: "other",
    organizationId: "organization",
    name: "Other",
    domain: "other.example",
  });
  await seed(
    [{ own: true, sources: ["https://private-other.example/a"] }],
    2826,
    { projectId: "other" },
  );
  const reports = (
    await loadSavedAnswerAnalytics(
      input({
        allMarkets: true,
        reportGap: "missing",
        reportPage: 2,
        limit: 10,
      }),
    )
  ).trackingReports;
  expect(reports.rankings).toMatchObject({ totalCount: 15, page: 2, pages: 2 });
  expect(reports.rankings.rows).toHaveLength(5);
  expect(reports.brands.find((b) => b.own)).toMatchObject({
    answers: 30,
    mentions: 15,
  });
  expect(
    reports.sources.rows.some((s) => s.domain === "private-other.example"),
  ).toBe(false);
  expect(reports.period.status).toBe("no_previous");
});

it("never pairs identical prompts from different markets in period comparisons", async () => {
  await seed([{ own: true }], 2840, { createdAt: "2026-10-12T12:00:00Z" });
  await seed([{ own: true }], 2826);
  const reports = (
    await loadSavedAnswerAnalytics(input({ allMarkets: true, days: 7 }))
  ).trackingReports;
  expect(reports.period).toMatchObject({
    status: "scope_changed",
    commonCells: 0,
    mentionDelta: null,
  });
  expect(reports.rankings.rows[0].change).toBe("unknown");
});
it("does not treat missing own-brand matching metadata as zero source overlap", async () => {
  await seed([
    { includeOwn: false, rival: true, sources: ["https://source.example/a"] },
  ]);
  const reports = (await loadSavedAnswerAnalytics(input())).trackingReports;
  expect(reports.matrix.eligible).toBe(0);
  expect(reports.brands[0]).toMatchObject({
    sourceOverlap: null,
    sourceOverlapEligibleAnswers: 0,
  });
});
