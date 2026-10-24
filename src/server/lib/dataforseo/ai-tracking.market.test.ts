import { beforeEach, expect, it, vi } from "vitest";
import { postAiTrackingTasks } from "./ai-tracking";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/server/lib/dataforseo/core", () => ({
  dataforseoPost: post,
  dataforseoGet: vi.fn(),
}));
beforeEach(() => {
  post.mockResolvedValue({
    status_code: 20000,
    tasks: [
      { id: "task", status_code: 20100, cost: 0, data: { tag: "answer" } },
    ],
  });
});

it.each([2840, 2826, 2784, 2356])(
  "sends market %s and the exact prompt to all three active engines",
  async (locationCode) => {
    const engines = [
      ["chatgpt", "/v3/ai_optimization/chat_gpt/llm_scraper"],
      ["gemini", "/v3/ai_optimization/gemini/llm_scraper"],
      ["google_ai_overview", "/v3/serp/google/organic"],
    ] as const;
    for (const [engine, endpoint] of engines) {
      await postAiTrackingTasks({
        engine,
        locationCode,
        languageCode: "en",
        tasks: [{ prompt: "Best AEM implementation partner?", tag: "answer" }],
      });
      expect(post).toHaveBeenLastCalledWith(
        `${endpoint}/task_post`,
        [
          {
            keyword: "Best AEM implementation partner?",
            location_code: locationCode,
            language_code: "en",
            tag: "answer",
            ...(engine === "google_ai_overview"
              ? { depth: 10, load_async_ai_overview: true }
              : {}),
          },
        ],
        { maxServerErrorRetries: 0 },
      );
    }
  },
);
