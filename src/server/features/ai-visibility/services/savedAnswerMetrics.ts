import { sort } from "remeda";
import type { AiObservationRow } from "@/shared/ai-visibility";
import { aiAnswerCoverage } from "@/shared/ai-visibility-results";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";

export function isCompetitorGap(row: AiObservationRow) {
  const own = row.brands.find((brand) => brand.own);
  return (
    row.answerStatus === "answered" &&
    !!own &&
    !own.mentioned &&
    !own.cited &&
    row.brands.some((brand) => !brand.own && (brand.mentioned || brand.cited))
  );
}
export function percentage(count: number, denominator: number) {
  return denominator ? (count / denominator) * 100 : null;
}

/** Historical matches are counted once per brand and answer, without rematching text. */
export function summarizeSavedAnswers(rows: AiObservationRow[]) {
  const brands = new Map<string, SavedAnswerAnalytics["brands"][number]>();
  let ownAnswers = 0,
    mentions = 0,
    citations = 0,
    gaps = 0;
  for (const row of rows) {
    if (row.answerStatus !== "answered") continue;
    const own = row.brands.find((brand) => brand.own);
    if (own) {
      ownAnswers++;
      if (own.mentioned) mentions++;
      if (own.cited) citations++;
    }
    const gap = isCompetitorGap(row);
    if (gap) gaps++;
    for (const brand of row.brands) {
      const key = JSON.stringify([brand.domain, brand.own]);
      const summary = brands.get(key) ?? {
        domain: brand.domain,
        name: brand.name,
        matchedNames: [],
        own: brand.own,
        answers: 0,
        mentions: 0,
        citations: 0,
        shareOfVoice: null,
        gapCount: 0,
        gapEligibleAnswers: 0,
      };
      if (!summary.matchedNames.includes(brand.name))
        summary.matchedNames.push(brand.name);
      summary.answers++;
      if (brand.mentioned) summary.mentions++;
      if (brand.cited) summary.citations++;
      if (!brand.own && own) {
        summary.gapEligibleAnswers++;
        if (gap && (brand.mentioned || brand.cited)) summary.gapCount++;
      }
      brands.set(key, summary);
    }
  }
  const totalMentions = [...brands.values()].reduce(
    (n, b) => n + b.mentions,
    0,
  );
  const totals = {
    ownEligibleAnswers: ownAnswers,
    answered: rows.filter((r) => r.answerStatus === "answered").length,
    mentions,
    citations,
    mentionRate: percentage(mentions, ownAnswers),
    citationRate: percentage(citations, ownAnswers),
    shareOfVoice: ownAnswers ? percentage(mentions, totalMentions) : null,
    totalMentions,
    gaps,
  };
  return {
    totals,
    coverage: aiAnswerCoverage(rows),
    brands: sort(
      [...brands.values()].map((b) => ({
        ...b,
        shareOfVoice: percentage(b.mentions, totalMentions),
      })),
      (a, b) =>
        Number(b.own) - Number(a.own) ||
        b.mentions - a.mentions ||
        a.domain.localeCompare(b.domain),
    ),
  };
}

export function savedAnswerBreakdown(
  rows: AiObservationRow[],
  field: "engine" | "topic",
) {
  const groups = new Map<string, AiObservationRow[]>();
  for (const row of rows) {
    const group = groups.get(row[field]) ?? [];
    group.push(row);
    groups.set(row[field], group);
  }
  return [...groups].map(([label, group]) => {
    const { totals, coverage } = summarizeSavedAnswers(group);
    return {
      label,
      expected: coverage.expected,
      answered: totals.answered,
      mentions: totals.mentions,
      citations: totals.citations,
      shareOfVoice: totals.shareOfVoice,
      mentionRate: totals.mentionRate,
      citationRate: totals.citationRate,
    };
  });
}

export function brandSnapshotKey(row: AiObservationRow) {
  return JSON.stringify(
    sort(
      row.brands.map((b) => [b.domain, b.name, b.own]),
      (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
  );
}

const cellKey = (row: AiObservationRow) =>
  JSON.stringify([row.prompt, row.engine]);

/** Shared exact wording and engine; no inferred equivalence of regional variants. */
export function compareSavedMarkets(
  markets: SavedAnswerAnalytics["markets"],
  rowsByMarket: Map<string, AiObservationRow[]>,
) {
  const sets = markets.map(
    (m) => new Set((rowsByMarket.get(m.trackerId) ?? []).map(cellKey)),
  );
  const common = new Set(
    [...(sets[0] ?? [])].filter((key) => sets.every((set) => set.has(key))),
  );
  const groups = markets.map((m) => {
    const rows = (rowsByMarket.get(m.trackerId) ?? []).filter((r) =>
      common.has(cellKey(r)),
    );
    return { market: m, rows, summary: summarizeSavedAnswers(rows) };
  });
  const snapshots = new Map<string, Set<string>>();
  for (const group of groups)
    for (const row of group.rows) {
      if (row.answerStatus !== "answered") continue;
      const key = cellKey(row),
        names = snapshots.get(key) ?? new Set<string>();
      names.add(brandSnapshotKey(row));
      snapshots.set(key, names);
    }
  const matchingChanged = [...snapshots.values()].some(
    (names) => names.size > 1,
  );
  const covered = groups.every(
    (g) =>
      (percentage(g.summary.coverage.completed, g.summary.coverage.expected) ??
        0) >= 90,
  );
  const comparable =
    markets.length > 1 && common.size > 0 && covered && !matchingChanged;
  return {
    commonCells: common.size,
    commonPrompts: new Set(groups.flatMap((g) => g.rows.map((r) => r.prompt)))
      .size,
    comparable,
    reason:
      markets.length < 2
        ? "Select all markets to compare them."
        : !common.size
          ? "No shared exact prompt and engine cells in the selected snapshots."
          : !covered
            ? "Coverage is below 90% in at least one market. Rates are descriptive; no ranking or change is inferred."
            : matchingChanged
              ? "Historical brand matching names or competitor sets differ. Rates are descriptive; no ranking or change is inferred."
              : "Same exact prompt and engine cells, stable brand snapshots and at least 90% answer coverage in each market. Collection dates may differ.",
    rows: groups.map(({ market, summary }) => ({
      trackerId: market.trackerId,
      label: market.label,
      coverage: summary.coverage,
      totals: summary.totals,
    })),
  };
}
