import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { AI_ENGINE_LABELS } from "@/shared/ai-visibility";
import { aiEngineSchema } from "@/types/schemas/ai-visibility";
import type { AnalyticsSearch } from "@/types/schemas/ai-analytics-search";
import type { SavedAnswerAnalytics } from "@/types/schemas/ai-saved-answer-analytics";
import { aiDate } from "../ai-visibility/shared";

export type { AnalyticsSearch } from "@/types/schemas/ai-analytics-search";
export type AnalyticsUpdate = (patch: Partial<AnalyticsSearch>) => void;
export function AnalyticsSelect({
  label,
  value,
  items,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-xs text-muted-foreground">
      {label}
      <Select
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
      >
        <SelectTrigger aria-label={label} className="min-w-40 text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function SavedAnswerAnalyticsFilters({
  data,
  search,
  update,
}: {
  data: SavedAnswerAnalytics;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  return (
    <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-4">
      <AnalyticsSelect
        label="Reporting window"
        value={String(search.days)}
        disabled={!!search.run}
        items={[7, 28, 30, 90].map((days) => ({
          value: String(days),
          label: `Last ${days} days`,
        }))}
        onChange={(value) =>
          update({
            days:
              value === "7"
                ? 7
                : value === "90"
                  ? 90
                  : value === "30"
                    ? 30
                    : 28,
            run: undefined,
          })
        }
      />
      <AnalyticsSelect
        label="Engine"
        value={search.engine ?? "all"}
        items={[
          { value: "all", label: "All engines" },
          ...aiEngineSchema.options.map((value) => ({
            value,
            label: AI_ENGINE_LABELS[value],
          })),
        ]}
        onChange={(value) =>
          update({ engine: aiEngineSchema.safeParse(value).data })
        }
      />
      <AnalyticsSelect
        label="Topic"
        value={search.topic ?? "all"}
        items={[
          { value: "all", label: "All topics" },
          ...data.topics.map((value) => ({ value, label: value })),
        ]}
        onChange={(value) =>
          update({ topic: value === "all" ? undefined : value })
        }
      />
      <AnalyticsSelect
        label="Prompt type"
        value={search.branded}
        items={[
          { value: "neutral", label: "Non-branded prompts" },
          { value: "branded", label: "Branded prompts" },
          { value: "all", label: "All prompts" },
        ]}
        onChange={(value) =>
          update({
            branded:
              value === "all"
                ? "all"
                : value === "branded"
                  ? "branded"
                  : "neutral",
          })
        }
      />
      {search.scope !== "all" && (
        <AnalyticsSelect
          label="Saved check"
          value={search.run ?? "latest"}
          items={[
            { value: "latest", label: "Latest scheduled / baseline" },
            ...data.availableRuns.map((run) => ({
              value: run.id,
              label: `${aiDate(run.createdAt)} · ${run.trigger}`,
            })),
          ]}
          onChange={(value) =>
            update({ run: value === "latest" ? undefined : value })
          }
        />
      )}
    </div>
  );
}
