import { createFileRoute } from "@tanstack/react-router";
import { SavedAnswerAnalyticsPage } from "@/client/features/ai-intelligence/SavedAnswerAnalyticsPage";
import { savedAnswerAnalyticsSearchSchema } from "@/types/schemas/ai-analytics-search";

export const Route = createFileRoute("/_app/p/$projectId/intelligence")({
  validateSearch: savedAnswerAnalyticsSearchSchema,
  component: IntelligenceRoute,
});

function IntelligenceRoute() {
  return (
    <div className="overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl">
        <SavedAnswerAnalyticsPage />
      </div>
    </div>
  );
}
