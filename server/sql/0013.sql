CREATE TABLE IF NOT EXISTS `entity_hashtags` (
    `entity_id` integer NOT NULL,
    `hashtag_id` integer NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`hashtag_id`) REFERENCES `hashtags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entity_hashtags_entity_hashtag_idx` ON `entity_hashtags` (`entity_id`,`hashtag_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entity_hashtags_hashtag_entity_idx` ON `entity_hashtags` (`hashtag_id`,`entity_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `entity_hashtags_pk` ON `entity_hashtags` (`entity_id`,`hashtag_id`);
--> statement-breakpoint
UPDATE `info` SET `value` = '13' WHERE `key` = 'migration_version';