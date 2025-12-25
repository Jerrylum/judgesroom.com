-- Step 1: Add column with default value of false (0)
ALTER TABLE `Awards` ADD `requireTeamInterview` integer NOT NULL DEFAULT 0;--> statement-breakpoint
-- Step 2: Set requireTeamInterview = true for specific judged awards
UPDATE `Awards` SET `requireTeamInterview` = 1 WHERE `name` IN (
    'Excellence Award',
    'Excellence Award - High School',
    'Excellence Award - Middle School',
    'Excellence Award - Elementary School',
    'Design Award',
    'Innovate Award',
    'Create Award',
    'Think Award',
    'Amaze Award',
    'Build Award',
    'Judges Award',
    'Inspire Award'
);
