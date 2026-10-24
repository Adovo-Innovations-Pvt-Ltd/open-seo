import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { projects } from "@/db/schema";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { seedSavedAnswerAnalyticsRun as seed } from "./savedAnswerAnalyticsTestFixtures";
import { loadSavedAnswerAnalytics } from "./aiSavedAnswerAnalytics";
import {
  savedAnswerAnalyticsOutput,
  savedAnswerAnalyticsSchema,
  type SavedAnswerAnalyticsInput,
} from "@/types/schemas/ai-saved-answer-analytics";

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
function input(
  patch: Partial<SavedAnswerAnalyticsInput> = {},
): SavedAnswerAnalyticsInput {
  return {
    ...savedAnswerAnalyticsSchema.parse({
      projectId: "00000000-0000-4000-8000-000000000001",
    }),
    projectId: "project",
    ...patch,
  };
}

it("uses answered denominators, deduplicates cited domains and exposes gap evidence", async () => {
  await seed([
    {
      rival: true,
      sources: ["https://source.example/a", "https://source.example/b"],
    },
    {
      own: true,
      ownCited: true,
      sources: ["https://source.example/c", "https://openseo.so/"],
    },
    {},
    { status: "failed", own: true, sources: ["https://openseo.so/stale"] },
    { text: null },
    { status: "pending" },
    { branded: true, own: true },
  ]);
  const data = await loadSavedAnswerAnalytics(input());
  expect(data.coverage).toEqual({
    expected: 6,
    completed: 3,
    failed: 1,
    noAnswer: 1,
    pending: 1,
  });
  expect(data.totals).toMatchObject({
    answered: 3,
    mentions: 1,
    citations: 1,
    totalMentions: 2,
    shareOfVoice: 50,
    gaps: 1,
  });
  expect(data.totals.mentionRate).toBeCloseTo(100 / 3);
  expect(
    data.sources.rows.find((s) => s.domain === "source.example"),
  ).toMatchObject({ answerCount: 2, gapCount: 1 });
  expect(
    data.sources.rows.find((s) => s.domain === "source.example")?.visibility,
  ).toBeCloseTo(200 / 3);
  expect(data.brands.find((b) => !b.own)).toMatchObject({
    mentions: 1,
    shareOfVoice: 50,
    gapCount: 1,
    gapEligibleAnswers: 3,
  });
  expect(savedAnswerAnalyticsOutput.parse(data)).toEqual(data);
  const evidence = await loadSavedAnswerAnalytics(
    input({
      signal: "mentioned",
      brandDomain: "openseo.so",
      source: "openseo.so",
    }),
  );
  expect(evidence.responses.totalCount).toBe(1);
});
it("selects each market's latest finished scheduled snapshot and excludes manual checks by default", async () => {
  const us = await seed([{ own: true }]);
  await seed([{ rival: true }], 2840, {
    trackerId: us.trackerId,
    trigger: "manual",
    createdAt: "2026-10-23T12:00:00Z",
  });
  await seed([{ rival: true }], 2826);
  const data = await loadSavedAnswerAnalytics(input({ allMarkets: true }));
  expect(data.markets.map((m) => m.locationCode)).toEqual([2840, 2826]);
  expect(data.markets.find((m) => m.locationCode === 2840)?.runId).toBe(
    us.runId,
  );
  expect(data.totals.shareOfVoice).toBe(50);
});
it("searches the full retained prose and keeps response filters out of metric denominators", async () => {
  await seed([
    {
      text: `${"long answer ".repeat(3000)}AEM 100% + needle`,
      rival: true,
      sources: ["https://source.example/a"],
    },
    { own: true },
  ]);
  const filtered = await loadSavedAnswerAnalytics(
    input({
      responseSearch: "100% + NEEDLE",
      signal: "gap",
      brandDomain: "rival.example",
      source: "source.example",
    }),
  );
  expect(filtered.responses.totalCount).toBe(1);
  expect(filtered.responses.rows[0].snippet).toContain("100% + needle");
  expect(filtered.totals).toMatchObject({
    answered: 2,
    mentions: 1,
    shareOfVoice: 50,
  });
  expect(filtered.sources.rows[0].visibility).toBe(50);
});
it("aggregates the full snapshot before paginating either evidence table", async () => {
  await seed(
    Array.from({ length: 26 }, () => ({
      own: true,
      sources: ["https://source.example/a"],
    })),
  );
  const first = await loadSavedAnswerAnalytics(input());
  const next = await loadSavedAnswerAnalytics(input({ responsePage: 2 }));
  expect(first.responses.rows).toHaveLength(25);
  expect(next.responses.rows).toHaveLength(1);
  expect(next.totals).toEqual(first.totals);
  expect(next.sources.rows[0]).toMatchObject({
    answerCount: 26,
    visibility: 100,
  });
});
it("does not turn missing ownership or an empty mention denominator into a zero score", async () => {
  await seed([{ includeOwn: false, rival: true }]);
  const data = await loadSavedAnswerAnalytics(input());
  expect(data.totals.mentionRate).toBeNull();
  expect(data.totals.shareOfVoice).toBeNull();
  expect(data.totals.gaps).toBe(0);
});
it("compares only shared exact wording and blocks conclusions when answer coverage is low", async () => {
  await seed([
    { prompt: "Shared question?", own: true },
    { prompt: "US-specific question?", rival: true },
  ]);
  await seed(
    [
      { prompt: "Shared question?", status: "failed" },
      { prompt: "UK-specific question?", rival: true },
    ],
    2826,
  );
  const data = await loadSavedAnswerAnalytics(input({ allMarkets: true }));
  expect(data.comparison).toMatchObject({
    commonPrompts: 1,
    commonCells: 1,
    comparable: false,
  });
  expect(data.comparison.rows.map((m) => m.coverage.expected)).toEqual([1, 1]);
  expect(data.comparison.rows[0].totals.mentionRate).toBe(100);
  expect(data.comparison.rows[1].totals.mentionRate).toBeNull();
});
it("flags historical brand-name changes instead of rematching old answers", async () => {
  await seed([{ own: true }], 2840, { ownName: "Old brand" });
  await seed([{ own: true }], 2826, { ownName: "New brand" });
  const data = await loadSavedAnswerAnalytics(input({ allMarkets: true }));
  expect(data.scope.brandSetsDiffer).toBe(true);
  expect(data.brands.find((b) => b.own)?.matchedNames).toEqual([
    "Old brand",
    "New brand",
  ]);
  expect(data.comparison.comparable).toBe(false);
});
it("rejects foreign trackers and runs through the authorized project scope", async () => {
  const own = await seed([{}]);
  await testDb.db.insert(projects).values({
    id: "other",
    organizationId: "organization",
    name: "Other",
    domain: "other.example",
  });
  const foreign = await seed([{}], 2826, { projectId: "other" });
  await expect(
    loadSavedAnswerAnalytics(input({ trackerId: foreign.trackerId })),
  ).rejects.toMatchObject({ reason: "TRACKER_NOT_FOUND" });
  await expect(
    loadSavedAnswerAnalytics(
      input({ trackerId: own.trackerId, runId: foreign.runId }),
    ),
  ).rejects.toMatchObject({ reason: "RUN_NOT_FOUND" });
});
it("does not modify prompts, observations, evidence or tracking settings while reading", async () => {
  await seed([{ own: true, sources: ["https://source.example/a"] }]);
  const tables = [
    "ai_trackers",
    "ai_prompts",
    "ai_runs",
    "ai_observations",
    "ai_matches",
    "ai_sources",
  ];
  const snapshot = async () =>
    Promise.all(
      tables.map(
        async (t) =>
          (await testDb.client.execute(`SELECT * FROM ${t} ORDER BY id`)).rows,
      ),
    );
  const before = await snapshot();
  await loadSavedAnswerAnalytics(
    input({ allMarkets: true, signal: "gap", responseSearch: "unmatched" }),
  );
  expect(await snapshot()).toEqual(before);
});

