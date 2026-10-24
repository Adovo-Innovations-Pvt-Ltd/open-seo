import { z } from "zod";
import {
  savedAnswerAnalyticsSchema,
  savedAnswerAnalyticsOutput,
  type SavedAnswerAnalyticsInput,
} from "@/types/schemas/ai-saved-answer-analytics";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { mcpResponse } from "@/server/mcp/formatters";
import { buildProjectMeta } from "@/server/mcp/context";
import { optionalMetaOutputSchema } from "@/server/mcp/output-schemas";
import { AppError } from "@/server/lib/errors";
import { AiVisibilityError } from "@/server/features/ai-visibility/services/aiVisibilityErrors";

export const getSavedAnswerAnalyticsTool = {
  name: "get_ai_saved_answer_analytics",
  config: {
    title: "Analyze saved AI answers",
    description:
      "Read prompt-level rankings, gap and mention/citation matrices, first citation positions, source impact, Reddit/YouTube cited pages, model/topic matrices, source overlap, guarded preceding-period comparisons, saved-answer share of voice, source visibility, competitor gaps, response search and common-prompt market comparisons. No provider calls, collection, rematching or schedule changes. Defaults to neutral prompts and the latest finished scheduled/baseline check per selected market in 28 days; manual runs require explicit runId. Use trackerId for one market or allMarkets=true without trackerId/runId for comparison (up to eight markets). Response search, source, signal and brandDomain filter evidence rows only, never metric denominators. Metrics are calculated before pagination. Share of voice counts answer-level brand mentions among historical tracked brands, not population market share. Failed/no-answer observations are excluded from rates and shown in coverage. Use observation IDs with get_ai_visibility_answer for evidence.",
    inputSchema: savedAnswerAnalyticsSchema,
    outputSchema: z.looseObject({
      status: z.literal("success"),
      data: openOutputObjects(savedAnswerAnalyticsOutput),
      ...optionalMetaOutputSchema,
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(
    async (args: SavedAnswerAnalyticsInput, context) => {
      const { loadSavedAnswerAnalytics } =
        await import("@/server/features/ai-visibility/services/aiSavedAnswerAnalytics");
      const meta = buildProjectMeta(
        context,
        args.projectId,
        `/p/${args.projectId}/intelligence`,
      );
      try {
        const data = savedAnswerAnalyticsOutput.parse(
          await loadSavedAnswerAnalytics(
            savedAnswerAnalyticsSchema.parse(args),
          ),
        );
        return mcpResponse({
          text: `${data.coverage.completed}/${data.coverage.expected} answered observations. Share of voice uses stored tracked-brand mentions.\n${JSON.stringify({ status: "success", data })}`,
          meta,
          structuredContent: { status: "success" as const, data },
        });
      } catch (error) {
        if (error instanceof AiVisibilityError)
          throw new AppError("VALIDATION_ERROR", error.message);
        throw error;
      }
    },
  ),
};

// MCP schemas accept future fields in cached clients. Keep the UI DTO closed
// so TanStack can verify its JSON serialization without unknown index signatures.
function openOutputObjects(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodObject)
    return z.looseObject(
      Object.fromEntries(
        Object.entries<z.ZodType>(schema.shape).map(([key, value]) => [
          key,
          openOutputObjects(value),
        ]),
      ),
    );
  if (schema instanceof z.ZodArray && schema.element instanceof z.ZodType)
    return z.array(openOutputObjects(schema.element));
  return schema;
}
