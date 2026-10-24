import { aiAnswerCoverage } from "@/shared/ai-visibility-results";
import type { AiTrackingReports } from "@/types/schemas/ai-tracking-reports";
import {
  brandSnapshotKey,
  percentage,
  summarizeSavedAnswers,
} from "./savedAnswerMetrics";
import {
  reportCell,
  reportPresence,
  type ReportObservation,
} from "./savedAnalyticsEvidence";
function reportMetric(rows: ReportObservation[], domain?: string) {
  const summary = summarizeSavedAnswers(rows.map((o) => o.row));
  const brand = summary.brands.find((b) =>
    domain ? b.domain === domain : b.own,
  );
  return {
    answered: summary.totals.answered,
    eligible: brand?.answers ?? 0,
    mentions: brand?.mentions ?? 0,
    citations: brand?.citations ?? 0,
    mentionRate: percentage(brand?.mentions ?? 0, brand?.answers ?? 0),
    citationRate: percentage(brand?.citations ?? 0, brand?.answers ?? 0),
    shareOfVoice: brand?.shareOfVoice ?? null,
  };
}
export function compareSavedPeriods(
  current: ReportObservation[],
  previous: ReportObservation[],
  dates: { currentStart: string; previousStart: string; currentEnd: string },
  explicit: boolean,
  domain?: string,
) {
  const byPrevious = new Map(previous.map((o) => [reportCell(o), o]));
  const sharedCurrent = current.filter((o) => byPrevious.has(reportCell(o)));
  const sharedPrevious = sharedCurrent.map(
    (o) => byPrevious.get(reportCell(o))!,
  );
  const currentCoverage = aiAnswerCoverage(sharedCurrent.map((o) => o.row));
  const previousCoverage = aiAnswerCoverage(sharedPrevious.map((o) => o.row));
  const stable = sharedCurrent.every(
    (o, i) =>
      brandSnapshotKey(o.row) === brandSnapshotKey(sharedPrevious[i].row),
  );
  const covered = [currentCoverage, previousCoverage].every(
    (c) => c.expected > 0 && c.completed / c.expected >= 0.9,
  );
  let status: AiTrackingReports["period"]["status"] = "comparable";
  let reason =
    "Same exact market, language, prompt and engine cells; stable brand snapshots and at least 90% answer coverage in both periods. Deltas use only shared cells answered in both periods, not the full snapshot totals.";
  if (explicit) {
    status = "explicit_check";
    reason =
      "One saved check is selected. Choose Latest scheduled / baseline to compare reporting periods.";
  } else if (!previous.length) {
    status = "no_previous";
    reason =
      "No finished scheduled or baseline observations in the preceding period. Previous metrics and changes are unavailable, rather than zero.";
  } else if (!sharedCurrent.length || !stable) {
    status = "scope_changed";
    reason =
      "No shared exact collection cells, or historical brand identities differ. Snapshot metrics are descriptive; changes are withheld.";
  } else if (!covered) {
    status = "incomplete";
    reason =
      "Answer coverage is below 90% in at least one period. Shared-cohort metrics are descriptive; changes are withheld.";
  }
  const pairedCurrent = sharedCurrent.filter(
    (o, i) =>
      o.row.answerStatus === "answered" &&
      sharedPrevious[i].row.answerStatus === "answered",
  );
  const pairedPrevious = pairedCurrent.map(
    (o) => byPrevious.get(reportCell(o))!,
  );
  const a = sharedCurrent.length ? pairedCurrent : current,
    b = sharedPrevious.length ? pairedPrevious : previous;
  const now = reportMetric(a, domain),
    before = reportMetric(b, domain);
  const delta = (x: number | null, y: number | null) =>
    status === "comparable" && x !== null && y !== null ? x - y : null;
  const domains = [
    ...new Set(
      [...a, ...b].flatMap((o) => o.row.brands.map((brand) => brand.domain)),
    ),
  ];
  const period: AiTrackingReports["period"] = {
    ...dates,
    status,
    reason,
    commonCells: sharedCurrent.length,
    currentCoverage: sharedCurrent.length
      ? currentCoverage
      : aiAnswerCoverage(a.map((o) => o.row)),
    previousCoverage: sharedPrevious.length
      ? previousCoverage
      : aiAnswerCoverage(b.map((o) => o.row)),
    current: now,
    previous: before,
    mentionDelta: delta(now.mentionRate, before.mentionRate),
    citationDelta: delta(now.citationRate, before.citationRate),
    shareDelta: delta(now.shareOfVoice, before.shareOfVoice),
    brands: domains.map((brand) => {
      const x = reportMetric(a, brand),
        y = reportMetric(b, brand);
      return {
        domain: brand,
        own: [...a, ...b].some((o) =>
          o.row.brands.some((v) => v.domain === brand && v.own),
        ),
        current: x,
        previous: y,
        mentionDelta: delta(x.mentionRate, y.mentionRate),
        citationDelta: delta(x.citationRate, y.citationRate),
        shareDelta: delta(x.shareOfVoice, y.shareOfVoice),
      };
    }),
  };
  return {
    period,
    sharedCurrent: pairedCurrent,
    sharedPrevious: pairedPrevious,
    byPrevious,
  };
}
export function savedPresenceChange(
  current: ReportObservation,
  previous?: ReportObservation,
  domain?: string,
): "gained" | "lost" | "retained" | "absent" | "unknown" {
  if (
    !previous ||
    brandSnapshotKey(current.row) !== brandSnapshotKey(previous.row)
  )
    return "unknown";
  const a = reportPresence(current, domain),
    b = reportPresence(previous, domain);
  return a === null || b === null
    ? "unknown"
    : a
      ? b
        ? "retained"
        : "gained"
      : b
        ? "lost"
        : "absent";
}
