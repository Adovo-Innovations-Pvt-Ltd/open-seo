import { AiVisibilityRepository as repo } from "../repositories/AiVisibilityRepository";
import type { SaveAiTrackerInput } from "@/types/schemas/ai-visibility";
import { projectPatch } from "./aiVisibilityMutation";
import { getTracker } from "./aiVisibilityState";
import { AiVisibilityError } from "./aiVisibilityErrors";

/** Existing markets keep their schedules. Explicit new markets start paused. */
export async function saveTracker(input: SaveAiTrackerInput) {
  const { projectId, trackerId, createMarket, ...patch } = input;
  if (createMarket && (trackerId || patch.locationCode === undefined))
    throw new AiVisibilityError(
      "INVALID_MARKET",
      "To add a market, provide locationCode and omit trackerId.",
    );
  const current = createMarket
    ? null
    : await repo.getConfiguration(projectId, trackerId);
  if (trackerId && !current)
    throw new AiVisibilityError(
      "TRACKER_NOT_FOUND",
      "This market is not available in the selected project.",
    );
  const { rows, created, updated, skipped } = await projectPatch(
    projectId,
    patch,
    current,
  );
  const markets = await repo.listTrackers(projectId);
  if (
    markets.some(
      (market) =>
        market.id !== rows.tracker.id &&
        market.locationCode === rows.tracker.locationCode &&
        market.languageCode === rows.tracker.languageCode,
    )
  )
    throw new AiVisibilityError(
      "MARKET_EXISTS",
      "This country and language already have a tracker in this project. Switch to that market to edit it.",
    );
  if (createMarket) {
    rows.tracker.enabled = false;
    rows.tracker.nextCheckAt = null;
  }
  await repo.saveConfiguration(rows);
  return {
    state: await getTracker({ projectId, trackerId: rows.tracker.id }),
    created,
    updated,
    skipped,
  };
}
