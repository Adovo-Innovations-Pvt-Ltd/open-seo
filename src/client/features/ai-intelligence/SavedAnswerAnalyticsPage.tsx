import { IntelligenceReportNavigation } from "./IntelligenceReportNavigation";
import { SavedRankingReports } from "./SavedRankingReports";
import { SavedSourceReports } from "./SavedSourceReports";
import { SavedPeriodReports } from "./SavedPeriodReports";
import { SavedCompetitorReports } from "./SavedCompetitorReports";
import { SavedModelTopicReports } from "./SavedModelTopicReports";
import { SavedAnalyticsViews } from "./SavedAnalyticsViews";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BackLink, PageHeader } from "@/client/components/PageHeader";
import { Button } from "@/client/components/ui/button";
import { SkeletonPageContent } from "@/client/components/SkeletonPresets";
import { savedAnswerAnalyticsSchema } from "@/types/schemas/ai-saved-answer-analytics";
import { savedAnswerAnalyticsQuery } from "./savedAnswerAnalyticsQueries";
import { AiQueryError } from "../ai-visibility/shared";
import {
  AnalyticsSelect,
  SavedAnswerAnalyticsFilters,
  type AnalyticsUpdate,
} from "./SavedAnswerAnalyticsFilters";
import {
  AnalyticsMetricCards,
  BrandAnalyticsTable,
  SavedAnswerOverview,
  SavedPerformanceBreakdown,
} from "./SavedAnswerOverview";
import {
  SavedResponseSearch,
  SavedSourceVisibility,
} from "./SavedAnswerEvidenceTables";
import {
  AnalyticsSelectionSummary,
  SavedAnalyticsEmptyState,
} from "./SavedAnalyticsSelection";
import { SavedMarketComparison } from "./SavedMarketComparison";

