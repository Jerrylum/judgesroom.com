CREATE TABLE `AwardNoWinners` (
	`awardName` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`awardName`) REFERENCES `Awards`(`name`) ON UPDATE no action ON DELETE cascade
);
