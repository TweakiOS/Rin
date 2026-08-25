CREATE TABLE IF NOT EXISTS `entities` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `slug` text NOT NULL,
    `name` text NOT NULL,
    `name_cn` text,
    `type` text NOT NULL,
    `description` text DEFAULT '' NOT NULL,
    `summary` text DEFAULT '' NOT NULL,
    `data` text DEFAULT '{}' NOT NULL,
    `parent_id` integer,
    `sort_order` integer DEFAULT 0 NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `entities_slug_unique` ON `entities` (`slug`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entities_slug_idx` ON `entities` (`slug`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entities_type_idx` ON `entities` (`type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entities_parent_idx` ON `entities` (`parent_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `entity_relations` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `from_id` integer NOT NULL,
    `to_id` integer NOT NULL,
    `relation_type` text NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`from_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`to_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entity_relations_from_idx` ON `entity_relations` (`from_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `entity_relations_to_idx` ON `entity_relations` (`to_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `entity_relations_unique` ON `entity_relations` (`from_id`,`to_id`,`relation_type`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `feed_entities` (
    `feed_id` integer NOT NULL,
    `entity_id` integer NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `feed_entities_feed_entity_idx` ON `feed_entities` (`feed_id`,`entity_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `feed_entities_entity_feed_idx` ON `feed_entities` (`entity_id`,`feed_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `feed_entities_pk` ON `feed_entities` (`feed_id`,`entity_id`);
--> statement-breakpoint
UPDATE `info` SET `value` = '12' WHERE `key` = 'migration_version';