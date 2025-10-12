CREATE TABLE `AwardRankings` (
	`judgeGroupId` text NOT NULL,
	`awardName` text NOT NULL,
	`teamId` text NOT NULL,
	`ranking` integer NOT NULL,
	PRIMARY KEY(`judgeGroupId`, `awardName`, `teamId`),
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`awardName`) REFERENCES `Awards`(`name`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `award_rankings_judgeGroupId` ON `AwardRankings` (`judgeGroupId`);--> statement-breakpoint
CREATE TABLE `Awards` (
	`name` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`acceptedGrades` text NOT NULL,
	`winnersCount` integer NOT NULL,
	`requireNotebook` integer NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `type` ON `Awards` (`type`);--> statement-breakpoint
CREATE TABLE `EngineeringNotebookRubrics` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`judgeId` text NOT NULL,
	`rubric` text NOT NULL,
	`notes` text NOT NULL,
	`innovateAwardNotes` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judgeId`) REFERENCES `Judges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `engineering_notebook_rubrics_teamId` ON `EngineeringNotebookRubrics` (`teamId`);--> statement-breakpoint
CREATE INDEX `engineering_notebook_rubrics_judgeId` ON `EngineeringNotebookRubrics` (`judgeId`);--> statement-breakpoint
CREATE TABLE `FinalAwardNominations` (
	`awardName` text NOT NULL,
	`ranking` integer NOT NULL,
	`teamId` text NOT NULL,
	`judgeGroupId` text,
	FOREIGN KEY (`awardName`) REFERENCES `Awards`(`name`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `final_award_nominations_awardName_ranking` ON `FinalAwardNominations` (`awardName`,`ranking`);--> statement-breakpoint
CREATE UNIQUE INDEX `final_award_nominations_awardName_teamId` ON `FinalAwardNominations` (`awardName`,`teamId`);--> statement-breakpoint
CREATE TABLE `JudgeGroups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `JudgeGroupsAssignedTeams` (
	`order` integer NOT NULL,
	`judgeGroupId` text NOT NULL,
	`teamId` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `JudgeGroupsAssignedTeams_order_unique` ON `JudgeGroupsAssignedTeams` (`order`);--> statement-breakpoint
CREATE INDEX `assignment` ON `JudgeGroupsAssignedTeams` (`judgeGroupId`,`teamId`);--> statement-breakpoint
CREATE TABLE `JudgeGroupsReviewedTeams` (
	`judgeGroupId` text NOT NULL,
	`teamId` text NOT NULL,
	PRIMARY KEY(`judgeGroupId`, `teamId`),
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `JudgeGroupsSubmissionsCache` (
	`judgeGroupId` text NOT NULL,
	`teamId` text NOT NULL,
	`judgeId` text NOT NULL,
	`timestamp` integer NOT NULL,
	`enrId` text,
	`tiId` text,
	`tnId` text,
	PRIMARY KEY(`enrId`, `tiId`, `tnId`),
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judgeId`) REFERENCES `Judges`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`enrId`) REFERENCES `EngineeringNotebookRubrics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tiId`) REFERENCES `TeamInterviewRubrics`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tnId`) REFERENCES `TeamInterviewNotes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `judge_groups_submissions_cache_judgeGroupId` ON `JudgeGroupsSubmissionsCache` (`judgeGroupId`);--> statement-breakpoint
CREATE TABLE `Judges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`groupId` text NOT NULL,
	FOREIGN KEY (`groupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Metadata` (
	`eventName` text NOT NULL,
	`program` text NOT NULL,
	`eventGradeLevel` text NOT NULL,
	`judgingMethod` text NOT NULL,
	`judgingStep` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `OfflineDevices` (
	`deviceId` text PRIMARY KEY NOT NULL,
	`deviceName` text NOT NULL,
	`connectedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Subscriptions` (
	`id` text NOT NULL,
	`judgeGroupId` text,
	`topic` text NOT NULL,
	PRIMARY KEY(`id`, `judgeGroupId`, `topic`),
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `TeamInterviewNotes` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`judgeId` text NOT NULL,
	`rows` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judgeId`) REFERENCES `Judges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_interview_notes_teamId` ON `TeamInterviewNotes` (`teamId`);--> statement-breakpoint
CREATE INDEX `team_interview_notes_judgeId` ON `TeamInterviewNotes` (`judgeId`);--> statement-breakpoint
CREATE TABLE `TeamInterviewRubrics` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`judgeId` text NOT NULL,
	`rubric` text NOT NULL,
	`notes` text NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`judgeId`) REFERENCES `Judges`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_interview_rubrics_teamId` ON `TeamInterviewRubrics` (`teamId`);--> statement-breakpoint
CREATE INDEX `team_interview_rubrics_judgeId` ON `TeamInterviewRubrics` (`judgeId`);--> statement-breakpoint
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
	`group_` text NOT NULL,
	`notebookLink` text DEFAULT '' NOT NULL,
	`notebookDevelopmentStatus` text DEFAULT 'undetermined' NOT NULL,
	`absent` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_number` ON `Teams` (`number`);--> statement-breakpoint
CREATE INDEX `teams_group` ON `Teams` (`group_`);