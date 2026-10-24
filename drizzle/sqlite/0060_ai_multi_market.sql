DROP INDEX `ai_trackers_project_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `ai_trackers_project_market_idx` ON `ai_trackers` (`project_id`,`location_code`,`language_code`);