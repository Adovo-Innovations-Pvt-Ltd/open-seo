import type { AiTrackingReports } from "@/types/schemas/ai-tracking-reports";
import type {
  SavedAnswerAnalyticsInput,
  SavedAnswerAnalytics,
} from "@/types/schemas/ai-saved-answer-analytics";
import {
  readAnalyticsSources,
  previousAnalyticsSnapshot,
} from "../repositories/savedTrackingReportsRepository";
import {
  readSavedAnalyticsObservations,
  type ReportObservation,
  type ReportSource,
} from "./savedAnalyticsEvidence";
import { compareSavedPeriods } from "./savedTrackingPeriod";
import { savedBrandReports, savedRankingRows } from "./savedTrackingRankings";
import {
  savedSourceImpact,
  savedSourceCategories,
} from "./savedTrackingSources";
import { summarizeSavedAnswers } from "./savedAnswerMetrics";
import { aiMarketLabel } from "@/shared/ai-visibility";
export async function loadSavedTrackingReports(
  input: SavedAnswerAnalyticsInput,
  markets: SavedAnswerAnalytics["markets"],
  since: string,
): Promise<AiTrackingReports> {
  const split = Date.parse(since),
    previousStart = new Date(split - input.days * 86_400_000).toISOString(),
    end = new Date(split + input.days * 86_400_000).toISOString();
  const previous = input.runId
    ? []
    : (
        await Promise.all(
          markets.map((m) =>
            previousAnalyticsSnapshot(
              input.projectId,
              m.trackerId,
              previousStart,
              since,
            ),
          ),
        )
      ).filter((r) => r !== null);
  const scopes = new Map(
    markets
      .filter((m) => m.runId)
      .map((m) => [
        m.runId!,
        {
          trackerId: m.trackerId,
          market: m.label,
          locationCode: m.locationCode,
          languageCode: m.languageCode,
        },
      ]),
  );
  for (const r of previous)
    scopes.set(r.id, {
      trackerId: r.trackerId,
      market: aiMarketLabel(r),
      locationCode: r.locationCode,
      languageCode: r.languageCode,
    });
  const ids = [...scopes.keys()];
  const [observations, sources] = await Promise.all([
    readSavedAnalyticsObservations(input.projectId, ids, input),
    readAnalyticsSources(input.projectId, ids),
  ]);
  const sourcesByObservation = new Map<string, ReportSource[]>();
  for (const s of sources) {
    const group = sourcesByObservation.get(s.observationId) ?? [];
    group.push(s);
    sourcesByObservation.set(s.observationId, group);
  }
  const all: ReportObservation[] = observations.map((row) => ({
    row,
    ...scopes.get(row.runId)!,
    sources: sourcesByObservation.get(row.id) ?? [],
  }));
  const currentIds = new Set(
    markets.flatMap((m) => (m.runId ? [m.runId] : [])),
  );
  const current = all.filter((o) => currentIds.has(o.row.runId)),
    before = all.filter((o) => !currentIds.has(o.row.runId));
  const compared = compareSavedPeriods(
    current,
    before,
    { currentStart: since, previousStart, currentEnd: end },
    !!input.runId,
    input.reportBrand,
  );
  const brands = savedBrandReports(current),
    selected = brands.find((b) =>
      input.reportBrand ? b.domain === input.reportBrand : b.own,
    );
  const modelTopics = new Map<string, ReportObservation[]>();
  for (const o of current) {
    const key = JSON.stringify([o.row.topic, o.row.engine]),
      group = modelTopics.get(key) ?? [];
    group.push(o);
    modelTopics.set(key, group);
  }
  return {
    brands,
    matrix: {
      brandDomain: selected?.domain ?? null,
      eligible: selected?.answers ?? 0,
      ...(selected?.matrix ?? {
        both: 0,
        mentionedOnly: 0,
        citedOnly: 0,
        neither: 0,
      }),
    },
    rankings: savedRankingRows(current, compared.byPrevious, input),
    sources: savedSourceImpact(
      current,
      compared.sharedCurrent,
      compared.sharedPrevious,
      compared.period.status === "comparable",
      input,
    ),
    sourceCategories: savedSourceCategories(current),
    modelTopics: [...modelTopics.values()].map((group) => {
      const summary = summarizeSavedAnswers(group.map((o) => o.row));
      return {
        topic: group[0].row.topic,
        engine: group[0].row.engine,
        expected: summary.coverage.expected,
        answered: summary.coverage.completed,
        mentionRate: summary.totals.mentionRate,
        citationRate: summary.totals.citationRate,
        shareOfVoice: summary.totals.shareOfVoice,
      };
    }),
    period: compared.period,
  };
}
