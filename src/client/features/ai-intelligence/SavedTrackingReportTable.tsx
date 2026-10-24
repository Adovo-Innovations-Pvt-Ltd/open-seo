import { useState } from "react";
import type { ReactNode } from "react";
import type { CsvValue } from "@/client/lib/csv";
import { exportRows } from "@/client/lib/exportRows";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
function displayValue(value: CsvValue) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return typeof value === "number"
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(
        value,
      )
    : value;
}
export interface TrackingColumn<T> {
  label: string;
  value: (row: T) => CsvValue;
  render?: (row: T) => ReactNode;
}
export function SavedTrackingReportTable<T>({
  rows,
  columns,
  filename,
  empty = "No saved evidence matches these report filters.",
  page,
  onPage,
  context,
}: {
  rows: T[];
  columns: TrackingColumn<T>[];
  filename: string;
  empty?: string;
  page?: { page: number; pages: number; totalCount: number };
  onPage?: (page: number) => void;
  context?: string;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = columns.filter((c) => !hidden.includes(c.label));
  return (
    <div className="space-y-3">
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">
          Manage report columns ({visible.length}/{columns.length})
        </summary>
        <p className="mt-2">
          Column choices affect this table. CSV exports include every report
          column.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {columns.map((c) => (
            <label key={c.label} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={!hidden.includes(c.label)}
                onChange={() =>
                  setHidden((previous) =>
                    previous.includes(c.label)
                      ? previous.filter((label) => label !== c.label)
                      : previous.length < columns.length - 1
                        ? [...previous, c.label]
                        : previous,
                  )
                }
              />
              {c.label}
            </label>
          ))}
        </div>
      </details>
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={!rows.length}
          onClick={() => {
            void exportRows({
              format: "csv",
              feature: "ai_intelligence",
              filename,
              headers: ["Report scope", ...columns.map((c) => c.label)],
              rows: rows.map((r) => [
                context ?? "Current selection",
                ...columns.map((c) => c.value(r)),
              ]),
            });
          }}
        >
          {page ? "Export this page CSV" : "Export CSV"}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {visible.map((c) => (
              <TableHead key={c.label}>{c.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {visible.map((c) => (
                <TableCell key={c.label} className="max-w-sm whitespace-normal">
                  {c.render ? c.render(r) : displayValue(c.value(r))}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!rows.length && (
        <p className="p-6 text-center text-sm text-muted-foreground">{empty}</p>
      )}
      {page && (
        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>
            {page.totalCount} results · Page {page.page} of {page.pages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page.page <= 1}
              onClick={() => onPage?.(page.page - 1)}
            >
              Previous report page
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page.page >= page.pages}
              onClick={() => onPage?.(page.page + 1)}
            >
              Next report page
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
