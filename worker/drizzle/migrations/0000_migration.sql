CREATE TABLE `Awards` (
	`name` text NOT NULL,
	`type` text NOT NULL,
	`acceptedGrades` text NOT NULL,
	`winnersCount` integer NOT NULL,
	`requireNotebook` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `type` ON `Awards` (`type`);--> statement-breakpoint
CREATE TABLE `JudgeGroups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `JudgeGroupsAssignedTeams` (
	`judgeGroupId` text,
	`teamId` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assignment` ON `JudgeGroupsAssignedTeams` (`judgeGroupId`,`teamId`);--> statement-breakpoint
CREATE TABLE `Judges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`groupId` text,
	FOREIGN KEY (`groupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Teams` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`country` text NOT NULL,
	`shortName` text NOT NULL,
	`school` text NOT NULL,
	`grade` text NOT NULL,
	`group` text NOT NULL,
	`notebookLink` text NOT NULL,
	`excluded` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `number` ON `Teams` (`number`);--> statement-breakpoint
CREATE INDEX `group` ON `Teams` (`group`);