import { sort } from "remeda";
import type { AiAnswer, AiObservationRow } from "@/shared/ai-visibility";
import type {
  SavedAnswerAnalytics,
  SavedAnswerAnalyticsInput,
} from "@/types/schemas/ai-saved-answer-analytics";
import { ownedAiDomain } from "./aiVisibilityMatching";
import { isCompetitorGap, percentage } from "./savedAnswerMetrics";

type Ownership = "own" | "competitor" | "other";
export function savedSourceOwnership(
  row: AiObservationRow,
  domain: string,
): Ownership {
  const own = row.brands.find((brand) => brand.own);
  if (own && ownedAiDomain(domain, own.domain)) return "own";
  return row.brands.some(
    (brand) => !brand.own && ownedAiDomain(domain, brand.domain),
  )
    ? "competitor"
    : "other";
}
export interface SavedSourceGroup {
  key: string;
  url: string | null;
  domain: string;
  title: string | null;
  ownership: Set<Ownership>;
  answers: Set<string>;
  prompts: Set<string>;
  gaps: Set<string>;
}
export function collectSavedSources(
  groups: Map<string, SavedSourceGroup>,
  answers: AiAnswer[],
  input: SavedAnswerAnalyticsInput,
) {
  for (const { observation: row, sources } of answers) {
    if (row.answerStatus !== "answered") continue;
    const gap = isCompetitorGap(row);
    for (const source of sources) {
      const ownership = savedSourceOwnership(row, source.domain);
      if (input.ownership !== "all" && input.ownership !== ownership) continue;
      const key = input.groupBy === "domain" ? source.domain : source.url;
      const group = groups.get(key) ?? {
        key,
        url: input.groupBy === "url" ? source.url : null,
        domain: source.domain,
        title: input.groupBy === "url" ? source.title : null,
        ownership: new Set<Ownership>(),
        answers: new Set<string>(),
        prompts: new Set<string>(),
        gaps: new Set<string>(),
      };
      group.answers.add(row.id);
      group.prompts.add(row.promptId);
      group.ownership.add(ownership);
      if (gap) group.gaps.add(row.id);
      groups.set(key, group);
    }
  }
}
export function savedSourceRows(
  groups: Map<string, SavedSourceGroup>,
  answered: number,
): SavedAnswerAnalytics["sources"]["rows"] {
  return sort(
    [...groups.values()].map((g) => ({
      key: g.key,
      url: g.url,
      domain: g.domain,
      title: g.title,
      ownership:
        g.ownership.size > 1 ? ("mixed" as const) : [...g.ownership][0],
      answerCount: g.answers.size,
      promptCount: g.prompts.size,
      visibility: percentage(g.answers.size, answered),
      gapCount: g.gaps.size,
    })),
    (a, b) => b.answerCount - a.answerCount || a.key.localeCompare(b.key),
  );
}
