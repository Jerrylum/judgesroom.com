ALTER TABLE `Judges` ADD `authToken` text NOT NULL;--> statement-breakpoint
ALTER TABLE `Metadata` ADD `accessControlEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE `JudgeAdvisors` (
	`id` text PRIMARY KEY NOT NULL,
	`authToken` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `judges_authToken` ON `Judges` (`authToken`);--> statement-breakpoint
CREATE UNIQUE INDEX `judge_advisors_authToken` ON `JudgeAdvisors` (`authToken`);
