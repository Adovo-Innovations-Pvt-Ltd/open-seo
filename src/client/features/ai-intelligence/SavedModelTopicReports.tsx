import { useState } from "react";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import { AI_ENGINE_LABELS } from "@/shared/ai-visibility";
import { Button } from "@/client/components/ui/button";
import {
  SavedTrackingReportTable,
  type TrackingColumn,
} from "./SavedTrackingReportTable";
import type { AnalyticsUpdate } from "./SavedAnswerAnalyticsFilters";
export function SavedModelTopicReports({
  data,
  update,
}: {
  data: SavedAnswerAnalytics;
  update: AnalyticsUpdate;
}) {
  const [page, setPage] = useState(1),
    [metric, setMetric] = useState<
      "answered" | "mentionRate" | "citationRate" | "shareOfVoice"
    >("answered");
  const cells = data.trackingReports.modelTopics,
    topics = [...new Set(cells.map((c) => c.topic))],
    engines = [...new Set(cells.map((c) => c.engine))];
  const columns: TrackingColumn<string>[] = [
    {
      label: "Prompt topic / tag",
      value: (topic) => topic,
      render: (topic) => (
        <button
          className="font-medium hover:underline"
          onClick={() => update({ topic })}
        >
          {topic}
        </button>
      ),
    },
    ...engines.map((engine) => ({
      label: AI_ENGINE_LABELS[engine],
      value: (topic: string) =>
        cells.find((c) => c.topic === topic && c.engine === engine)?.[metric],
    })),
  ];
  const pages = Math.max(1, Math.ceil(topics.length / 25)),
    selectedPage = Math.min(page, pages);
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Tag metrics by model</h2>
      <p className="text-xs text-muted-foreground">
        Uses saved prompt topics as reporting tags; it does not infer concepts
        from answer text. Missing model/topic cells are unavailable, rather than
        zero. Percentage metrics use answered, eligible brand observations in
        each cell.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { key: "answered", label: "Answered observations" },
          { key: "mentionRate", label: "Brand visibility (%)" },
          { key: "citationRate", label: "Your source visibility (%)" },
          { key: "shareOfVoice", label: "Share of voice (%)" },
        ].map((m) => (
          <Button
            size="sm"
            key={m.key}
            variant={metric === m.key ? "default" : "outline"}
            aria-pressed={metric === m.key}
            onClick={() =>
              setMetric(
                m.key === "mentionRate" ||
                  m.key === "citationRate" ||
                  m.key === "shareOfVoice"
                  ? m.key
                  : "answered",
              )
            }
          >
            {m.label}
          </Button>
        ))}
      </div>
      <SavedTrackingReportTable
        rows={topics.slice((selectedPage - 1) * 25, selectedPage * 25)}
        columns={columns}
        filename="ai-tag-model-matrix"
        page={{ page: selectedPage, pages, totalCount: topics.length }}
        onPage={setPage}
        context={`Snapshot topic/model matrix; ${metric}`}
      />
    </section>
  );
}
