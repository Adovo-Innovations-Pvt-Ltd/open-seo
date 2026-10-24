import { Button } from "@/client/components/ui/button";
import {
  AnalyticsSelect,
  type AnalyticsSearch,
  type AnalyticsUpdate,
} from "./SavedAnswerAnalyticsFilters";
const views = [
  { value: "overview", label: "Overview" },
  { value: "rankings", label: "Brand rankings" },
  { value: "sources", label: "Source visibility" },
  { value: "models", label: "Model comparison" },
  { value: "topics", label: "Topic analysis" },
  { value: "gaps", label: "Competitor gaps" },
  { value: "responses", label: "Response search" },
  { value: "markets", label: "Market comparison" },
] as const;

const moreViews = [
  { value: "periods", label: "Preceding-period comparison" },
  { value: "ai-rankings", label: "AI rankings" },
  { value: "rankings-gap", label: "Rankings gap" },
  { value: "source-analysis", label: "Source analysis and URL impact" },
  { value: "reddit", label: "Reddit citation overview" },
  { value: "youtube", label: "YouTube citation overview" },
  { value: "rankings-citations", label: "Rankings and citations" },
  { value: "competitors", label: "Competitor performance" },
] as const;

export function IntelligenceReportNavigation({
  search,
  update,
}: {
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  return (
    <nav aria-label="Analytics views" className="flex flex-wrap gap-2">
      {views.map((view) => (
        <Button
          key={view.value}
          variant={search.view === view.value ? "default" : "outline"}
          aria-pressed={search.view === view.value}
          size="sm"
          onClick={() =>
            update({
              view: view.value,
              ownership: "all",
              scope: view.value === "markets" ? "all" : search.scope,
              run: view.value === "markets" ? undefined : search.run,
              signal: view.value === "gaps" ? "gap" : undefined,
              brand: undefined,
              source: undefined,
              q: "",
              answerState: "all",
            })
          }
        >
          {view.label}
        </Button>
      ))}
      <AnalyticsSelect
        label="More tracking reports"
        value={
          moreViews.some((v) => v.value === search.view)
            ? search.view
            : "choose"
        }
        items={[
          { value: "choose", label: "Choose a detailed report" },
          ...moreViews,
        ]}
        onChange={(value) => {
          const view = moreViews.find((v) => v.value === value);
          if (view)
            update({
              view: view.value,
              reportPage: 1,
              reportSearch: "",
              reportGap: view.value === "rankings-gap" ? "missing" : "all",
              reportChange: "all",
              reportMatrix: "all",
              reportBrand: undefined,
              groupBy:
                view.value === "reddit" || view.value === "youtube"
                  ? "url"
                  : "domain",
              sourceChannel: "all",
              ownership: "all",
            });
        }}
      />
    </nav>
  );
}
