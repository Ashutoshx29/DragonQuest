CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_completions` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`day` text NOT NULL,
	`completed_at` text NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`bonus_multiplier` integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `completions_unique_day` ON `daily_completions` (`entity_type`,`entity_id`,`day`);--> statement-breakpoint
CREATE INDEX `completions_entity_idx` ON `daily_completions` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `completions_day_idx` ON `daily_completions` (`day`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`target_day` text,
	`status` text DEFAULT 'active' NOT NULL,
	`xp_reward` integer DEFAULT 100 NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `goals_status_idx` ON `goals` (`status`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`icon` text DEFAULT 'flash' NOT NULL,
	`color` text DEFAULT '#00E5FF' NOT NULL,
	`difficulty` integer DEFAULT 3 NOT NULL,
	`schedule_json` text DEFAULT '{"type":"daily"}' NOT NULL,
	`reminder_time` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `habits_archived_idx` ON `habits` (`archived_at`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`title` text NOT NULL,
	`completed_at` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `milestones_goal_idx` ON `milestones` (`goal_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `mission_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`kind` text NOT NULL,
	`xp_awarded` integer DEFAULT 0 NOT NULL,
	`claimed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mission_claims_unique_day_kind` ON `mission_claims` (`day`,`kind`);--> statement-breakpoint
CREATE TABLE `routine_items` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`habit_id` text,
	`task_id` text,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routine_items_routine_idx` ON `routine_items` (`routine_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'layers' NOT NULL,
	`time_of_day` text DEFAULT 'anytime' NOT NULL,
	`active_days_json` text DEFAULT '[0,1,2,3,4,5,6]' NOT NULL,
	`reminder_time` text,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`due_day` text,
	`priority` integer DEFAULT 2 NOT NULL,
	`completed_at` text,
	`habit_id` text,
	`deleted_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_open_idx` ON `tasks` (`completed_at`,`due_day`);--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_achievements_unique` ON `user_achievements` (`achievement_id`);--> statement-breakpoint
CREATE TABLE `user_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`challenge_id` text NOT NULL,
	`started_day` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`finished_day` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `xp_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL,
	`source` text NOT NULL,
	`ref_id` text,
	`reason` text,
	`created_at` text NOT NULL
);
