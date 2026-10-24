import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PromptTrackingPage } from "@/client/features/ai-visibility/PromptTrackingPage";
import { PROMPT_TRACKING_TABS } from "@/client/features/ai-visibility/PromptTrackingTabs";
import {
  aiRunResultsQueryOptions,
  aiTrackerQueryOptions,
  aiTrendQueryOptions,
} from "@/client/features/ai-visibility/shared";
import { queryClient } from "@/client/tanstack-db/queryClient";

const tabs = PROMPT_TRACKING_TABS.map((item) => item.value);

export const Route = createFileRoute("/_app/p/$projectId/ai-visibility/")({
  validateSearch: z.object({
    tab: z.enum(tabs).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ market: search.market }),
  loader: ({ params: { projectId }, deps: { market } }) => {
    void queryClient.prefetchQuery(aiTrendQueryOptions(projectId, 7, market));
    // The prompt table reads the latest run's answers, known from a fresh
    // tracker: a cached one can predate the latest run.
    void queryClient
      .fetchQuery({ ...aiTrackerQueryOptions(projectId, market), staleTime: 0 })
      .then((state) => {
        const runId = state.recentRuns[0]?.id;
        if (runId)
          return queryClient.prefetchQuery(
            aiRunResultsQueryOptions(projectId, runId),
          );
      })
      .catch(() => undefined);
  },
  component: PromptTrackingRoute,
});

function PromptTrackingRoute() {
  const { projectId } = Route.useParams();
  const { tab } = Route.useSearch();
  return (
    <PromptTrackingPage
      key={projectId}
      projectId={projectId}
      tab={tab ?? "prompts"}
    />
  );
}
