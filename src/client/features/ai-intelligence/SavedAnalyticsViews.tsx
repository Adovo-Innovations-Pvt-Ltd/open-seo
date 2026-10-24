import { useState } from "react";
import { z } from "zod";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";
import { savedAnswerAnalyticsSearchSchema } from "@/types/schemas/ai-analytics-search";
import {
  AnalyticsSelect,
  type AnalyticsSearch,
  type AnalyticsUpdate,
} from "./SavedAnswerAnalyticsFilters";
const viewsSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(60),
      search: savedAnswerAnalyticsSearchSchema,
    }),
  )
  .max(10);
function readViews(key: string) {
  try {
    const result = viewsSchema.safeParse(
      JSON.parse(localStorage.getItem(key) ?? "[]"),
    );
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}
export function SavedAnalyticsViews({
  projectId,
  search,
  update,
}: {
  projectId: string;
  search: AnalyticsSearch;
  update: AnalyticsUpdate;
}) {
  const key = `openseo:intelligence:views:v1:${projectId}`;
  const [views, setViews] = useState(() => readViews(key)),
    [name, setName] = useState(""),
    [message, setMessage] = useState("");
  return (
    <details className="rounded-xl border border-border bg-card p-4 text-sm">
      <summary className="cursor-pointer font-medium">
        Saved filter views ({views.length})
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Saved in this browser for this project. Views store report filters only
        and never change tracking prompts or schedules.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <AnalyticsSelect
          label="Open saved analytics view"
          value="choose"
          items={[
            { value: "choose", label: "Choose a saved view" },
            ...views.map((v) => ({ value: v.id, label: v.name })),
          ]}
          onChange={(id) => {
            const view = views.find((v) => v.id === id);
            if (view) {
              update({
                ...view.search,
                reportPage: 1,
                responsePage: 1,
                sourcePage: 1,
              });
              setMessage(`Opened ${view.name}`);
            }
          }}
        />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || views.length >= 10) return;
            const next = [
              ...views,
              { id: crypto.randomUUID(), name: name.trim(), search },
            ];
            try {
              localStorage.setItem(key, JSON.stringify(next));
              setViews(next);
              setMessage(`Saved ${name.trim()}`);
              setName("");
            } catch {
              setMessage("This browser could not save the view.");
            }
          }}
        >
          <Input
            aria-label="Analytics view name"
            placeholder="Name this filter view"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={!name.trim() || views.length >= 10}>
            Save filter view
          </Button>
        </form>
      </div>
      {message && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}
      {views.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {views.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant="ghost"
              onClick={() => {
                const next = views.filter((item) => item.id !== v.id);
                try {
                  localStorage.setItem(key, JSON.stringify(next));
                  setViews(next);
                  setMessage(`Removed ${v.name}`);
                } catch {
                  setMessage("This browser could not remove the view.");
                }
              }}
            >
              Remove {v.name}
            </Button>
          ))}
        </div>
      )}
    </details>
  );
}
