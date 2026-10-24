import { loadSavedTrackingReports } from "./savedTrackingReports";
import { loadSavedAnswerHistory } from "./savedAnswerHistory";
import { sort } from "remeda";
import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import {
  findAnalyticsSnapshot,
  listSnapshotPromptIds,
} from "../repositories/aiSavedAnswerAnalyticsRepository";
import { loadAiFullAnswers } from "./aiVisibilityResults";
import { AiVisibilityError } from "./aiVisibilityErrors";
import {
  aiEngineUsesModelApi,
  aiMarketLabel,
  type AiAnswer,
  type AiObservationRow,
} from "@/shared/ai-visibility";
import type {
  SavedAnswerAnalytics,
  SavedAnswerAnalyticsInput,
} from "@/types/schemas/ai-saved-answer-analytics";
import {
  brandSnapshotKey,
  compareSavedMarkets,
  isCompetitorGap,
  savedAnswerBreakdown,
  summarizeSavedAnswers,
} from "./savedAnswerMetrics";
import {
  collectSavedSources,
  savedSourceRows,
  savedSourceOwnership,
  type SavedSourceGroup,
} from "./savedAnswerSources";

/** Read-only analytics: never schedules, repairs a workflow, rematches or collects answers. */
export async function loadSavedAnswerAnalytics(
  input: SavedAnswerAnalyticsInput,
): Promise<SavedAnswerAnalytics> {
  const since = new Date(Date.now() - input.days * 86_400_000).toISOString();
  const all = await repo.listTrackers(input.projectId);
  const selected = input.allMarkets
    ? all
    : [
        all.find((t) =>
          input.trackerId ? t.id === input.trackerId : t.id === all[0]?.id,
        ),
      ].filter((t) => t !== undefined);
  if (input.trackerId && !selected.length)
    throw new AiVisibilityError(
      "TRACKER_NOT_FOUND",
      "This market is not available in the selected project.",
    );
  if (selected.length > 8)
    throw new AiVisibilityError(
      "ANALYTICS_MARKET_LIMIT",
      "Choose a single market. This dashboard can compare up to eight markets at once.",
    );
  const rows: AiObservationRow[] = [],
    responses: SavedAnswerAnalytics["responses"]["rows"] = [];
  const allSources = new Map<string, SavedSourceGroup>();
  const citedUrls = new Set<string>();
  let citationCount = 0;
  const sources = new Map<string, SavedSourceGroup>(),
    rowsByMarket = new Map<string, AiObservationRow[]>();
  const markets: SavedAnswerAnalytics["markets"] = [],
    topics = new Set<string>();
  // Bound peak memory: discard one run's full answer prose before loading the next market.
  for (const tracker of selected) {
    const [snapshot, config] = await Promise.all([
      findAnalyticsSnapshot(input.projectId, tracker.id, since, input.runId),
      repo.getConfiguration(input.projectId, tracker.id),
    ]);
    if (input.runId && !snapshot)
      throw new AiVisibilityError(
        "RUN_NOT_FOUND",
        "Choose a finished run belonging to this market and project.",
      );
    for (const prompt of config?.prompts ?? [])
      if (!prompt.archived) topics.add(prompt.topic);
    const loaded = snapshot
      ? await loadAiFullAnswers({
          projectId: input.projectId,
          trackerId: tracker.id,
          runId: snapshot.id,
          topic: input.topic,
          engines: input.engines,
          branded: input.branded,
          includeHistory: false,
          competitorGap: false,
          limit: 50,
        })
      : null;
    const snapshotPromptIds = snapshot
      ? new Set(await listSnapshotPromptIds(input.projectId, snapshot.id))
      : new Set<string>();
    const configured =
      config?.prompts.filter((p) => !p.archived && !p.paused) ?? [];
    const answers = loaded?.answers ?? [];
    const marketRows = answers.map((a) => a.observation);
    rows.push(...marketRows);
    rowsByMarket.set(tracker.id, marketRows);
    const summary = summarizeSavedAnswers(marketRows);
    markets.push({
      trackerId: tracker.id,
      label: aiMarketLabel(snapshot ?? tracker),
      locationCode: snapshot?.locationCode ?? tracker.locationCode,
      languageCode: snapshot?.languageCode ?? tracker.languageCode,
      runId: snapshot?.id ?? null,
      createdAt: snapshot?.createdAt ?? null,
      status: snapshot?.status ?? null,
      configuredPrompts: configured.length,
      uncollectedPrompts: configured.filter((p) => !snapshotPromptIds.has(p.id))
        .length,
      snapshotPrompts: snapshotPromptIds.size,
      coverage: summary.coverage,
      totals: summary.totals,
    });
    collectSavedSources(sources, answers, input);
    collectSavedSources(allSources, answers, {
      ...input,
      ownership: "all",
      groupBy: "domain",
    });
    for (const answer of answers) {
      if (answer.observation.answerStatus === "answered") {
        const urls = new Set(answer.sources.map((s) => s.url));
        citationCount += urls.size;
        for (const url of urls) citedUrls.add(url);
      }
      const response = responseRow(
        answer,
        input,
        tracker.id,
        aiMarketLabel({
          locationCode: answer.requestedLocationCode,
          languageCode: answer.requestedLanguageCode,
        }),
      );
      if (response) responses.push(response);
    }
  }
  const summary = summarizeSavedAnswers(rows);
  const engines = [...new Set(rows.map((r) => r.engine))];
  const brandSetsDiffer =
    new Set(
      rows.filter((r) => r.answerStatus === "answered").map(brandSnapshotKey),
    ).size > 1;
  const mixedMethods =
    engines.some(aiEngineUsesModelApi) &&
    engines.some((e) => !aiEngineUsesModelApi(e));
  const warnings = analyticsWarnings(markets, brandSetsDiffer, mixedMethods);
  const availableRuns =
    selected.length === 1
      ? await repo.listRuns(input.projectId, 20, selected[0].id)
      : [];
  return {
    version: 1,
    trackingReports: await loadSavedTrackingReports(input, markets, since),
    history: await loadSavedAnswerHistory(
      input,
      selected.map((t) => t.id),
      since,
    ),
    scope: {
      since,
      days: input.days,
      allMarkets: input.allMarkets,
      branded: input.branded,
      topic: input.topic ?? null,
      engines,
      brandSetsDiffer,
      mixedMethods,
    },
    ...summary,
    markets,
    availableMarkets: all.map((t) => ({ id: t.id, label: aiMarketLabel(t) })),
    citationSummary: {
      answersWithSources: rows.filter(
        (r) => r.answerStatus === "answered" && r.citationCount > 0,
      ).length,
      citations: citationCount,
      domains: allSources.size,
      urls: citedUrls.size,
    },
    topSources: savedSourceRows(allSources, summary.totals.answered).slice(
      0,
      10,
    ),
    topics: sort([...topics], (a, b) => a.localeCompare(b)),
    availableRuns: availableRuns
      .filter((r) => r.status !== "queued" && r.status !== "running")
      .map(({ id, createdAt, trigger, status }) => ({
        id,
        createdAt,
        trigger,
        status,
      })),
    warnings,
    engines: savedAnswerBreakdown(rows, "engine"),
    topicBreakdown: savedAnswerBreakdown(rows, "topic"),
    sources: paginate(
      savedSourceRows(sources, summary.totals.answered),
      input.sourcePage,
      input.limit,
    ),
    responses: paginate(responses, input.responsePage, input.limit),
    comparison: compareSavedMarkets(markets, rowsByMarket),
  };
}

