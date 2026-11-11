CREATE TABLE `RobotEventsCache` (
	`resource` text PRIMARY KEY NOT NULL,
	`payload` text,
	`fetchedAt` integer,
	`fetchingStarted` integer DEFAULT 0 NOT NULL
);
