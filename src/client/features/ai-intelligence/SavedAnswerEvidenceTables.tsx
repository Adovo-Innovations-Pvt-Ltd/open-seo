import { useState } from "react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import { AI_ENGINE_LABELS } from "@/shared/ai-visibility";
import {
  AnalyticsSelect,
  type AnalyticsSearch,
  type AnalyticsUpdate,
} from "./SavedAnswerAnalyticsFilters";
import { analyticsPercent } from "./SavedAnswerOverview";
import { AnswerContent } from "../ai-visibility/AnswerContent";
import {
  SavedAnalyticsEmptyState,
  SOURCE_OWNERSHIP_LABELS,
} from "./SavedAnalyticsSelection";
import { aiDate } from "../ai-visibility/shared";

function AnalyticsPagination({
  page,
  pages,
  totalCount,
  onPage,
}: {
  page: number;
  pages: number;
  totalCount: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border p-3 text-xs text-muted-foreground">
      <span>
        {totalCount} results · Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
export function SavedSourceVisibility({
  data,
  search,
  update,
}: {
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-end gap-3 p-5">
        <div className="mr-auto">
          <h2 className="font-semibold">Source visibility</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Distinct answered observations citing each source /{" "}
            {data.totals.answered} answered observations. Sources can overlap.
          </p>
        </div>
        <AnalyticsSelect
          label="Group sources"
          value={search.groupBy}
          items={[
            { value: "domain", label: "Domain" },
            { value: "url", label: "Page URL" },
          ]}
          onChange={(v) =>
            update({
              groupBy: v === "url" ? "url" : "domain",
              source: undefined,
            })
          }
        />
        <AnalyticsSelect
          label="Source ownership"
          value={search.ownership}
          items={(["all", "own", "competitor", "other"] as const).map(
            (value) => ({
              value,
              label: SOURCE_OWNERSHIP_LABELS[value],
            }),
          )}
          onChange={(v) =>
            update({
              ownership:
                v === "own"
                  ? "own"
                  : v === "competitor"
                    ? "competitor"
                    : v === "other"
                      ? "other"
                      : "all",
            })
          }
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Ownership</TableHead>
            <TableHead>Citing answers</TableHead>
            <TableHead>Source visibility</TableHead>
            <TableHead>Gap answers</TableHead>
            <TableHead>Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.sources.rows.map((source) => (
            <TableRow key={source.key}>
              <TableCell>
                <div className="max-w-md truncate font-medium">
                  {source.url ? (
                    <SafeExternalLink
                      url={source.url}
                      label={source.title ?? source.url}
                      className="hover:underline"
                    />
                  ) : (
                    source.domain
                  )}
                </div>
                {source.url && (
                  <div className="text-xs text-muted-foreground">
                    {source.domain}
                  </div>
                )}
              </TableCell>
              <TableCell>{SOURCE_OWNERSHIP_LABELS[source.ownership]}</TableCell>
              <TableCell>{source.answerCount}</TableCell>
              <TableCell>{analyticsPercent(source.visibility)}</TableCell>
              <TableCell>{source.gapCount}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update({
                      view: "responses",
                      source: source.key,
                      signal: undefined,
                      brand: undefined,
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
      {!data.sources.totalCount && (
        <SavedAnalyticsEmptyState
          kind="sources"
          data={data}
          search={search}
          update={update}
        />
      )}
      <AnalyticsPagination
        {...data.sources}
        onPage={(sourcePage) => update({ sourcePage })}
      />
    </section>
  );
}
export function SavedResponseSearch({
  projectId,
  data,
  search,
  update,
}: {
  projectId: string;
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  const [query, setQuery] = useState(search.q),
    [selected, setSelected] = useState<
      SavedAnswerAnalytics["responses"]["rows"][number] | null
    >(null);
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="space-y-3 p-5">
        <h2 className="font-semibold">Response search</h2>
        <p className="text-xs text-muted-foreground">
          Search the full saved answer prose. Search and evidence filters narrow
          this list; dashboard metric denominators stay unchanged.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: query });
          }}
        >
          <Input
            aria-label="Search saved answer text"
            placeholder="Search saved answers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={200}
          />
          <Button type="submit">Search</Button>
        </form>
        <div className="flex flex-wrap items-end gap-3">
          <AnalyticsSelect
            label="Answer status"
            value={search.answerState}
            items={["all", "answered", "failed", "no_answer", "pending"].map(
              (value) => ({ value, label: value.replaceAll("_", " ") }),
            )}
            onChange={(v) =>
              update({
                answerState:
                  v === "answered"
                    ? "answered"
                    : v === "failed"
                      ? "failed"
                      : v === "no_answer"
                        ? "no_answer"
                        : v === "pending"
                          ? "pending"
                          : "all",
              })
            }
          />
          <span className="text-xs text-muted-foreground">
            {search.signal && `Signal: ${search.signal}`}{" "}
            {search.brand && `Brand: ${search.brand}`}{" "}
            {search.source && `Source: ${search.source}`}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setQuery("");
              update({
                q: "",
                signal: undefined,
                brand: undefined,
                source: undefined,
                answerState: "all",
              });
            }}
          >
            Clear evidence filters
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prompt and saved response</TableHead>
            <TableHead>Market / engine</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.responses.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="max-w-xl whitespace-normal">
                <div className="font-medium" data-ph-mask>
                  {row.prompt}
                </div>
                <p
                  className="mt-1 text-xs leading-relaxed text-muted-foreground"
                  data-ph-mask
                >
                  {row.snippet ?? "No answer text was collected."}
                </p>
              </TableCell>
              <TableCell>
                <div>{row.market}</div>
                <div className="text-xs text-muted-foreground">
                  {AI_ENGINE_LABELS[row.engine]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {aiDate(row.collectedAt)}
                </div>
              </TableCell>
              <TableCell>
                {row.answerStatus ?? row.status}
                {row.gap && (
                  <div className="text-xs text-muted-foreground">
                    Competitor gap
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(row)}
                >
                  Open answer
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!data.responses.totalCount && (
        <SavedAnalyticsEmptyState
          kind="responses"
          data={data}
          search={search}
          update={update}
        />
      )}
      <AnalyticsPagination
        {...data.responses}
        onPage={(responsePage) => update({ responsePage })}
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
              <DialogTitle className="leading-relaxed" data-ph-mask>
                {selected.prompt}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {selected.market} · {AI_ENGINE_LABELS[selected.engine]} ·{" "}
                {aiDate(selected.collectedAt)}
              </p>
            </DialogHeader>
            <AnswerContent projectId={projectId} observationId={selected.id} />
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
