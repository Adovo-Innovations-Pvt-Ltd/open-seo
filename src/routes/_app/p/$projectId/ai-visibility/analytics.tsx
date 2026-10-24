import { createFileRoute, redirect } from "@tanstack/react-router";
import { savedAnswerAnalyticsSearchSchema } from "@/types/schemas/ai-analytics-search";

export const Route = createFileRoute(
  "/_app/p/$projectId/ai-visibility/analytics",
)({
  validateSearch: savedAnswerAnalyticsSearchSchema,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/p/$projectId/intelligence",
      params,
      search,
      replace: true,
    });
  },
});
