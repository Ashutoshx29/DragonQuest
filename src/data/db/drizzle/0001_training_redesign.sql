CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`mood` integer,
	`energy` integer,
	`discipline` integer,
	`accomplished` text,
	`challenged` text,
	`learned` text,
	`tomorrow_intent` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_unique_day` ON `journal_entries` (`day`);--> statement-breakpoint
CREATE TABLE `training_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text,
	`duration_sec` integer DEFAULT 0 NOT NULL,
	`completed_at` text NOT NULL,
	`day` text NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`payload_json` text
);
--> statement-breakpoint
CREATE INDEX `training_sessions_day_idx` ON `training_sessions` (`day`);