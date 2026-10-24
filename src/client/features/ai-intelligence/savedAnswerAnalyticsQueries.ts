import { queryOptions } from "@tanstack/react-query";
import { getSavedAnswerAnalytics } from "@/serverFunctions/ai-saved-answer-analytics";
import type { SavedAnswerAnalyticsInput } from "@/types/schemas/ai-saved-answer-analytics";
import { aiVisibilityKey } from "../ai-visibility/shared";

export const savedAnswerAnalyticsQuery = (input: SavedAnswerAnalyticsInput) =>
  queryOptions({
    queryKey: [
      ...aiVisibilityKey(input.projectId),
      "results",
      "analytics",
      input,
    ],
    queryFn: () => getSavedAnswerAnalytics({ data: input }),
    staleTime: 30_000,
  });
