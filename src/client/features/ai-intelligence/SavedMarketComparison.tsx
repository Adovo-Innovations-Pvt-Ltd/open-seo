import { exportRows } from "@/client/lib/exportRows";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { Button } from "@/client/components/ui/button";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import { analyticsPercent } from "./SavedAnswerOverview";
import { aiDate } from "../ai-visibility/shared";
import type { AnalyticsUpdate } from "./SavedAnswerAnalyticsFilters";

export function SavedMarketComparison({
  data,
  update,
}: {
  data: SavedAnswerAnalytics;
  update: AnalyticsUpdate;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Common-prompt market comparison</h2>
          <Button
            size="sm"
            variant="outline"
            disabled={!data.comparison.commonCells}
            onClick={() => {
              void exportRows({
                format: "csv",
                feature: "ai_visibility_analytics",
                filename: "ai-market-comparison",
                headers: [
                  "Market",
                  "Check created",
                  "Prompt cohort",
                  "Topic",
                  "Engines",
                  "Common prompt-engine cells",
                  "Answered",
                  "Failed",
                  "No answer",
                  "Own brand eligible answers",
                  "Own mention rate (%)",
                  "Own citation rate (%)",
                  "Tracked-brand share of voice (%)",
                  "Comparable",
                  "Comparison note",
                ],
                rows: data.comparison.rows.map((row) => [
                  row.label,
                  data.markets.find((m) => m.trackerId === row.trackerId)
                    ?.createdAt,
                  data.scope.branded,
                  data.scope.topic,
                  data.scope.engines.join(", "),
                  data.comparison.commonCells,
                  row.coverage.completed,
                  row.coverage.failed,
                  row.coverage.noAnswer,
                  row.totals.ownEligibleAnswers,
                  row.totals.mentionRate,
                  row.totals.citationRate,
                  row.totals.shareOfVoice,
                  data.comparison.comparable,
                  data.comparison.reason,
                ]),
              });
            }}
          >
            Export comparison CSV
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.comparison.reason}
        </p>
        <p className="my-3 text-xs text-muted-foreground">
          {data.comparison.commonPrompts} shared exact prompt wordings ·{" "}
          {data.comparison.commonCells} shared prompt × engine cells per market.
          Regional variants are not treated as equivalent.
        </p>
        {data.markets.length < 2 && (
          <Button
            variant="outline"
            onClick={() => update({ scope: "all", run: undefined })}
          >
            Compare all markets
          </Button>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Answered / planned</TableHead>
              <TableHead>Own mention rate</TableHead>
              <TableHead>Owned citation rate</TableHead>
              <TableHead>Tracked-brand SoV</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.comparison.rows.map((row) => (
              <TableRow key={row.trackerId}>
                <TableCell>{row.label}</TableCell>
                <TableCell>
                  {row.coverage.completed} / {row.coverage.expected}
                </TableCell>
                <TableCell>
                  {analyticsPercent(row.totals.mentionRate)}
                </TableCell>
                <TableCell>
                  {analyticsPercent(row.totals.citationRate)}
                </TableCell>
                <TableCell>
                  {analyticsPercent(row.totals.shareOfVoice)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Snapshot scope and freshness</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Each market uses one saved check. Collection dates and prompt counts
          are shown explicitly; these snapshots are not a synchronized time
          series.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market</TableHead>
              <TableHead>Check created</TableHead>
              <TableHead>Whole-check prompts / configured</TableHead>
              <TableHead>Answered / planned</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.markets.map((market) => (
              <TableRow key={market.trackerId}>
                <TableCell>{market.label}</TableCell>
                <TableCell>{aiDate(market.createdAt)}</TableCell>
                <TableCell>
                  {market.snapshotPrompts} / {market.configuredPrompts}
                  {market.uncollectedPrompts > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {market.uncollectedPrompts} configured prompts outside
                      this check
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {market.coverage.completed} / {market.coverage.expected}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update({
                        scope: "market",
                        market: market.trackerId,
                        view: "responses",
                        run: market.runId ?? undefined,
                        signal: undefined,
                        brand: undefined,
                        source: undefined,
                        q: "",
                      })
                    }
                  >
                    View market
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
