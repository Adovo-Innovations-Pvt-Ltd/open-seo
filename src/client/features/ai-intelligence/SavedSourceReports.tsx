import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/client/components/ui/chart";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import { Input } from "@/client/components/ui/input";
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
type Source = AiTrackingReports["sources"]["rows"][number];
export function SavedSourceReports({
  data,
  search,
  update,
}: {
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  const [text, setText] = useState(search.reportSearch);
  const report = data.trackingReports,
    social = search.view === "reddit" || search.view === "youtube";
  const columns: TrackingColumn<Source>[] = [
    {
      label: "Source",
      value: (r) => r.url ?? r.domain,
      render: (r) =>
        r.url ? (
          <SafeExternalLink
            url={r.url}
            label={r.title ?? r.url}
            className="font-medium hover:underline"
          />
        ) : (
          r.domain
        ),
    },
    { label: "Channel", value: (r) => r.channel },
    { label: "Citing answers", value: (r) => r.answers },
    { label: "Source visibility (%)", value: (r) => r.visibility },
    { label: "Average citation position", value: (r) => r.averagePosition },
    { label: "First-position answers", value: (r) => r.firstCitations },
    { label: "Top-three-position answers", value: (r) => r.topThreeCitations },
    {
      label: "Selected-brand eligible answers with source",
      value: (r) => r.withBrandEligible,
    },
    {
      label: "Brand mentioned with source (%)",
      value: (r) => r.withBrandMentionRate,
    },
    {
      label: "Eligible answers without source",
      value: (r) => r.withoutBrandEligible,
    },
    {
      label: "Brand mentioned without source (%)",
      value: (r) => r.withoutBrandMentionRate,
    },
    { label: "Own-brand gap answers", value: (r) => r.gapAnswers },
    { label: "Accompanying tracked brands", value: (r) => r.brands.join(", ") },
    {
      label: "Matched current citing answers",
      value: (r) => r.comparisonAnswers,
    },
    {
      label: "Matched previous citing answers",
      value: (r) => r.previousAnswers,
    },
    { label: "Matched-cohort source change", value: (r) => r.change },
    {
      label: "Evidence",
      value: (r) => r.key,
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          disabled={!r.answers}
          onClick={() =>
            update({
              view: "responses",
              source: r.key,
              ownership: "all",
              signal: undefined,
              brand: undefined,
              q: "",
            })
          }
        >
          View citing answers
        </Button>
      ),
    },
  ];
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">
          {search.view === "reddit"
            ? "Reddit citation overview"
            : search.view === "youtube"
              ? "YouTube citation overview"
              : "Source analysis and URL impact"}
        </h2>
        <p className="text-xs text-muted-foreground">
          Citation position uses stored source order and the first occurrence
          per answer. Brand rates with and without a source show association,
          not causal impact. Only answered observations with the selected
          brand's matching metadata enter those rates. New/lost sources require
          a comparable preceding-period cohort; otherwise changes are
          unavailable.
        </p>
        {social && (
          <p className="text-sm text-muted-foreground">
            {search.view === "reddit"
              ? "Reddit posts and pages"
              : "YouTube videos and pages"}{" "}
            cited in your saved answers. Titles and URLs are retained citation
            evidence. Views, votes, comments, subscribers and creator
            demographics are not collected.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <AnalyticsSelect
            label="Source detail grouping"
            value={search.groupBy}
            items={[
              { value: "domain", label: "Domain" },
              { value: "url", label: "Page / post / video URL" },
            ]}
            onChange={(v) =>
              update({ groupBy: v === "url" ? "url" : "domain" })
            }
          />
          {!social && (
            <AnalyticsSelect
              label="Citation channel"
              value={search.sourceChannel}
              items={[
                { value: "all", label: "All channels" },
                { value: "reddit", label: "Reddit" },
                { value: "youtube", label: "YouTube" },
                { value: "web", label: "Other web sources" },
              ]}
              onChange={(v) =>
                update({
                  sourceChannel:
                    v === "reddit" || v === "youtube" || v === "web"
                      ? v
                      : "all",
                })
              }
            />
          )}
          <AnalyticsSelect
            label="Source-impact brand"
            value={search.reportBrand ?? "own"}
            items={[
              { value: "own", label: "Your brand" },
              ...report.brands.map((b) => ({
                value: b.domain,
                label: b.domain,
              })),
            ]}
            onChange={(v) =>
              update({ reportBrand: v === "own" ? undefined : v })
            }
          />
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ reportSearch: text });
          }}
        >
          <Input
            aria-label="Search citation sources"
            value={text}
            maxLength={200}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search source domain, URL or saved title…"
          />
          <Button type="submit">Search sources</Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setText("");
              update({
                reportSearch: "",
                sourceChannel: "all",
                reportBrand: undefined,
              });
            }}
          >
            Clear source report filters
          </Button>
        </form>
        <SavedTrackingReportTable
          rows={report.sources.rows}
          columns={columns}
          filename={`ai-${social ? search.view : "source-impact"}`}
          page={report.sources}
          onPage={(reportPage) => update({ reportPage })}
          empty={
            social
              ? `No ${search.view === "reddit" ? "Reddit" : "YouTube"} citations in the selected saved answers. Try another market, engine or saved check. No social metadata has been fetched.`
              : "No retained sources match these report filters. Broaden the source search or choose another saved check."
          }
          context={`${search.days} days; ${search.scope}; grouping ${search.groupBy}; brand ${search.reportBrand ?? "own"}; period ${report.period.status}`}
        />
      </section>
      {!social && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Sources by category</h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Distinct citing answers per category in the full snapshot selection.
            Categories can overlap in one answer; this chart is independent of
            source-table search and channel filters.
          </p>
          {report.sourceCategories.length ? (
            <ChartContainer
              config={{
                answers: { label: "Citing answers", color: "var(--chart-1)" },
              }}
              className="mt-4 h-64 w-full"
            >
              <BarChart
                accessibilityLayer
                data={report.sourceCategories}
                layout="vertical"
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={145} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="answers" fill="var(--color-answers)" />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No retained citation sources for a category breakdown.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
