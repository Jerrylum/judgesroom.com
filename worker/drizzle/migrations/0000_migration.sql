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
	`requireNotebook` integer NOT NULL
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
	PRIMARY KEY(`awardName`, `ranking`),
	FOREIGN KEY (`awardName`) REFERENCES `Awards`(`name`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `awardName` ON `FinalAwardNominations` (`awardName`);--> statement-breakpoint
CREATE INDEX `awardRanking` ON `FinalAwardNominations` (`awardName`,`ranking`);--> statement-breakpoint
CREATE TABLE `FinalAwardRankings` (
	`teamId` text NOT NULL,
	`awardName` text NOT NULL,
	`ranking` integer NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `final_award_rankings_teamId` ON `FinalAwardRankings` (`teamId`);--> statement-breakpoint
CREATE INDEX `final_award_rankings_awardName` ON `FinalAwardRankings` (`awardName`);--> statement-breakpoint
CREATE TABLE `JudgeGroupAwardNominations` (
	`judgeGroupId` text NOT NULL,
	`awardName` text NOT NULL,
	`teamId` text NOT NULL,
	PRIMARY KEY(`judgeGroupId`, `awardName`, `teamId`),
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`awardName`) REFERENCES `Awards`(`name`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `judge_group_award_nominations_judgeGroupId` ON `JudgeGroupAwardNominations` (`judgeGroupId`);--> statement-breakpoint
CREATE TABLE `JudgeGroups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `JudgeGroupsAssignedTeams` (
	`judgeGroupId` text NOT NULL,
	`teamId` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`judgeGroupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assignment` ON `JudgeGroupsAssignedTeams` (`judgeGroupId`,`teamId`);--> statement-breakpoint
CREATE TABLE `Judges` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`groupId` text NOT NULL,
	FOREIGN KEY (`groupId`) REFERENCES `JudgeGroups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Metadata` (
	`eventName` text NOT NULL,
	`competitionType` text NOT NULL,
	`eventGradeLevel` text NOT NULL,
	`judgingMethod` text NOT NULL
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
	`judgeGroupId` text NOT NULL,
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
	`isDevelopedNotebook` integer,
	`excluded` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_number` ON `Teams` (`number`);--> statement-breakpoint
CREATE INDEX `teams_group` ON `Teams` (`group_`);