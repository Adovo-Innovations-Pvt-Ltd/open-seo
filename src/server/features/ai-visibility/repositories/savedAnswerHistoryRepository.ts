import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  notInArray,
  ne,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  aiRuns,
  aiObservations,
  aiPrompts,
  aiMatches,
  aiSources,
} from "@/db/schema";

export async function listSavedAnalyticsRuns(
  projectId: string,
  trackerIds: string[],
  since: string,
  runId?: string,
) {
  if (!trackerIds.length) return [];
  return db
    .select()
    .from(aiRuns)
    .where(
      and(
        eq(aiRuns.projectId, projectId),
        inArray(aiRuns.trackerId, trackerIds),
        notInArray(aiRuns.status, ["queued", "running"]),
        runId
          ? eq(aiRuns.id, runId)
          : and(ne(aiRuns.trigger, "manual"), gte(aiRuns.createdAt, since)),
      ),
    )
    .orderBy(desc(aiRuns.createdAt), desc(aiRuns.id))
    .limit(201);
}

/** Project-scoped light evidence; full answer text is never loaded for trend charts. */
export async function readSavedAnalyticsHistory(
  projectId: string,
  runIds: string[],
) {
  const rows = [];
  for (let offset = 0; offset < runIds.length; offset += 50) {
    rows.push(
      ...(await db
        .select({
          id: aiObservations.id,
          runId: aiObservations.runId,
          promptId: aiObservations.promptId,
          prompt: aiPrompts.text,
          topic: aiPrompts.topic,
          branded: aiObservations.branded,
          engine: aiObservations.engine,
          status: aiObservations.status,
          collectedAt: aiObservations.collectedAt,
          hasAnswer:
            sql<number>`CASE WHEN ${aiObservations.answerMarkdown} IS NULL OR ${aiObservations.answerMarkdown} = '' THEN 0 ELSE 1 END`.mapWith(
              Number,
            ),
          citationCount:
            sql<number>`(SELECT count(*) FROM ${aiSources} WHERE ${aiSources.observationId} = ${aiObservations.id})`.mapWith(
              Number,
            ),
          brand: aiMatches,
        })
        .from(aiObservations)
        .innerJoin(aiRuns, eq(aiRuns.id, aiObservations.runId))
        .innerJoin(aiPrompts, eq(aiPrompts.id, aiObservations.promptId))
        .leftJoin(aiMatches, eq(aiMatches.observationId, aiObservations.id))
        .where(
          and(
            eq(aiRuns.projectId, projectId),
            inArray(aiRuns.id, runIds.slice(offset, offset + 50)),
          ),
        )
        .orderBy(asc(aiRuns.createdAt), asc(aiObservations.id))),
    );
  }
  return rows;
}