function responseRow(
  answer: AiAnswer,
  input: SavedAnswerAnalyticsInput,
  trackerId: string,
  market: string,
): SavedAnswerAnalytics["responses"]["rows"][number] | null {
  const row = answer.observation,
    gap = isCompetitorGap(row);
  if (
    (input.signal || input.source || input.brandDomain) &&
    row.answerStatus !== "answered"
  )
    return null;
  if (
    input.brandDomain &&
    !input.signal &&
    !row.brands.some(
      (b) => b.domain === input.brandDomain && (b.mentioned || b.cited),
    )
  )
    return null;
  if (
    input.answerState !== "all" &&
    row.answerStatus !== input.answerState &&
    row.status !== input.answerState
  )
    return null;
  if (
    input.signal === "gap" &&
    (!gap ||
      (input.brandDomain &&
        !row.brands.some(
          (b) =>
            !b.own &&
            b.domain === input.brandDomain &&
            (b.mentioned || b.cited),
        )))
  )
    return null;
  if (
    input.signal &&
    input.signal !== "gap" &&
    !row.brands.some(
      (b) =>
        (input.brandDomain ? b.domain === input.brandDomain : b.own) &&
        (input.signal === "mentioned" ? b.mentioned : b.cited),
    )
  )
    return null;
  if (
    input.source &&
    !answer.sources.some(
      (s) =>
        (input.groupBy === "domain" ? s.domain : s.url) === input.source &&
        (input.ownership === "all" ||
          savedSourceOwnership(row, s.domain) === input.ownership),
    )
  )
    return null;
  const text = answer.answerText ?? "",
    search = input.responseSearch;
  const found = text.toLowerCase().indexOf(search.toLowerCase());
  if (search && (row.answerStatus !== "answered" || found < 0)) return null;
  const start = search ? Math.max(0, found - 80) : 0,
    end = Math.min(text.length, start + 280);
  return {
    id: row.id,
    runId: row.runId,
    promptId: row.promptId,
    prompt: row.prompt,
    topic: row.topic,
    trackerId,
    market,
    engine: row.engine,
    status: row.status,
    answerStatus: row.answerStatus,
    collectedAt: row.collectedAt,
    snippet: text
      ? `${start ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`
      : null,
    gap,
  };
}
function paginate<T>(rows: T[], requested: number, limit: number) {
  const pages = Math.max(1, Math.ceil(rows.length / limit)),
    page = Math.min(requested, pages);
  return {
    rows: rows.slice((page - 1) * limit, page * limit),
    totalCount: rows.length,
    page,
    pages,
  };
}
function analyticsWarnings(
  markets: SavedAnswerAnalytics["markets"],
  brandSetsDiffer: boolean,
  mixedMethods: boolean,
) {
  const warnings: string[] = [];
  if (markets.some((m) => !m.runId))
    warnings.push(
      "Some markets have no finished scheduled or baseline check in this window. They are shown without a visibility score.",
    );
  if (markets.some((m) => m.uncollectedPrompts > 0))
    warnings.push(
      "Some configured prompts are outside the saved checks. They enter these metrics after collection; they are not counted as absent brands. Snapshot prompt counts cover the whole check before cohort filters.",
    );
  if (
    markets.some(
      (m) =>
        m.coverage.expected && m.coverage.completed / m.coverage.expected < 0.9,
    )
  )
    warnings.push(
      "Answer coverage is below 90%. Failures and missing answers are excluded from visibility rates, so treat these samples as incomplete.",
    );
  if (brandSetsDiffer)
    warnings.push(
      "Historical brand names or competitor sets differ. Scores use the stored matches and tracked brand set for each answer; no historical answer has been rematched.",
    );
  if (mixedMethods)
    warnings.push(
      "This selection combines consumer-site answers and live model-API answers. Filter by engine to inspect each collection method separately.",
    );
  return warnings;
}
