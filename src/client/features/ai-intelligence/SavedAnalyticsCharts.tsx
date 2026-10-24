import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/client/components/ui/chart";
import { Button } from "@/client/components/ui/button";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import type { AnalyticsUpdate } from "./SavedAnswerAnalyticsFilters";

const colors = [
  "#367bf5",
  "#e2ad3f",
  "#35a58a",
  "#d97388",
  "#9166cc",
  "#3294a8",
];
type HistoryRow = SavedAnswerAnalytics["history"]["rows"][number];
type Metric = "shareOfVoice" | "visibility" | "mentions" | "citations";
const metrics: { key: Metric; label: string }[] = [
  { key: "shareOfVoice", label: "Share of voice" },
  { key: "visibility", label: "Brand visibility" },
  { key: "mentions", label: "Mentions" },
  { key: "citations", label: "Source visibility" },
];
function bucketDate(date: string, interval: string) {
  if (interval === "month") return date.slice(0, 7) + "-01";
  if (interval !== "week") return date;
  const day = new Date(date + "T00:00:00Z");
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}
function chartPoints(
  rows: HistoryRow[],
  interval: string,
  metric: Metric,
  brands: string[],
) {
  const buckets = new Map<string, HistoryRow[]>();
  for (const row of rows) {
    const date = bucketDate(row.date, interval),
      group = buckets.get(date) ?? [];
    group.push(row);
    buckets.set(date, group);
  }
  return [...buckets].map(([date, group]) => {
    const point: Record<string, string | number | null> = { date };
    const totalMentions = group.reduce(
      (n, row) => n + row.totals.totalMentions,
      0,
    );
    brands.forEach((domain, i) => {
      const matches = group.flatMap((r) =>
        r.brands.filter((b) => b.domain === domain),
      );
      const mentions = matches.reduce((n, b) => n + b.mentions, 0);
      const eligible = matches.reduce((n, b) => n + b.answers, 0);
      const citations = matches.reduce((n, b) => n + b.citations, 0);
      point[`brand${i}`] =
        metric === "mentions"
          ? eligible
            ? mentions
            : null
          : metric === "shareOfVoice"
            ? totalMentions && eligible
              ? (mentions / totalMentions) * 100
              : null
            : eligible
              ? ((metric === "citations" ? citations : mentions) / eligible) *
                100
              : null;
    });
    return point;
  });
}
export function SavedAnalyticsHistoryChart({
  data,
}: {
  data: SavedAnswerAnalytics;
}) {
  const [metric, setMetric] = useState<Metric>("visibility");
  const [interval, setInterval] = useState("day");
  const [hidden, setHidden] = useState<string[]>([]);
  const brands = [
    ...new Set(data.history.rows.flatMap((r) => r.brands.map((b) => b.domain))),
  ].slice(0, 6);
  const config = Object.fromEntries(
    brands.map((domain, i) => [
      `brand${i}`,
      { label: domain, color: colors[i] },
    ]),
  );
  const points = chartPoints(data.history.rows, interval, metric, brands);
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Historical performance</h2>
        <div className="flex gap-1" aria-label="Trend interval">
          {["day", "week", "month"].map((value) => (
            <Button
              size="sm"
              key={value}
              variant={interval === value ? "default" : "outline"}
              aria-pressed={interval === value}
              onClick={() => setInterval(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </Button>
          ))}
        </div>
      </div>
      <div className="my-3 flex flex-wrap gap-2" aria-label="Trend metric">
        {metrics.map((m) => (
          <Button
            size="sm"
            key={m.key}
            variant={metric === m.key ? "default" : "outline"}
            aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        All finished scheduled and baseline checks in the selected window; an
        explicit Saved check shows only that check. Filters for engine, topic
        and prompt type apply. Dates use UTC. Bucket rates use summed counts,
        and larger samples carry more weight. Changes in prompts, engines,
        markets or brand matching can change the rates.
      </p>
      {data.history.rows.length < 2 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {data.history.rows.length
            ? "Only one collection date is available. This is a saved data point, not an established trend."
            : "No saved observations for a trend in this selection. Broaden the filters or choose another reporting window."}
        </p>
      )}
      {data.history.truncated && (
        <p className="mt-2 text-sm text-muted-foreground">
          Showing the newest 200 checks. Narrow the reporting window to include
          the full history.
        </p>
      )}
      {brands.length > 0 && (
        <>
          <ChartContainer config={config} className="mt-4 h-64 w-full">
            <LineChart
              accessibilityLayer
              data={points}
              margin={{ left: 4, right: 12, top: 12, bottom: 4 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => String(value).slice(5)}
              />
              <YAxis
                domain={metric === "mentions" ? [0, "auto"] : [0, 100]}
                unit={metric === "mentions" ? undefined : "%"}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {brands.map((domain, i) => (
                <Line
                  key={domain}
                  hide={hidden.includes(domain)}
                  type="linear"
                  dataKey={`brand${i}`}
                  stroke={colors[i]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
          <div className="mt-2 flex flex-wrap gap-3" aria-label="Chart brands">
            {brands.map((domain, i) => (
              <label key={domain} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!hidden.includes(domain)}
                  onChange={() =>
                    setHidden((previous) =>
                      previous.includes(domain)
                        ? previous.filter((d) => d !== domain)
                        : [...previous, domain],
                    )
                  }
                />
                <span style={{ color: colors[i] }}>{domain}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
export function SavedCitationCharts({
  data,
  update,
}: {
  data: SavedAnswerAnalytics;
  update: AnalyticsUpdate;
}) {
  const eligible = data.totals.ownEligibleAnswers;
  const slices = [
    { label: "Your site cited", value: data.totals.citations, fill: colors[0] },
    {
      label: "Your site not cited",
      value: eligible - data.totals.citations,
      fill: "var(--muted)",
    },
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Citations to your site</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This chart counts answers citing your domain, not all sources. Other
          websites can be cited when your count is zero.
        </p>
        {eligible ? (
          <ChartContainer
            className="mx-auto my-3 h-48"
            config={{ value: { label: "Answers" } }}
          >
            <PieChart accessibilityLayer>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius={48}
                outerRadius={75}
              >
                {slices.map((s) => (
                  <Cell key={s.label} fill={s.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ChartContainer>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No answered observations with your brand's matching metadata.
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <span>Your site cited: {data.totals.citations}</span>
          <span>Your site not cited: {eligible - data.totals.citations}</span>
        </div>
        <Button
          className="mt-4"
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
          View all {data.citationSummary.domains} cited domains
        </Button>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Most cited sources</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          All websites, including your site and competitors. Counts are distinct
          citing answers; sources can overlap.
        </p>
        {data.topSources.length ? (
          <ChartContainer
            config={{
              answerCount: { label: "Citing answers", color: colors[0] },
            }}
            className="mt-4 h-64 w-full"
          >
            <BarChart
              accessibilityLayer
              data={data.topSources.slice(0, 6)}
              layout="vertical"
              margin={{ right: 14 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="domain"
                width={160}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="answerCount" fill={colors[0]} radius={4} />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No retained source links in the selected successful answers. Try
            another saved check or broaden the filters.
          </p>
        )}
      </section>
    </div>
  );
}
