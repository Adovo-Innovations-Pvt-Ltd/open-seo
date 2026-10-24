import { beforeEach, expect, it, vi } from "vitest";
import { getSavedAnswerAnalyticsTool } from "./ai-saved-answer-analytics-tools";
import { savedAnswerAnalyticsSchema } from "@/types/schemas/ai-saved-answer-analytics";
import { makeToolContext } from "./tool-test-support";
const mocks = vi.hoisted(() => ({ project: vi.fn(), load: vi.fn() }));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: { getProjectForOrganization: mocks.project },
}));
vi.mock(
  "@/server/features/ai-visibility/services/aiSavedAnswerAnalytics",
  () => ({ loadSavedAnswerAnalytics: mocks.load }),
);
beforeEach(() => {
  mocks.project.mockResolvedValue(null);
});
it("authorizes the project before loading any cross-market saved evidence", async () => {
  await expect(
    getSavedAnswerAnalyticsTool.handler(
      savedAnswerAnalyticsSchema.parse({
        projectId: "00000000-0000-4000-8000-000000000001",
        allMarkets: true,
      }),
      makeToolContext(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(mocks.load).not.toHaveBeenCalled();
});