export function SavedAnswerAnalyticsPage() {
  const { projectId } = useParams({
    from: "/_app/p/$projectId/intelligence",
  });
  const search = useSearch({
    from: "/_app/p/$projectId/intelligence",
  });
  const navigate = useNavigate({
    from: "/p/$projectId/intelligence",
  });
  const input = savedAnswerAnalyticsSchema.parse({
    projectId,
    allMarkets: search.scope === "all",
    trackerId: search.scope === "all" ? undefined : search.market,
    days: search.days,
    runId: search.scope === "all" ? undefined : search.run,
    engines: search.engine ? [search.engine] : undefined,
    topic: search.topic,
    branded: search.branded,
    responseSearch: search.q,
    signal: search.view === "gaps" ? "gap" : search.signal,
    brandDomain: search.brand,
    source: search.source,
    answerState: search.answerState,
    groupBy: search.groupBy,
    ownership: search.ownership,
    responsePage: search.responsePage,
    sourcePage: search.sourcePage,
    reportPage: search.reportPage,
    reportSearch: search.reportSearch,
    reportBrand: search.reportBrand,
    reportGap: search.reportGap,
    reportMatrix: search.reportMatrix,
    reportChange: search.reportChange,
    sourceChannel:
      search.view === "reddit"
        ? "reddit"
        : search.view === "youtube"
          ? "youtube"
          : search.sourceChannel,
  });
  const query = useQuery(savedAnswerAnalyticsQuery(input));
  const update: AnalyticsUpdate = (patch) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        ...patch,
        responsePage: patch.responsePage ?? 1,
        sourcePage: patch.sourcePage ?? 1,
        reportPage: patch.reportPage ?? 1,
      }),
    });
  };
  const data = query.data;
  if (query.isPending) return <SkeletonPageContent />;
  if (query.isError)
    return (
      <AiQueryError
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  if (!data) return null;
  const markets = data.availableMarkets;
  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Intelligence"
        description="Prompt tracking analytics across your markets, models and citation sources."
        backLink={
          <BackLink
            to="/p/$projectId/ai-visibility"
            params={{ projectId }}
            search={{ market: search.market }}
          >
            Prompt tracking
          </BackLink>
        }
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/p/$projectId/context" params={{ projectId }} />}
          >
            Project context
          </Button>
        }
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AnalyticsSelect
          label="Analytics market"
          value={
            search.scope === "all"
              ? "all"
              : (search.market ?? markets[0]?.id ?? "all")
          }
          items={[
            { value: "all", label: "All project markets" },
            ...markets.map((m) => ({ value: m.id, label: m.label })),
          ]}
          onChange={(value) =>
            update({
              scope: value === "all" ? "all" : "market",
              market: value === "all" ? undefined : value,
              run: undefined,
              source: undefined,
              brand: undefined,
              signal: undefined,
            })
          }
        />
        <p className="max-w-xl text-xs text-muted-foreground">
          {search.run
            ? "One explicitly selected saved check; reporting window does not filter it."
            : "Latest finished scheduled or baseline check per market in the reporting window. Manual checks are excluded by default."}{" "}
          Reading this page does not collect answers.
        </p>
      </div>
      <SavedAnswerAnalyticsFilters
        data={data}
        search={search}
        update={update}
      />
      <SavedAnalyticsViews
        key={projectId}
        projectId={projectId}
        search={search}
        update={update}
      />
      <AnalyticsSelectionSummary data={data} search={search} update={update} />
      {!data.coverage.expected && (
        <SavedAnalyticsEmptyState
          kind="selection"
          data={data}
          search={search}
          update={update}
        />
      )}
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        <button
          className="font-medium hover:underline"
          onClick={() =>
            update({
              view: "responses",
              answerState: "all",
              signal: undefined,
              brand: undefined,
              source: undefined,
              q: "",
            })
          }
        >
          Coverage: {data.coverage.completed} / {data.coverage.expected}{" "}
          answered
        </button>
        <span className="ml-3 text-xs text-muted-foreground">
          {data.coverage.failed} failed · {data.coverage.noAnswer} no answer ·{" "}
          {data.coverage.pending} pending
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          Overview pools the selected saved answers; markets and topics with
          more answered observations carry more weight. Use the common-prompt
          comparison for regional comparisons. Rates exclude failed, pending and
          no-answer observations. A search without an AI Overview is a no-answer
          result. Only brands stored with an answer enter that answer’s brand
          denominators.
        </p>
      </div>
      {data.warnings.length > 0 && (
        <details className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <summary className="cursor-pointer font-medium">
            Data coverage and comparability notes ({data.warnings.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      <AnalyticsMetricCards data={data} update={update} />
      <IntelligenceReportNavigation search={search} update={update} />
      <div key={`${search.view}:${search.scope}:${search.market ?? "default"}`}>
        {(search.view === "ai-rankings" || search.view === "rankings-gap") && (
          <SavedRankingReports
            key={search.reportSearch}
            projectId={projectId}
            data={data}
            search={search}
            update={update}
            gaps={search.view === "rankings-gap"}
          />
        )}
        {(search.view === "source-analysis" ||
          search.view === "reddit" ||
          search.view === "youtube") && (
          <SavedSourceReports
            key={search.reportSearch}
            data={data}
            search={search}
            update={update}
          />
        )}
        {search.view === "periods" && <SavedPeriodReports data={data} />}
        {(search.view === "competitors" ||
          search.view === "rankings-citations") && (
          <SavedCompetitorReports
            data={data}
            search={search}
            update={update}
            matrixOnly={search.view === "rankings-citations"}
          />
        )}
        {(search.view === "models" || search.view === "topics") && (
          <SavedModelTopicReports data={data} update={update} />
        )}
        {search.view === "overview" && (
          <SavedAnswerOverview data={data} update={update} />
        )}
        {search.view === "rankings" && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Brand leaderboard</h2>
            <BrandAnalyticsTable data={data} update={update} />
          </section>
        )}
        {search.view === "models" && (
          <SavedPerformanceBreakdown data={data} update={update} models />
        )}
        {search.view === "topics" && (
          <SavedPerformanceBreakdown data={data} update={update} />
        )}
        {search.view === "sources" && (
          <SavedSourceVisibility data={data} search={search} update={update} />
        )}
        {search.view === "gaps" && (
          <section className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card p-5">
              <h2 className="mb-2 font-semibold">
                Competitors present where your brand is absent
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                A gap requires an answered observation, a tracked competitor
                mentioned or cited, and your own brand neither mentioned nor
                cited. Gap denominators include only answers that tracked both
                brands.
              </p>
              <BrandAnalyticsTable data={data} update={update} gaps />
            </div>
            <SavedResponseSearch
              projectId={projectId}
              data={data}
              search={search}
              update={update}
            />
          </section>
        )}
        {search.view === "responses" && (
          <SavedResponseSearch
            projectId={projectId}
            data={data}
            search={search}
            update={update}
          />
        )}
        {search.view === "markets" && (
          <SavedMarketComparison data={data} update={update} />
        )}
      </div>
    </div>
  );
}
