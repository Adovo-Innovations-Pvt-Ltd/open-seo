import { and, desc, eq, gte, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { aiRuns, aiObservations } from "@/db/schema";

/** Snapshot selection is scoped in SQL and never polls or repairs a workflow. */
export async function findAnalyticsSnapshot(
  projectId: string,
  trackerId: string,
  since: string,
  runId?: string,
) {
  return (
    (
      await db
        .select()
        .from(aiRuns)
        .where(
          and(
            eq(aiRuns.projectId, projectId),
            eq(aiRuns.trackerId, trackerId),
            notInArray(aiRuns.status, ["queued", "running"]),
            runId
              ? eq(aiRuns.id, runId)
              : and(ne(aiRuns.trigger, "manual"), gte(aiRuns.createdAt, since)),
          ),
        )
        .orderBy(desc(aiRuns.createdAt), desc(aiRuns.id))
        .limit(1)
    )[0] ?? null
  );
}

/** Whole-check inventory, independent of analytics cohort and evidence filters. */
export async function listSnapshotPromptIds(projectId: string, runId: string) {
  return (
    await db
      .selectDistinct({ id: aiObservations.promptId })
      .from(aiObservations)
      .innerJoin(aiRuns, eq(aiRuns.id, aiObservations.runId))
      .where(and(eq(aiRuns.projectId, projectId), eq(aiRuns.id, runId)))
  ).map((row) => row.id);
}
