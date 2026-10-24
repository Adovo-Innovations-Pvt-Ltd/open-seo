import { sort } from "remeda";
import type { SavedAnswerAnalyticsInput } from "@/types/schemas/ai-saved-answer-analytics";
import type { AiTrackingReports } from "@/types/schemas/ai-tracking-reports";
import { ownedAiDomain } from "./aiVisibilityMatching";
import { percentage, isCompetitorGap } from "./savedAnswerMetrics";
import {
  reportBrand,
  reportPage,
  type ReportObservation,
  type ReportSource,
} from "./savedAnalyticsEvidence";
function savedSourceChannel(domain: string): "reddit" | "youtube" | "web" {
  return ownedAiDomain(domain, "reddit.com")
    ? "reddit"
    : ownedAiDomain(domain, "youtube.com") || ownedAiDomain(domain, "youtu.be")
      ? "youtube"
      : "web";
}
function sourceGroups(
  observations: ReportObservation[],
  groupBy: "domain" | "url",
) {
  const groups = new Map<
    string,
    {
      source: ReportSource;
      observations: Map<
        string,
        { observation: ReportObservation; position: number | null }
      >;
    }
  >();
  for (const o of observations) {
    if (o.row.answerStatus !== "answered") continue;
    for (const source of o.sources) {
      const key = groupBy === "domain" ? source.domain : source.url;
      const group = groups.get(key) ?? {
        source,
        observations: new Map<
          string,
          { observation: ReportObservation; position: number | null }
        >(),
      };
      const prior = group.observations.get(o.row.id)?.position ?? null;
      group.observations.set(o.row.id, {
        observation: o,
        position:
          source.position > 0
            ? prior === null
              ? source.position
              : Math.min(prior, source.position)
            : prior,
      });
      groups.set(key, group);
    }
  }
  return groups;
}
export function savedSourceImpact(
  current: ReportObservation[],
  sharedCurrent: ReportObservation[],
  sharedPrevious: ReportObservation[],
  comparable: boolean,
  input: SavedAnswerAnalyticsInput,
): AiTrackingReports["sources"] {
  const groups = sourceGroups(current, input.groupBy),
    previous = sourceGroups(sharedPrevious, input.groupBy),
    matched = sourceGroups(sharedCurrent, input.groupBy);
  const answered = current.filter((o) => o.row.answerStatus === "answered");
  const eligible = answered.filter((o) => reportBrand(o, input.reportBrand));
  const totalMentions = eligible.filter(
    (o) => reportBrand(o, input.reportBrand)?.mentioned,
  ).length;
  const keys = new Set([
    ...groups.keys(),
    ...(comparable ? previous.keys() : []),
  ]);
  const rows = [...keys]
    .map((key) => {
      const group = groups.get(key),
        source = (group ?? previous.get(key))!.source;
      const observations = [...(group?.observations.values() ?? [])];
      const positions = observations
        .map((v) => v.position)
        .filter((p) => p !== null);
      const withBrand = observations.filter((v) =>
        reportBrand(v.observation, input.reportBrand),
      );
      const mentions = withBrand.filter(
        (v) => reportBrand(v.observation, input.reportBrand)?.mentioned,
      ).length;
      const now = comparable
          ? (matched.get(key)?.observations.size ?? 0)
          : null,
        before = comparable
          ? (previous.get(key)?.observations.size ?? 0)
          : null;
      const change =
        now === null || before === null || (!now && !before)
          ? ("unavailable" as const)
          : now && before
            ? ("retained" as const)
            : now
              ? ("new" as const)
              : ("lost" as const);
      return {
        key,
        domain: source.domain,
        url: input.groupBy === "url" ? source.url : null,
        title: input.groupBy === "url" ? source.title : null,
        channel: savedSourceChannel(source.domain),
        answers: observations.length,
        visibility: percentage(observations.length, answered.length),
        averagePosition: positions.length
          ? positions.reduce((a, n) => a + n, 0) / positions.length
          : null,
        firstCitations: positions.filter((p) => p === 1).length,
        topThreeCitations: positions.filter((p) => p <= 3).length,
        withBrandEligible: withBrand.length,
        withBrandMentions: mentions,
        withBrandMentionRate: percentage(mentions, withBrand.length),
        withoutBrandEligible: eligible.length - withBrand.length,
        withoutBrandMentionRate: percentage(
          totalMentions - mentions,
          eligible.length - withBrand.length,
        ),
        gapAnswers: observations.filter((v) =>
          isCompetitorGap(v.observation.row),
        ).length,
        brands: [
          ...new Set(
            observations.flatMap((v) =>
              v.observation.row.brands
                .filter((b) => b.mentioned || b.cited)
                .map((b) => b.domain),
            ),
          ),
        ],
        comparisonAnswers: now,
        previousAnswers: before,
        change,
      };
    })
    .filter(
      (r) =>
        (input.sourceChannel === "all" || input.sourceChannel === r.channel) &&
        (!input.reportSearch ||
          `${r.domain} ${r.url ?? ""} ${r.title ?? ""}`
            .toLowerCase()
            .includes(input.reportSearch.toLowerCase())),
    );
  return reportPage(
    sort(rows, (a, b) => b.answers - a.answers || a.key.localeCompare(b.key)),
    input.reportPage,
    input.limit,
  );
}
export function savedSourceCategories(current: ReportObservation[]) {
  const answered = current.filter((o) => o.row.answerStatus === "answered"),
    groups = new Map<string, Set<string>>();
  for (const o of answered)
    for (const s of o.sources) {
      const own = o.row.brands.find((b) => b.own);
      const label =
        own && ownedAiDomain(s.domain, own.domain)
          ? "Your site"
          : o.row.brands.some(
                (b) => !b.own && ownedAiDomain(s.domain, b.domain),
              )
            ? "Tracked competitors"
            : savedSourceChannel(s.domain) === "reddit"
              ? "Reddit"
              : savedSourceChannel(s.domain) === "youtube"
                ? "YouTube"
                : "Other websites";
      const ids = groups.get(label) ?? new Set<string>();
      ids.add(o.row.id);
      groups.set(label, ids);
    }
  return [...groups].map(([label, ids]) => ({
    label,
    answers: ids.size,
    visibility: percentage(ids.size, answered.length),
  }));
}
