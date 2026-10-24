import { beforeEach, expect, it, vi } from "vitest";
import { projects } from "@/db/schema";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { listTrendRuns } from "../repositories/aiVisibilityTrendRepository";
import { saveTracker } from "./aiVisibilitySetup";
import { setSchedule } from "./aiVisibilitySchedule";
import { getTracker } from "./aiVisibilityState";
import { loadAiResults } from "./aiVisibilityResults";
import { aiResultsSchema } from "@/types/schemas/ai-visibility";
import { configuration, customer } from "./aiVisibilityTestFixtures";

const { testDb } = await vi.hoisted(async () => {
  const { createAiVisibilityTestDb } = await import("../aiVisibilityTestDb");
  return { testDb: await createAiVisibilityTestDb() };
});
vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));
vi.mock("@/db", () => ({ db: testDb.db }));
vi.mock("@/db/runBatch", () => ({ runBatch: testDb.runBatch }));
vi.mock("@/server/lib/runtime-env", () => ({
  getOptionalEnvValue: async () => "test-key",
  isHostedServerAuthMode: async () => false,
}));
beforeEach(async () => {
  await testDb.seedProject();
});

async function markets() {
  const us = configuration({
    engines: ["chatgpt"],
    prompts: [{ text: "US question?" }],
  });
  const uk = configuration({
    locationCode: 2826,
    languageCode: "en",
    engines: ["gemini"],
    prompts: [{ text: "UK question?" }],
  });
  await repo.saveConfiguration(us);
  await repo.saveConfiguration(uk);
  return { us, uk };
}

it("selects the project default and edits only the requested market without moving its schedule", async () => {
  const { us, uk } = await markets();
  const nextCheckAt = "2026-11-01T09:34:00.000Z";
  await repo.updateTracker(uk.tracker.id, { enabled: true, nextCheckAt });
  const beforeUs = await repo.getConfiguration("project", us.tracker.id);
  expect((await getTracker({ projectId: "project" })).tracker?.id).toBe(
    us.tracker.id,
  );
  const saved = await saveTracker({
    projectId: "project",
    trackerId: uk.tracker.id,
    prompts: [{ id: uk.prompts[0].id, text: "UK question?", paused: true }],
  });
  expect(saved.state.tracker).toMatchObject({
    id: uk.tracker.id,
    enabled: true,
    nextCheckAt,
  });
  expect(saved.state.prompts[0]?.paused).toBe(true);
  await setSchedule(
    { projectId: "project", trackerId: uk.tracker.id, enabled: false },
    customer,
  );
  expect(await repo.getConfiguration("project", us.tracker.id)).toEqual(
    beforeUs,
  );
  expect(await repo.getTracker("project", uk.tracker.id)).toMatchObject({
    enabled: false,
    nextCheckAt,
  });
});

it("adds an empty paused market and rejects duplicate or foreign market edits", async () => {
  const { us } = await markets();
  const added = await saveTracker({
    projectId: "project",
    createMarket: true,
    locationCode: 2356,
    languageCode: "en",
  });
  expect(added.state.tracker).toMatchObject({
    enabled: false,
    nextCheckAt: null,
    locationCode: 2356,
  });
  expect(added.state.prompts).toEqual([]);
  await expect(
    saveTracker({
      projectId: "project",
      createMarket: true,
      locationCode: 2840,
      languageCode: "en",
    }),
  ).rejects.toMatchObject({ reason: "MARKET_EXISTS" });
  await testDb.db
    .insert(projects)
    .values({ id: "other", organizationId: "organization", name: "Other" });
  await expect(
    saveTracker({
      projectId: "other",
      trackerId: us.tracker.id,
      engines: ["gemini"],
    }),
  ).rejects.toMatchObject({ reason: "TRACKER_NOT_FOUND" });
  expect((await repo.listTrackers("project")).length).toBe(3);
});

it("keeps default results, market results, trends and prompt history isolated", async () => {
  const { us, uk } = await markets();
  for (const config of [us, uk]) {
    const id = config.tracker.id;
    await repo.createRun(
      {
        id,
        trackerId: id,
        projectId: "project",
        status: "completed",
        trigger: "scheduled",
        locationCode: config.tracker.locationCode,
        languageCode: "en",
        createdAt: "2026-10-01T12:00:00.000Z",
      },
      [
        {
          id: `answer-${id}`,
          runId: id,
          promptId: config.prompts[0].id,
          engine: "chatgpt",
          branded: false,
        },
      ],
    );
  }
  const defaults = aiResultsSchema.parse({
    projectId: "00000000-0000-4000-8000-000000000001",
    branded: "all",
  });
  const input = { ...defaults, projectId: "project" };
  expect((await loadAiResults(input)).rows.map((row) => row.prompt)).toEqual([
    "US question?",
  ]);
  expect(
    (await loadAiResults({ ...input, trackerId: uk.tracker.id })).rows.map(
      (row) => row.prompt,
    ),
  ).toEqual(["UK question?"]);
  expect(
    (await getTracker({ projectId: "project", promptId: uk.prompts[0].id }))
      .tracker?.id,
  ).toBe(uk.tracker.id);
  expect(
    (
      await loadAiResults({
        ...input,
        promptId: uk.prompts[0].id,
        includeHistory: true,
      })
    ).runId,
  ).toBe(uk.tracker.id);
  expect(
    (await listTrendRuns("project", "2026-09-01", uk.tracker.id)).map(
      (run) => run.id,
    ),
  ).toEqual([uk.tracker.id]);
  await expect(
    loadAiResults({ ...input, trackerId: uk.tracker.id, runId: us.tracker.id }),
  ).rejects.toMatchObject({ reason: "RUN_NOT_FOUND" });
});
