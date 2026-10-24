import { sort } from "remeda";
import { summarizeAiBrands } from "@/shared/ai-visibility-results";
import { ownedAiDomain } from "./aiVisibilityMatching";
import { percentage } from "./savedAnswerMetrics";
import type { AiTrackingReports } from "@/types/schemas/ai-tracking-reports";
import type { SavedAnswerAnalyticsInput } from "@/types/schemas/ai-saved-answer-analytics";
import {
  reportBrand,
  reportCell,
  reportPage,
  reportPresence,
  type ReportObservation,
} from "./savedAnalyticsEvidence";
import { savedPresenceChange } from "./savedTrackingPeriod";
function savedMatrixKey(mentioned: boolean, cited: boolean) {
  return mentioned
    ? cited
      ? "both"
      : "mentionedOnly"
    : cited
      ? "citedOnly"
      : "neither";
}
function citationPosition(o: ReportObservation, domain: string) {
  const positions = o.sources
    .filter((s) => ownedAiDomain(s.domain, domain) && s.position > 0)
    .map((s) => s.position);
  return positions.length ? Math.min(...positions) : null;
}
function gapType(
  o: ReportObservation,
  domain?: string,
): AiTrackingReports["rankings"]["rows"][number]["gap"] {
  const own = reportPresence(o, domain);
  if (own === null) return "unknown";
  const selected = reportBrand(o, domain);
  const rivals = o.row.brands.filter((b) => b.domain !== selected?.domain);
  if (!rivals.length) return "unknown";
  const rival = rivals.some((b) => b.mentioned || b.cited);
  return own ? (rival ? "shared" : "unique") : rival ? "missing" : "neither";
}
export function savedRankingRows(
  current: ReportObservation[],
  previous: Map<string, ReportObservation>,
  input: SavedAnswerAnalyticsInput,
) {
  const rows = current
    .map((o) => {
      const positions = summarizeAiBrands([o.row]);
      return {
        observationId: o.row.id,
        prompt: o.row.prompt,
        topic: o.row.topic,
        market: o.market,
        trackerId: o.trackerId,
        engine: o.row.engine,
        status: o.row.answerStatus ?? o.row.status,
        gap: gapType(o, input.reportBrand),
        change: savedPresenceChange(
          o,
          previous.get(reportCell(o)),
          input.reportBrand,
        ),
        brands:
          o.row.answerStatus === "answered"
            ? o.row.brands.map((b) => ({
                domain: b.domain,
                own: b.own,
                mentioned: b.mentioned,
                cited: b.cited,
                mentionOrder: positions.find((p) => p.domain === b.domain)
                  ?.positionCount
                  ? positions.find((p) => p.domain === b.domain)!.positionTotal
                  : null,
                citationPosition: citationPosition(o, b.domain),
              }))
            : [],
      };
    })
    .filter((row) => {
      const brand = row.brands.find((b) =>
        input.reportBrand ? b.domain === input.reportBrand : b.own,
      );
      return (
        (!input.reportSearch ||
          `${row.prompt} ${row.topic} ${row.market} ${row.engine}`
            .toLowerCase()
            .includes(input.reportSearch.toLowerCase())) &&
        (input.reportGap === "all" || row.gap === input.reportGap) &&
        (input.reportChange === "all" || row.change === input.reportChange) &&
        (input.reportMatrix === "all" ||
          (!!brand &&
            savedMatrixKey(brand.mentioned, brand.cited) ===
              input.reportMatrix))
      );
    });
  return reportPage(rows, input.reportPage, input.limit);
}
export function savedBrandReports(
  current: ReportObservation[],
): AiTrackingReports["brands"] {
  const rows = current.map((o) => o.row),
    summaries = summarizeAiBrands(rows),
    totalMentions = summaries.reduce((n, b) => n + b.mentions, 0);
  return sort(
    summaries.map((b) => {
      const observations = current.filter(
        (o) => o.row.answerStatus === "answered" && reportBrand(o, b.domain),
      );
      const positions = observations
        .map((o) => citationPosition(o, b.domain))
        .filter((p) => p !== null);
      const matrix = { both: 0, mentionedOnly: 0, citedOnly: 0, neither: 0 };
      for (const o of observations) {
        const brand = reportBrand(o, b.domain)!;
        matrix[savedMatrixKey(brand.mentioned, brand.cited)]++;
      }
      const eligibleOverlap = observations.filter((o) => reportBrand(o));
      const sources = new Set(
        eligibleOverlap
          .filter((o) => reportPresence(o, b.domain))
          .flatMap((o) => o.sources.map((s) => s.domain)),
      );
      const ownSet = new Set(
        eligibleOverlap
          .filter((o) => reportPresence(o))
          .flatMap((o) => o.sources.map((s) => s.domain)),
      );
      const intersection = [...sources].filter((s) => ownSet.has(s)).length;
      return {
        domain: b.domain,
        name: b.name,
        own: b.own,
        answers: b.answers,
        mentions: b.mentions,
        citations: b.citations,
        mentionRate: percentage(b.mentions, b.answers),
        citationRate: percentage(b.citations, b.answers),
        shareOfVoice: percentage(b.mentions, totalMentions),
        averageMentionOrder: b.positionCount
          ? b.positionTotal / b.positionCount
          : null,
        averageCitationPosition: positions.length
          ? positions.reduce((a, v) => a + v, 0) / positions.length
          : null,
        mentionPositionAnswers: b.positionCount,
        citationPositionAnswers: positions.length,
        topThreeCitations: positions.filter((p) => p <= 3).length,
        matrix,
        sources: sources.size,
        sharedOwnSources: intersection,
        sourceOverlapEligibleAnswers: eligibleOverlap.length,
        sourceOverlap: eligibleOverlap.length
          ? percentage(intersection, new Set([...sources, ...ownSet]).size)
          : null,
      };
    }),
    (a, b) =>
      b.mentions - a.mentions ||
      b.citations - a.citations ||
      a.domain.localeCompare(b.domain),
  );
}
