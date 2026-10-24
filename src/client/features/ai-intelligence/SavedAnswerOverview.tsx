import { PerformanceChart } from "./SavedPerformanceChart";
import {
  SavedAnalyticsHistoryChart,
  SavedCitationCharts,
} from "./SavedAnalyticsCharts";
import { aiEngineSchema } from "@/types/schemas/ai-visibility";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/client/components/ui/chart";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import { AI_ENGINE_LABELS } from "@/shared/ai-visibility";
import type { AnalyticsUpdate } from "./SavedAnswerAnalyticsFilters";

export function analyticsPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}
export function AnalyticsMetricCards({
  data,
  update,
}: {
  data: SavedAnswerAnalytics;
  update: AnalyticsUpdate;
}) {
  const own = data.brands.find((b) => b.own);
  const cards = [
    {
      label: "Share of voice",
      value: analyticsPercent(data.totals.shareOfVoice),
      detail: `${data.totals.mentions} of ${data.totals.totalMentions} tracked-brand mentions`,
      signal: "mentioned" as const,
    },
    {
      label: "Brand visibility",
      value: analyticsPercent(data.totals.mentionRate),
      detail: `${data.totals.mentions} of ${data.totals.ownEligibleAnswers} eligible answers name your brand`,
      signal: "mentioned" as const,
    },
    {
      label: "Mentions",
      value: String(data.totals.mentions),
      detail: `${data.totals.ownEligibleAnswers - data.totals.mentions} eligible answers do not name your brand`,
      signal: "mentioned" as const,
    },
    {
      label: "Your source visibility",
      value: analyticsPercent(data.totals.citationRate),
      detail:
        "Percentage of eligible answers citing your domain; other websites are counted separately",
      signal: "cited" as const,
    },
    {
      label: "Citations to your site",
      value: String(data.totals.citations),
      detail: `${data.totals.ownEligibleAnswers - data.totals.citations} eligible answers do not cite your domain`,
      signal: "cited" as const,
    },
    {
      label: "All cited domains",
      value: String(data.citationSummary.domains),
      detail: `${data.citationSummary.citations} retained answer–URL citations across ${data.citationSummary.answersWithSources} answers; includes other websites`,
      signal: "sources" as const,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card) => (
        <button
          key={card.label}
          onClick={() =>
            update({
              view: card.signal === "sources" ? "sources" : "responses",
              ownership: "all",
              signal: card.signal === "sources" ? undefined : card.signal,
              brand: card.signal === "sources" ? undefined : own?.domain,
              source: undefined,
              q: "",
              answerState: "all",
            })
          }
          className="rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/40"
        >
          <span className="text-xs font-medium text-muted-foreground">
            {card.label}
          </span>
          <strong className="my-2 block text-3xl font-semibold tabular-nums">
            {card.value}
          </strong>
          <span className="text-xs text-muted-foreground">{card.detail}</span>
        </button>
      ))}
    </div>
  );
}
export function SavedAnswerOverview({
  data,
  update,
}: {
  data: SavedAnswerAnalytics;
  update: AnalyticsUpdate;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your site's citation rate counts links to your domain only. See all
          citation sources, including other websites, in Source visibility.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            update({
              view: "sources",
              ownership: "all",
              source: undefined,
              signal: undefined,
              brand: undefined,
              q: "",
            })
          }
        >
          View all citation sources
        </Button>
      </div>
      <SavedAnalyticsHistoryChart data={data} />
      <SavedCitationCharts data={data} update={update} />
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Brand leaderboard and share of voice</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Each brand counts once per answer. Denominator:{" "}
          {data.totals.totalMentions} stored brand mentions. This sample does
          not measure population market share.
        </p>
        {data.totals.totalMentions > 0 ? (
          <ChartContainer
            config={{ shareOfVoice: { label: "Share of voice" } }}
            className="mt-5 h-64"
          >
            <BarChart
              accessibilityLayer
              data={data.brands}
              layout="vertical"
              margin={{ left: 12, right: 16 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis
                type="category"
                dataKey="domain"
                width={155}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="shareOfVoice"
                fill="var(--color-shareOfVoice)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No tracked brand mentions in answered observations. Share of voice
            is unavailable.
          </p>
        )}
        <BrandAnalyticsTable data={data} update={update} />
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <SavedPerformanceBreakdown data={data} update={update} models />
        <SavedPerformanceBreakdown data={data} update={update} />
      </div>
    </div>
  );
}
export function SavedPerformanceBreakdown({
  data,
  update,
  models = false,
}: {
  data: SavedAnswerAnalytics;
  update: AnalyticsUpdate;
  models?: boolean;
}) {
  const rows = models ? data.engines : data.topicBreakdown;
  return (
    <div className="space-y-4">
      <PerformanceChart rows={rows} models={models} />
      <Breakdown
        title={models ? "Performance by model" : "Topic metrics"}
        rows={rows}
        onSelect={(label) =>
          models
            ? update({ engine: aiEngineSchema.parse(label) })
            : update({ topic: label })
        }
        engineLabels={models}
      />
    </div>
  );
}
export function BrandAnalyticsTable({
  data,
  update,
  gaps = false,
}: {
  data: SavedAnswerAnalytics;
  update: AnalyticsUpdate;
  gaps?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tracked brand</TableHead>
          <TableHead>Mentions / eligible answers</TableHead>
          <TableHead>Share of voice</TableHead>
          <TableHead>Citations</TableHead>
          {gaps && <TableHead>Gap answers</TableHead>}
          <TableHead>Evidence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.brands
          .filter((b) => !gaps || !b.own)
          .map((brand) => (
            <TableRow key={`${brand.domain}:${brand.own}`}>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  {brand.domain}
                  {brand.own && <Badge variant="secondary">You</Badge>}
                </div>
                <div className="max-w-64 whitespace-normal text-xs text-muted-foreground">
                  Stored names: {brand.matchedNames.join(", ")}
                </div>
              </TableCell>
              <TableCell>
                {brand.mentions} / {brand.answers}
              </TableCell>
              <TableCell>{analyticsPercent(brand.shareOfVoice)}</TableCell>
              <TableCell>
                {brand.citations} / {brand.answers}
              </TableCell>
              {gaps && (
                <TableCell>
                  {brand.gapCount} / {brand.gapEligibleAnswers}
                </TableCell>
              )}
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    update({
                      view: "responses",
                      brand: brand.domain,
                      signal: gaps ? "gap" : "mentioned",
                      source: undefined,
                      q: "",
                      answerState: "all",
                    })
                  }
                >
                  View answers
                </Button>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
function Breakdown({
  title,
  rows,
  onSelect,
  engineLabels = false,
}: {
  title: string;
  rows: SavedAnswerAnalytics["engines"];
  onSelect: (label: string) => void;
  engineLabels?: boolean;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{engineLabels ? "Engine" : "Topic"}</TableHead>
            <TableHead>Answered / planned</TableHead>
            <TableHead>Brand visibility</TableHead>
            <TableHead>Share of voice</TableHead>
            <TableHead>Mentions</TableHead>
            <TableHead>Your source visibility</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell>
                <button
                  className="text-left font-medium hover:underline"
                  onClick={() => onSelect(row.label)}
                >
                  {engineLabels
                    ? AI_ENGINE_LABELS[aiEngineSchema.parse(row.label)]
                    : row.label}
                </button>
              </TableCell>
              <TableCell>
                {row.answered} / {row.expected}
              </TableCell>
              <TableCell>{analyticsPercent(row.mentionRate)}</TableCell>
              <TableCell>{analyticsPercent(row.shareOfVoice)}</TableCell>
              <TableCell>{row.mentions}</TableCell>
              <TableCell>{analyticsPercent(row.citationRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
