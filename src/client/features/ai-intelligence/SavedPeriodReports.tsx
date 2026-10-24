import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import {
  SavedTrackingReportTable,
  type TrackingColumn,
} from "./SavedTrackingReportTable";
import { analyticsPercent } from "./SavedAnswerOverview";
import { aiDate } from "../ai-visibility/shared";
const delta = (v: number | null) =>
  v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)} pp`;
export function SavedPeriodReports({ data }: { data: SavedAnswerAnalytics }) {
  const p = data.trackingReports.period;
  const columns: TrackingColumn<(typeof p.brands)[number]>[] = [
    { label: "Brand", value: (b) => b.domain },
    { label: "Current eligible answers", value: (b) => b.current.eligible },
    { label: "Previous eligible answers", value: (b) => b.previous.eligible },
    {
      label: "Current brand visibility (%)",
      value: (b) => b.current.mentionRate,
    },
    {
      label: "Previous brand visibility (%)",
      value: (b) => b.previous.mentionRate,
    },
    { label: "Brand visibility change (pp)", value: (b) => b.mentionDelta },
    {
      label: "Current source visibility (%)",
      value: (b) => b.current.citationRate,
    },
    {
      label: "Previous source visibility (%)",
      value: (b) => b.previous.citationRate,
    },
    { label: "Source visibility change (pp)", value: (b) => b.citationDelta },
    {
      label: "Current share of voice (%)",
      value: (b) => b.current.shareOfVoice,
    },
    {
      label: "Previous share of voice (%)",
      value: (b) => b.previous.shareOfVoice,
    },
    { label: "Share of voice change (pp)", value: (b) => b.shareDelta },
  ];
  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">Preceding-period comparison</h2>
      <p className="text-sm">{p.reason}</p>
      <p className="text-xs text-muted-foreground">
        Current check window: {aiDate(p.currentStart)} – {aiDate(p.currentEnd)}.
        Preceding check window: {aiDate(p.previousStart)} –{" "}
        {aiDate(p.currentStart)}. Latest finished scheduled/baseline snapshot
        per market in each window; {p.commonCells} shared exact collection
        cells. Delta units are percentage points, not relative percent growth.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            label: "Brand visibility",
            current: p.current.mentionRate,
            previous: p.previous.mentionRate,
            change: p.mentionDelta,
          },
          {
            label: "Source visibility",
            current: p.current.citationRate,
            previous: p.previous.citationRate,
            change: p.citationDelta,
          },
          {
            label: "Share of voice",
            current: p.current.shareOfVoice,
            previous: p.previous.shareOfVoice,
            change: p.shareDelta,
          },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border p-4">
            <h3 className="text-sm text-muted-foreground">{m.label}</h3>
            <p className="mt-2 text-2xl font-semibold">
              {analyticsPercent(m.current)}
            </p>
            <p className="mt-1 text-xs">
              Previous: {analyticsPercent(m.previous)} · Change:{" "}
              {delta(m.change)}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Current cohort: {p.currentCoverage.completed}/
        {p.currentCoverage.expected} answered, {p.currentCoverage.failed}{" "}
        failed, {p.currentCoverage.noAnswer} no answer. Previous cohort:{" "}
        {p.previousCoverage.completed}/{p.previousCoverage.expected} answered,{" "}
        {p.previousCoverage.failed} failed, {p.previousCoverage.noAnswer} no
        answer. Missing observations are not brand absences.
      </p>
      <SavedTrackingReportTable
        rows={p.brands}
        columns={columns}
        filename="ai-period-comparison"
        context={`${p.previousStart} – ${p.currentEnd}; ${p.status}; ${p.reason}`}
      />
    </section>
  );
}
