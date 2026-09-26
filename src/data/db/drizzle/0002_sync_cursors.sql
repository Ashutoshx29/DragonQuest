CREATE TABLE `sync_cursors` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`last_pulled_at` text,
	`last_pushed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sync_cursors_table_idx` ON `sync_cursors` (`table_name`);
