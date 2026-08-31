PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE `entities` (
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
CREATE TABLE `entity_relations` (
    `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    `from_id` integer NOT NULL,
    `to_id` integer NOT NULL,
    `relation_type` text NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`from_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`to_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `feed_entities` (
    `feed_id` integer NOT NULL,
    `entity_id` integer NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`feed_id`) REFERENCES `feeds`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `entity_hashtags` (
    `entity_id` integer NOT NULL,
    `hashtag_id` integer NOT NULL,
    `created_at` integer DEFAULT (unixepoch()) NOT NULL,
    FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (`hashtag_id`) REFERENCES `hashtags`(`id`) ON UPDATE no action ON DELETE cascade
);
DELETE FROM sqlite_sequence;
CREATE UNIQUE INDEX `entity_relations_unique` ON `entity_relations` (`from_id`,`to_id`,`relation_type`);
CREATE INDEX `feed_entities_feed_entity_idx` ON `feed_entities` (`feed_id`,`entity_id`);
CREATE INDEX `feed_entities_entity_feed_idx` ON `feed_entities` (`entity_id`,`feed_id`);
CREATE UNIQUE INDEX `feed_entities_pk` ON `feed_entities` (`feed_id`,`entity_id`);
CREATE INDEX `entity_hashtags_entity_hashtag_idx` ON `entity_hashtags` (`entity_id`,`hashtag_id`);
CREATE INDEX `entity_hashtags_hashtag_entity_idx` ON `entity_hashtags` (`hashtag_id`,`entity_id`);
CREATE UNIQUE INDEX `entity_hashtags_pk` ON `entity_hashtags` (`entity_id`,`hashtag_id`);
