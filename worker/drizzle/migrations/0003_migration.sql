CREATE TABLE `PendingPhotoUploads` (
	`token` text PRIMARY KEY NOT NULL,
	`photoId` text NOT NULL,
	`teamId` text NOT NULL,
	`contentType` text NOT NULL,
	`byteSize` integer NOT NULL,
	`createdByDeviceId` text NOT NULL,
	`createdByJudgeId` text,
	`expiresAt` integer NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `TeamPhotos` (
	`id` text PRIMARY KEY NOT NULL,
	`teamId` text NOT NULL,
	`contentType` text NOT NULL,
	`byteSize` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`createdByDeviceId` text NOT NULL,
	`createdByJudgeId` text,
	`viewSecret` text NOT NULL,
	FOREIGN KEY (`teamId`) REFERENCES `Teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_photos_teamId` ON `TeamPhotos` (`teamId`);