it("keeps whole-check prompt inventory separate from the neutral analytics cohort", async () => {
  const market = await seed([{ own: true }, { branded: true, own: true }]);
  const initial = await loadSavedAnswerAnalytics(input());
  expect(initial.markets[0]).toMatchObject({
    snapshotPrompts: 2,
    configuredPrompts: 2,
    uncollectedPrompts: 0,
  });
  const config = await repo.getConfiguration("project", market.trackerId);
  if (!config) throw new Error("Missing tracker");
  await repo.saveConfiguration({
    ...config,
    prompts: [
      ...config.prompts,
      {
        id: crypto.randomUUID(),
        trackerId: market.trackerId,
        topic: "New",
        text: "A newly configured question?",
        paused: false,
        archived: false,
        createdAt: "2026-10-23T12:00:00Z",
      },
    ],
  });
  const updated = await loadSavedAnswerAnalytics(input());
  expect(updated.coverage.expected).toBe(1);
  expect(updated.markets[0]).toMatchObject({
    snapshotPrompts: 2,
    configuredPrompts: 3,
    uncollectedPrompts: 1,
  });
});
it("compares complete stable cohorts and allows an explicitly selected manual check", async () => {
  const us = await seed([{ own: true }]);
  await seed([{ rival: true }], 2826);
  const comparison = await loadSavedAnswerAnalytics(
    input({ allMarkets: true }),
  );
  expect(comparison.comparison.comparable).toBe(true);
  const manual = await seed([{ rival: true }], 2840, {
    trackerId: us.trackerId,
    trigger: "manual",
    createdAt: "2026-10-23T12:00:00Z",
  });
  const selected = await loadSavedAnswerAnalytics(
    input({ trackerId: us.trackerId, runId: manual.runId }),
  );
  expect(selected.markets[0].runId).toBe(manual.runId);
  expect(selected.totals.shareOfVoice).toBe(0);
});
it("shows missing snapshots without a score when the reporting window has no eligible checks", async () => {
  await seed([{ own: true }], 2840, { createdAt: "2026-08-01T12:00:00Z" });
  const data = await loadSavedAnswerAnalytics(input({ days: 7 }));
  expect(data.coverage.expected).toBe(0);
  expect(data.markets[0].runId).toBeNull();
  expect(data.totals.shareOfVoice).toBeNull();
});

