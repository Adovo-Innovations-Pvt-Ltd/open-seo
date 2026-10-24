import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { savedAnswerAnalyticsSchema } from "@/types/schemas/ai-saved-answer-analytics";
import { loadSavedAnswerAnalytics } from "@/server/features/ai-visibility/services/aiSavedAnswerAnalytics";

export const getSavedAnswerAnalytics = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(savedAnswerAnalyticsSchema)
  .handler(({ data, context }) =>
    loadSavedAnswerAnalytics({ ...data, projectId: context.projectId }),
  );
