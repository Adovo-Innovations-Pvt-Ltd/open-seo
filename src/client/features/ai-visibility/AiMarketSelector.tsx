import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormDialog } from "@/client/components/FormDialog";
import { Button } from "@/client/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { ProjectMarketFields } from "@/client/features/projects/ProjectMarketFields";
import { saveAiVisibilityTracker } from "@/serverFunctions/ai-visibility";
import { aiMarketLabel, type AiTrackerState } from "@/shared/ai-visibility";
import { LOCATION_OPTIONS } from "@/shared/keyword-locations";
import { aiEnginesWithoutLocation } from "@/shared/ai-visibility";
import { AiQueryError, aiVisibilityKey } from "./shared";

export function AiMarketSelector({
  projectId,
  state,
}: {
  projectId: string;
  state: AiTrackerState;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [market, setMarket] = useState({
    locationCode: 2840,
    languageCode: "en",
  });
  const markets = state.markets ?? (state.tracker ? [state.tracker] : []);
  const items = markets.map((tracker) => ({
    value: tracker.id,
    label: aiMarketLabel(tracker),
  }));
  const change = (id: string) => {
    void navigate({
      from: "/p/$projectId/ai-visibility",
      to: "/p/$projectId/ai-visibility",
      params: { projectId },
      search: (prev) => ({ ...prev, market: id }),
    });
  };
  const create = useMutation({
    mutationFn: () =>
      saveAiVisibilityTracker({
        data: {
          projectId,
          createMarket: true,
          ...market,
          engines: state.engines.length ? state.engines : ["chatgpt"],
        },
      }),
    onSuccess: (result) => {
      setAdding(false);
      void queryClient.invalidateQueries({
        queryKey: aiVisibilityKey(projectId),
      });
      if (result.state.tracker) change(result.state.tracker.id);
    },
  });
  if (!state.configured) return null;
  const duplicate = markets.some(
    (tracker) =>
      tracker.locationCode === market.locationCode &&
      tracker.languageCode === market.languageCode,
  );
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <span className="text-sm font-medium">Tracking market</span>
        <Select
          items={items}
          value={state.tracker?.id ?? null}
          onValueChange={(id) => {
            if (id) change(id);
          }}
        >
          <SelectTrigger aria-label="Tracking market" className="min-w-56">
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
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          Add market
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Each market keeps its exact prompts, answers, engines and schedule.
          Settings and Run now apply only to the selected market.
        </p>
      </div>
      {adding && (
        <FormDialog
          title="Add tracking market"
          onClose={() => {
            if (!create.isPending) setAdding(false);
          }}
          actions={
            <Button
              disabled={duplicate || create.isPending}
              onClick={() => create.mutate()}
            >
              Create paused market
            </Button>
          }
        >
          <ProjectMarketFields
            value={market}
            onChange={setMarket}
            countryOptions={LOCATION_OPTIONS.filter(
              (option) =>
                !aiEnginesWithoutLocation(state.engines, option.code).length,
            )}
          />
          <p className="text-sm text-muted-foreground">
            The new market starts with no prompts and tracking paused. Add
            prompts and review the cost before enabling its schedule.
          </p>
          {duplicate && (
            <p className="text-sm text-muted-foreground">
              This country and language already have a tracker. Choose another
              market.
            </p>
          )}
          {create.error && <AiQueryError error={create.error} />}
        </FormDialog>
      )}
    </>
  );
}
