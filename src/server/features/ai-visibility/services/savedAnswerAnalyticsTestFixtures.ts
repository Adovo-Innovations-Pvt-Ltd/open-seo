import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import { configuration } from "./aiVisibilityTestFixtures";

type Fixture = {
  ownOffset?: number | null;
  rivalOffset?: number | null;
  positions?: number[];
  text?: string | null;
  prompt?: string;
  status?: "completed" | "failed" | "pending";
  branded?: boolean;
  own?: boolean;
  rival?: boolean;
  ownCited?: boolean;
  rivalCited?: boolean;
  includeOwn?: boolean;
  sources?: string[];
};
export async function seedSavedAnswerAnalyticsRun(
  answers: Fixture[],
  locationCode = 2840,
  options: {
    projectId?: string;
    trackerId?: string;
    createdAt?: string;
    trigger?: "manual" | "baseline";
    ownName?: string;
  } = {},
) {
  const projectId = options.projectId ?? "project";
  const config = options.trackerId
    ? await repo.getConfiguration(projectId, options.trackerId)
    : configuration(
        {
          locationCode,
          languageCode: "en",
          engines: ["chatgpt"],
          prompts: answers.map((a, i) => ({
            text: a.prompt ?? `Question ${i}?`,
          })),
        },
        projectId,
      );
  if (!config) throw new Error("Missing fixture tracker");
  await repo.saveConfiguration(config);
  const runId = crypto.randomUUID();
  await repo.createRun(
    {
      id: runId,
      trackerId: config.tracker.id,
      projectId,
      status: "completed",
      trigger: options.trigger ?? "baseline",
      locationCode,
      languageCode: "en",
      createdAt: options.createdAt ?? "2026-10-22T12:00:00Z",
    },
    answers.map((a, i) => ({
      id: `${runId}:${i}`,
      runId,
      promptId: config.prompts.find(
        (p) => p.text === (a.prompt ?? `Question ${i}?`),
      )!.id,
      engine: "chatgpt",
      branded: a.branded ?? false,
    })),
  );
  for (const [i, a] of answers.entries()) {
    const id = `${runId}:${i}`,
      text = a.text === undefined ? "Saved answer" : a.text;
    await repo.persistAnswer({
      observationId: id,
      values: {
        status: a.status ?? "completed",
        answerMarkdown: a.status && a.status !== "completed" ? null : text,
      },
      sources: (a.sources ?? []).map((url, n) => ({
        id: crypto.randomUUID(),
        observationId: id,
        url,
        domain: new URL(url).hostname,
        title: null,
        position: a.positions?.[n] ?? n + 1,
      })),
      matches: [
        ...(a.includeOwn === false
          ? []
          : [
              {
                name: options.ownName ?? "OpenSEO",
                domain: "openseo.so",
                own: true,
                mentioned: a.own ?? false,
                cited: a.ownCited ?? false,
              },
            ]),
        {
          name: "Rival",
          domain: "rival.example",
          own: false,
          mentioned: a.rival ?? false,
          cited: a.rivalCited ?? false,
        },
      ].map((b) => ({
        ...b,
        id: crypto.randomUUID(),
        observationId: id,
        firstMention: b.mentioned
          ? b.own
            ? a.ownOffset === undefined
              ? 0
              : a.ownOffset
            : a.rivalOffset === undefined
              ? 0
              : a.rivalOffset
          : null,
      })),
    });
  }
  return { trackerId: config.tracker.id, runId, prompts: config.prompts };
}
