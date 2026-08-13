-- Nullable so v2.0.0 rooms with existing Judges rows can migrate.
-- Tokens are backfilled below; schema.ts still treats authToken as required.
ALTER TABLE `Judges` ADD `authToken` text;--> statement-breakpoint
UPDATE `Judges` SET `authToken` = lower(substr(hex(randomblob(9)), 1, 12)) WHERE `authToken` IS NULL;--> statement-breakpoint
ALTER TABLE `Metadata` ADD `accessControlEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE `JudgeAdvisors` (
	`id` text PRIMARY KEY NOT NULL,
	`authToken` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `judges_authToken` ON `Judges` (`authToken`);--> statement-breakpoint
CREATE UNIQUE INDEX `judge_advisors_authToken` ON `JudgeAdvisors` (`authToken`);
