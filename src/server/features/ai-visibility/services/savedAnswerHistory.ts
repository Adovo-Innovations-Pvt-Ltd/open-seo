import { sort } from "remeda";
import type { AiObservationRow } from "@/shared/ai-visibility";
import type {
  SavedAnswerAnalytics,
  SavedAnswerAnalyticsInput,
} from "@/types/schemas/ai-saved-answer-analytics";
import {
  listSavedAnalyticsRuns,
  readSavedAnalyticsHistory,
} from "../repositories/savedAnswerHistoryRepository";
import { summarizeSavedAnswers } from "./savedAnswerMetrics";

export async function loadSavedAnswerHistory(
  input: SavedAnswerAnalyticsInput,
  trackerIds: string[],
  since: string,
): Promise<SavedAnswerAnalytics["history"]> {
  const found = await listSavedAnalyticsRuns(
    input.projectId,
    trackerIds,
    since,
    input.runId,
  );
  const runs = found.slice(0, 200);
  const evidence = await readSavedAnalyticsHistory(
    input.projectId,
    runs.map((r) => r.id),
  );
  const observations = new Map<string, AiObservationRow>();
  for (const row of evidence) {
    if (
      (input.topic && row.topic !== input.topic) ||
      (input.engines && !input.engines.includes(row.engine)) ||
      (input.branded !== "all" &&
        (input.branded === "branded" ? !row.branded : row.branded))
    )
      continue;
    const observation = observations.get(row.id) ?? {
      id: row.id,
      runId: row.runId,
      promptId: row.promptId,
      prompt: row.prompt,
      topic: row.topic,
      branded: row.branded,
      engine: row.engine,
      status: row.status,
      answerStatus:
        row.status !== "completed"
          ? null
          : row.hasAnswer
            ? "answered"
            : "no_answer",
      collectedAt: row.collectedAt,
      error: null,
      citationCount: row.citationCount,
      brands: [],
    };
    if (row.brand)
      observation.brands.push({
        name: row.brand.name,
        domain: row.brand.domain,
        own: row.brand.own,
        mentioned: row.brand.mentioned,
        cited: row.brand.cited,
        firstMention: row.brand.firstMention,
      });
    observations.set(row.id, observation);
  }
  const dates = new Map(runs.map((r) => [r.id, r.createdAt.slice(0, 10)]));
  const days = new Map<string, AiObservationRow[]>();
  for (const row of observations.values()) {
    const date = dates.get(row.runId)!;
    const day = days.get(date) ?? [];
    day.push(row);
    days.set(date, day);
  }
  return {
    truncated: found.length > 200,
    rows: sort([...days], ([a], [b]) => a.localeCompare(b)).map(
      ([date, rows]) => ({ date, ...summarizeSavedAnswers(rows) }),
    ),
  };
}
