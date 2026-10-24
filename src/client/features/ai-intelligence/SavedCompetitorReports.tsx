import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/client/components/ui/chart";
import { Button } from "@/client/components/ui/button";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import type { AiTrackingReports } from "@/types/schemas/ai-tracking-reports";
import {
  AnalyticsSelect,
  type AnalyticsSearch,
  type AnalyticsUpdate,
} from "./SavedAnswerAnalyticsFilters";
import {
  SavedTrackingReportTable,
  type TrackingColumn,
} from "./SavedTrackingReportTable";
export function SavedCompetitorReports({
  data,
  search,
  update,
  matrixOnly = false,
}: {
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
  matrixOnly?: boolean;
}) {
  const report = data.trackingReports,
    matrix = report.matrix;
  const quadrants = [
    { key: "both", label: "Mentioned and cited", count: matrix.both },
    {
      key: "mentionedOnly",
      label: "Mentioned only",
      count: matrix.mentionedOnly,
    },
    { key: "citedOnly", label: "Cited only", count: matrix.citedOnly },
    { key: "neither", label: "Neither", count: matrix.neither },
  ] as const;
  const columns: TrackingColumn<AiTrackingReports["brands"][number]>[] = [
    { label: "Brand", value: (b) => b.domain },
    { label: "Eligible answers", value: (b) => b.answers },
    { label: "Mentions", value: (b) => b.mentions },
    { label: "Brand visibility (%)", value: (b) => b.mentionRate },
    { label: "Share of voice (%)", value: (b) => b.shareOfVoice },
    { label: "Citations", value: (b) => b.citations },
    { label: "Source visibility (%)", value: (b) => b.citationRate },
    {
      label: "Avg tracked-brand mention order",
      value: (b) => b.averageMentionOrder,
    },
    {
      label: "Mention position sample",
      value: (b) => b.mentionPositionAnswers,
    },
    {
      label: "Avg first citation position",
      value: (b) => b.averageCitationPosition,
    },
    {
      label: "Citation position sample",
      value: (b) => b.citationPositionAnswers,
    },
    { label: "Top-three citation answers", value: (b) => b.topThreeCitations },
    { label: "Accompanying source domains", value: (b) => b.sources },
    {
      label: "Source domains shared with own brand",
      value: (b) => b.sharedOwnSources,
    },
    {
      label: "Source-overlap eligible answers",
      value: (b) => b.sourceOverlapEligibleAnswers,
    },
    { label: "Source overlap Jaccard (%)", value: (b) => b.sourceOverlap },
    { label: "Mentioned and cited", value: (b) => b.matrix.both },
    { label: "Mentioned only", value: (b) => b.matrix.mentionedOnly },
    { label: "Cited only", value: (b) => b.matrix.citedOnly },
    { label: "Neither", value: (b) => b.matrix.neither },
    {
      label: "Evidence",
      value: (b) => b.domain,
      render: (b) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            update({
              view: "ai-rankings",
              reportBrand: b.domain,
              reportGap: "all",
              reportMatrix: "all",
              reportChange: "all",
              reportSearch: "",
            })
          }
        >
          Inspect rankings
        </Button>
      ),
    },
  ];
  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Rankings and citations</h2>
        <p className="text-xs text-muted-foreground">
          Mention and citation are separate signals. This matrix uses{" "}
          {matrix.eligible} answered observations that stored matching metadata
          for {matrix.brandDomain ?? "the selected brand"}. Failed, no-answer
          and unknown-brand observations do not count as “neither”.
        </p>
        <AnalyticsSelect
          label="Matrix brand"
          value={search.reportBrand ?? "own"}
          items={[
            { value: "own", label: "Your brand" },
            ...report.brands.map((b) => ({ value: b.domain, label: b.domain })),
          ]}
          onChange={(v) => update({ reportBrand: v === "own" ? undefined : v })}
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quadrants.map((q) => (
            <button
              className="rounded-lg border border-border p-4 text-left hover:bg-muted/40"
              key={q.key}
              onClick={() =>
                update({
                  view: "ai-rankings",
                  reportMatrix: q.key,
                  reportGap: "all",
                  reportChange: "all",
                  reportSearch: "",
                })
              }
            >
              <span className="text-xs text-muted-foreground">{q.label}</span>
              <strong className="mt-2 block text-2xl">{q.count}</strong>
            </button>
          ))}
        </div>
      </section>
      {!matrixOnly && (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">
            Competitor performance and source overlap
          </h2>
          <p className="text-xs text-muted-foreground">
            Rankings cover your historical tracked brands. Mention order is
            among those brands only, not an extracted recommendation rank.
            Position averages use only observations with retained positions.
            Source overlap compares domains cited in answers where each brand
            appears with those accompanying your brand; Jaccard = shared domains
            / union of domains. Only answers that stored both brands enter the
            overlap; it is unavailable without those eligible answers or when
            the union is empty.
          </p>
          <ChartContainer
            config={{
              mentions: { label: "Mentions", color: "var(--chart-1)" },
              citations: { label: "Citations", color: "var(--chart-2)" },
            }}
            className="h-64 w-full"
          >
            <BarChart accessibilityLayer data={report.brands}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="domain" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="mentions" fill="var(--color-mentions)" />
              <Bar dataKey="citations" fill="var(--color-citations)" />
            </BarChart>
          </ChartContainer>
          <SavedTrackingReportTable
            rows={report.brands}
            columns={columns}
            filename="ai-competitor-performance"
            context={`${search.days} days; ${search.scope}; stored matching snapshots`}
          />
        </section>
      )}
    </div>
  );
}
