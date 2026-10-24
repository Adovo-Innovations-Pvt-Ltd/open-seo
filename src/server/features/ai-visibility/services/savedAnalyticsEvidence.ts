import type { AiObservationRow } from "@/shared/ai-visibility";
import type { SavedAnswerAnalyticsInput } from "@/types/schemas/ai-saved-answer-analytics";
import { readSavedAnalyticsHistory } from "../repositories/savedAnswerHistoryRepository";
import type { readAnalyticsSources } from "../repositories/savedTrackingReportsRepository";
export type ReportSource = Awaited<
  ReturnType<typeof readAnalyticsSources>
>[number];
export interface ReportObservation {
  row: AiObservationRow;
  trackerId: string;
  market: string;
  locationCode: number;
  languageCode: string;
  sources: ReportSource[];
}
export async function readSavedAnalyticsObservations(
  projectId: string,
  runIds: string[],
  input: SavedAnswerAnalyticsInput,
) {
  const evidence = await readSavedAnalyticsHistory(projectId, runIds);
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
  return [...observations.values()];
}
export function reportCell(o: ReportObservation) {
  return JSON.stringify([
    o.trackerId,
    o.locationCode,
    o.languageCode,
    o.row.prompt,
    o.row.engine,
    o.row.branded,
  ]);
}
export function reportBrand(o: ReportObservation, domain?: string) {
  return o.row.brands.find((b) => (domain ? b.domain === domain : b.own));
}
export function reportPresence(o: ReportObservation, domain?: string) {
  const brand = reportBrand(o, domain);
  return o.row.answerStatus === "answered" && brand
    ? brand.mentioned || brand.cited
    : null;
}
export function reportPage<T>(rows: T[], requested: number, limit: number) {
  const pages = Math.max(1, Math.ceil(rows.length / limit)),
    page = Math.min(requested, pages);
  return {
    totalCount: rows.length,
    page,
    pages,
    rows: rows.slice((page - 1) * limit, page * limit),
  };
}
