import { useState } from "react";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { AnswerContent } from "../ai-visibility/AnswerContent";
import { AI_ENGINE_LABELS } from "@/shared/ai-visibility";
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
type Ranking = AiTrackingReports["rankings"]["rows"][number];
export function SavedRankingReports({
  projectId,
  data,
  search,
  update,
  gaps = false,
}: {
  projectId: string;
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
  gaps?: boolean;
}) {
  const [text, setText] = useState(search.reportSearch),
    [selected, setSelected] = useState<Ranking | null>(null);
  const report = data.trackingReports;
  const selectedBrand = (r: Ranking) =>
    r.brands.find((b) =>
      search.reportBrand ? b.domain === search.reportBrand : b.own,
    );
  const columns: TrackingColumn<Ranking>[] = [
    { label: "Prompt", value: (r) => r.prompt },
    { label: "Topic", value: (r) => r.topic },
    { label: "Market", value: (r) => r.market },
    { label: "Model", value: (r) => AI_ENGINE_LABELS[r.engine] },
    { label: "Answer status", value: (r) => r.status },
    {
      label: "Selected brand mentioned",
      value: (r) => selectedBrand(r)?.mentioned,
    },
    { label: "Selected brand cited", value: (r) => selectedBrand(r)?.cited },
    {
      label: "Tracked-brand mention order",
      value: (r) => selectedBrand(r)?.mentionOrder,
    },
    {
      label: "First citation position",
      value: (r) => selectedBrand(r)?.citationPosition,
    },
    { label: "Gap category", value: (r) => r.gap },
    { label: "Presence change", value: (r) => r.change },
    {
      label: "Other tracked brands present",
      value: (r) =>
        r.brands
          .filter(
            (b) =>
              b.domain !== selectedBrand(r)?.domain && (b.mentioned || b.cited),
          )
          .map((b) => b.domain)
          .join(", "),
    },
    {
      label: "Saved answer",
      value: (r) => r.observationId,
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
          Inspect answer
        </Button>
      ),
    },
  ];
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">{gaps ? "Rankings gap" : "AI rankings"}</h2>
      <p className="text-xs text-muted-foreground">
        One row per exact prompt, market and model in the selected snapshots.
        Mention order is among stored tracked brands, not a recommendation-list
        rank. Citation position is the first matching link in the engine's
        stored source order. Missing metadata, failed answers and unavailable
        positions show “—”. Presence changes require a matching prior-period
        cell and stable brand definitions.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <AnalyticsSelect
          label="Report brand"
          value={search.reportBrand ?? "own"}
          items={[
            { value: "own", label: "Your brand" },
            ...report.brands.map((b) => ({ value: b.domain, label: b.domain })),
          ]}
          onChange={(v) => update({ reportBrand: v === "own" ? undefined : v })}
        />
        <AnalyticsSelect
          label="Rankings gap category"
          value={search.reportGap}
          items={[
            { value: "all", label: "All categories" },
            { value: "missing", label: "Missing: competitors present" },
            { value: "shared", label: "Shared with competitors" },
            { value: "unique", label: "Selected brand only" },
            { value: "neither", label: "Neither present" },
          ]}
          onChange={(v) =>
            update({
              reportGap:
                v === "missing" ||
                v === "shared" ||
                v === "unique" ||
                v === "neither"
                  ? v
                  : "all",
            })
          }
        />
        <AnalyticsSelect
          label="Presence change"
          value={search.reportChange}
          items={["all", "gained", "lost", "retained", "absent"].map(
            (value) => ({
              value,
              label: value === "all" ? "All changes" : value,
            }),
          )}
          onChange={(v) =>
            update({
              reportChange:
                v === "gained" ||
                v === "lost" ||
                v === "retained" ||
                v === "absent"
                  ? v
                  : "all",
            })
          }
        />
        <AnalyticsSelect
          label="Mention / citation filter"
          value={search.reportMatrix}
          items={[
            { value: "all", label: "All signals" },
            { value: "both", label: "Mentioned and cited" },
            { value: "mentionedOnly", label: "Mentioned only" },
            { value: "citedOnly", label: "Cited only" },
            { value: "neither", label: "Neither" },
          ]}
          onChange={(v) =>
            update({
              reportMatrix:
                v === "both" ||
                v === "mentionedOnly" ||
                v === "citedOnly" ||
                v === "neither"
                  ? v
                  : "all",
            })
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
          aria-label="Search ranking prompts"
          maxLength={200}
          placeholder="Search prompt wording, topic or market…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit">Search rankings</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setText("");
            update({
              reportSearch: "",
              reportGap: "all",
              reportMatrix: "all",
              reportChange: "all",
              reportBrand: undefined,
            });
          }}
        >
          Clear ranking filters
        </Button>
      </form>
      <SavedTrackingReportTable
        rows={report.rankings.rows}
        columns={columns}
        filename="ai-rankings"
        page={report.rankings}
        onPage={(reportPage) => update({ reportPage })}
        context={`${search.days} days; ${search.scope}; selected brand ${search.reportBrand ?? "own"}; gap ${search.reportGap}; signals ${search.reportMatrix}; changes ${search.reportChange}`}
      />
      {selected && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selected.prompt}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {selected.market} · {AI_ENGINE_LABELS[selected.engine]}
              </p>
            </DialogHeader>
            <AnswerContent
              projectId={projectId}
              observationId={selected.observationId}
            />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
