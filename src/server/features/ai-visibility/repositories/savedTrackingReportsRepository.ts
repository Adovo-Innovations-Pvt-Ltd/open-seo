import { and, desc, eq, gte, inArray, lt, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { aiRuns, aiObservations, aiSources } from "@/db/schema";
export async function previousAnalyticsSnapshot(
  projectId: string,
  trackerId: string,
  start: string,
  end: string,
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
            gte(aiRuns.createdAt, start),
            lt(aiRuns.createdAt, end),
            ne(aiRuns.trigger, "manual"),
            notInArray(aiRuns.status, ["queued", "running"]),
          ),
        )
        .orderBy(desc(aiRuns.createdAt), desc(aiRuns.id))
        .limit(1)
    )[0] ?? null
  );
}
export async function readAnalyticsSources(
  projectId: string,
  runIds: string[],
) {
  if (!runIds.length) return [];
  return db
    .select({
      observationId: aiSources.observationId,
      url: aiSources.url,
      domain: aiSources.domain,
      title: aiSources.title,
      position: aiSources.position,
    })
    .from(aiSources)
    .innerJoin(aiObservations, eq(aiObservations.id, aiSources.observationId))
    .innerJoin(aiRuns, eq(aiRuns.id, aiObservations.runId))
    .where(and(eq(aiRuns.projectId, projectId), inArray(aiRuns.id, runIds)));
}