it("keeps source evidence consistent with historical ownership filters", async () => {
  await seed([
    { ownCited: true, sources: ["https://openseo.so/a"] },
    { includeOwn: false, sources: ["https://openseo.so/b"] },
  ]);
  const data = await loadSavedAnswerAnalytics(
    input({ ownership: "own", source: "openseo.so" }),
  );
  expect(data.sources.rows[0].answerCount).toBe(1);
  expect(data.responses.totalCount).toBe(1);
  expect(data.totals.answered).toBe(2);
});

it("keeps citation discovery independent of ownership filters and counts retained links only from successful answers", async () => {
  await seed([
    { sources: ["https://source.example/a", "https://source.example/b"] },
    { ownCited: true, sources: ["https://openseo.so/a"] },
    { status: "failed", sources: ["https://failed.example/a"] },
  ]);
  const data = await loadSavedAnswerAnalytics(input({ ownership: "own" }));
  expect(data.sources.totalCount).toBe(1);
  expect(data.citationSummary).toEqual({
    answersWithSources: 2,
    citations: 3,
    domains: 2,
    urls: 3,
  });
  expect(data.topSources.map((s) => s.domain)).toEqual([
    "openseo.so",
    "source.example",
  ]);
});
it("charts dated scheduled history across markets without manual checks or evidence-filter bias", async () => {
  const us = await seed([{ own: true }, { status: "failed" }]);
  await seed([{ own: true }, { rival: true }], 2840, {
    trackerId: us.trackerId,
    createdAt: "2026-10-23T12:00:00Z",
  });
  await seed([{ own: true }, { own: true }], 2840, {
    trackerId: us.trackerId,
    trigger: "manual",
    createdAt: "2026-10-24T10:00:00Z",
  });
  await seed([{ rival: true }, { own: true }], 2826);
  const data = await loadSavedAnswerAnalytics(
    input({ allMarkets: true, responseSearch: "no match", ownership: "own" }),
  );
  expect(data.responses.totalCount).toBe(0);
  expect(data.history.rows.map((r) => r.date)).toEqual([
    "2026-10-22",
    "2026-10-23",
  ]);
  expect(data.history.rows[0].coverage).toMatchObject({
    expected: 4,
    completed: 3,
    failed: 1,
  });
  expect(data.history.rows[0].totals).toMatchObject({
    mentions: 2,
    totalMentions: 3,
  });
  expect(data.history.rows[0].totals.mentionRate).toBeCloseTo(200 / 3);
  const filtered = await loadSavedAnswerAnalytics(
    input({ allMarkets: true, engines: ["gemini"] }),
  );
  expect(filtered.history.rows).toEqual([]);
  const manual = await loadSavedAnswerAnalytics(
    input({
      trackerId: us.trackerId,
      runId: (await repo.listRuns("project", 20, us.trackerId))[0].id,
    }),
  );
  expect(manual.history.rows.map((r) => r.date)).toEqual(["2026-10-24"]);
});
