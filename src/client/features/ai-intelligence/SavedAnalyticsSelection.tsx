import { Button } from "@/client/components/ui/button";
import { EmptyState } from "@/client/components/EmptyState";
import { AI_ENGINE_LABELS } from "@/shared/ai-visibility";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import type {
  AnalyticsSearch,
  AnalyticsUpdate,
} from "./SavedAnswerAnalyticsFilters";

export const SOURCE_OWNERSHIP_LABELS = {
  all: "All citation sources",
  own: "Your site only",
  competitor: "Tracked competitors only",
  other: "Other websites only",
  mixed: "Mixed ownership",
};
const resetFilters: Partial<AnalyticsSearch> = {
  scope: "all",
  market: undefined,
  run: undefined,
  engine: undefined,
  days: 28,
  topic: undefined,
  branded: "neutral",
  ownership: "all",
  groupBy: "domain",
  q: "",
  signal: undefined,
  brand: undefined,
  source: undefined,
  answerState: "all",
  reportPage: 1,
  reportSearch: "",
  reportBrand: undefined,
  reportGap: "all",
  reportMatrix: "all",
  reportChange: "all",
  sourceChannel: "all",
};
export function AnalyticsSelectionSummary({
  data,
  search,
  update,
}: {
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <p>
        {search.scope === "all"
          ? `All ${data.markets.length} project markets`
          : (data.markets[0]?.label ?? "Selected market")}
        {" · "}
        {search.engine ? AI_ENGINE_LABELS[search.engine] : "All engines"}
        {" · "}
        {search.branded === "all"
          ? "All prompts"
          : search.branded === "branded"
            ? "Branded prompts"
            : "Non-branded prompts"}
        {search.topic && ` · Topic: ${search.topic}`}
        {search.view === "sources" &&
          ` · ${SOURCE_OWNERSHIP_LABELS[search.ownership]}`}
      </p>
      <Button variant="outline" size="sm" onClick={() => update(resetFilters)}>
        Reset analytics filters
      </Button>
    </div>
  );
}
export function SavedAnalyticsEmptyState({
  kind,
  data,
  search,
  update,
}: {
  kind: "selection" | "sources" | "responses";
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  const hasSnapshot = data.markets.some((m) => m.runId);
  let title = "No saved responses match these evidence filters";
  let description =
    "Clear the search, answer status, brand or source filter to see the saved responses in this selection.";
  let label = "Clear evidence filters";
  let patch: Partial<AnalyticsSearch> = {
    q: "",
    signal: undefined,
    brand: undefined,
    source: undefined,
    answerState: "all",
    view: "responses",
  };
  if (!hasSnapshot) {
    title = "No saved check in this reporting window";
    description =
      "Choose a different reporting window or market. For one market, Saved check also lets you select an older or manual check. Opening analytics does not start collection.";
    label = "Show all markets and widen window";
    patch = { ...resetFilters, days: 90 };
  } else if (!data.coverage.expected) {
    title = "No saved observations match these filters";
    description = search.engine
      ? `The selected saved checks may not include ${AI_ENGINE_LABELS[search.engine]} with this prompt type and topic. Try All engines, another saved check or All project markets.`
      : "The selected checks contain no observations for this prompt type and topic. Broaden the filters or choose another saved check.";
    label = "Show all engines and prompt types";
    patch = {
      engine: undefined,
      topic: undefined,
      branded: "all",
      ownership: "all",
      q: "",
      signal: undefined,
      brand: undefined,
      source: undefined,
      answerState: "all",
    };
  } else if (kind === "sources" && !data.totals.answered) {
    title = "No successful answers available for citations";
    description = `This selection has ${data.coverage.failed} failed, ${data.coverage.noAnswer} no-answer and ${data.coverage.pending} pending observations. Citation rates need a successful saved answer. Choose another saved check or broaden the selection.`;
    label = "Reset analytics filters";
    patch = resetFilters;
  } else if (kind === "sources") {
    title =
      search.ownership === "own"
        ? "Your site was not cited in these saved answers"
        : search.ownership === "competitor"
          ? "No tracked competitor sources in this selection"
          : "No citation sources in this selection";
    description =
      search.ownership !== "all"
        ? "This ownership filter hides other citation sources. Show all citation sources to include your site, tracked competitors and other websites."
        : "These saved answers have no retained source links. Try a different engine, saved check or market. A zero citation rate for your own site does not mean all answers lack sources.";
    label =
      search.ownership !== "all"
        ? "Show all citation sources"
        : "Reset analytics filters";
    patch =
      search.ownership !== "all"
        ? { ownership: "all", source: undefined }
        : resetFilters;
  } else if (search.signal === "cited" && !search.source) {
    title = "No citations to the selected brand";
    description =
      "The citation filter counts links to that brand's site. Other websites can still be cited. Open all citation sources to see those links.";
    label = "View all citation sources";
    patch = {
      view: "sources",
      ownership: "all",
      signal: undefined,
      brand: undefined,
      source: undefined,
      q: "",
      answerState: "all",
    };
  }
  return (
    <EmptyState
      kind="filtered"
      variant="plain"
      size="sm"
      title={title}
      description={description}
      action={
        <Button variant="outline" size="sm" onClick={() => update(patch)}>
          {label}
        </Button>
      }
    />
  );
}
