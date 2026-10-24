import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/client/components/ui/chart";
import { Button } from "@/client/components/ui/button";
import { AI_ENGINE_LABELS } from "@/shared/ai-visibility";
import { aiEngineSchema } from "@/types/schemas/ai-visibility";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";

export function PerformanceChart({
  rows,
  models,
}: {
  rows: SavedAnswerAnalytics["engines"];
  models: boolean;
}) {
  const [metric, setMetric] = useState<
    "answered" | "mentionRate" | "citationRate"
  >("answered");
  const options = [
    { key: "answered", label: "Answered observations" },
    { key: "mentionRate", label: "Brand visibility" },
    { key: "citationRate", label: "Your source visibility" },
  ] as const;
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">
        {models ? "Model comparison" : "Performance by topic"}
      </h2>
      <div className="my-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            size="sm"
            key={option.key}
            variant={metric === option.key ? "default" : "outline"}
            aria-pressed={metric === option.key}
            onClick={() => setMetric(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Latest selected snapshots. Groups can have different coverage; answered
        counts describe collected data, not brand rankings.
      </p>
      {rows.length ? (
        <ChartContainer
          config={{
            [metric]: {
              label: options.find((o) => o.key === metric)?.label,
              color: "var(--chart-1)",
            },
          }}
          className="mt-4 h-64 w-full"
        >
          <BarChart
            accessibilityLayer
            data={rows.map((row) => ({
              ...row,
              label: models
                ? AI_ENGINE_LABELS[aiEngineSchema.parse(row.label)]
                : row.label,
            }))}
            margin={{ bottom: 30 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              angle={-12}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              domain={metric === "answered" ? [0, "auto"] : [0, 100]}
              allowDecimals={metric !== "answered"}
              unit={metric === "answered" ? undefined : "%"}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey={metric} fill={"var(--chart-1)"} radius={4} />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="py-10 text-sm text-muted-foreground">
          No saved observations match this selection. Broaden the filters to
          compare {models ? "models" : "topics"}.
        </p>
      )}
    </section>
  );
}
