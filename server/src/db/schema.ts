import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

const created_at = integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull();
const updated_at = integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`).notNull();

export const feeds = sqliteTable("feeds", {
    id: integer("id").primaryKey(),
    alias: text("alias"),
    title: text("title"),
    summary: text("summary").default("").notNull(),
    ai_summary: text("ai_summary").default("").notNull(),
    ai_summary_status: text("ai_summary_status").default("idle").notNull(),
    ai_summary_error: text("ai_summary_error").default("").notNull(),
    content: text("content").notNull(),
    listed: integer("listed").default(1).notNull(),
    draft: integer("draft").default(1).notNull(),
    top: integer("top").default(0).notNull(),
    uid: integer("uid").references(() => users.id).notNull(),
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    aliasIdx: index("feeds_alias_idx").on(table.alias),
    visibilityOrderIdx: index("feeds_visibility_order_idx").on(
        table.draft,
        table.listed,
        table.top,
        table.createdAt,
        table.updatedAt,
    ),
    uidIdx: index("feeds_uid_idx").on(table.uid),
}));

export const moments = sqliteTable("moments", {
    id: integer("id").primaryKey(),
    content: text("content").notNull(),
    uid: integer("uid").references(() => users.id).notNull(),
    createdAt: created_at,
    updatedAt: updated_at
});

export const visits = sqliteTable("visits", {
    id: integer("id").primaryKey(),
    feedId: integer("feed_id").references(() => feeds.id, { onDelete: 'cascade' }).notNull(),
    ip: text("ip").notNull(),
    createdAt: created_at,
}, (table) => ({
    feedCreatedAtIdx: index("visits_feed_created_at_idx").on(table.feedId, table.createdAt),
}));

export const visitStats = sqliteTable("visit_stats", {
    feedId: integer("feed_id").references(() => feeds.id, { onDelete: 'cascade' }).notNull().primaryKey(),
    pv: integer("pv").default(0).notNull(),
    hllData: text("hll_data").default("").notNull(),
    updatedAt: updated_at,
});

export const info = sqliteTable("info", {
    key: text("key").notNull().unique(),
    value: text("value").notNull(),
});

export const friends = sqliteTable("friends", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    desc: text("desc"),
    avatar: text("avatar").notNull(),
    url: text("url").notNull(),
    uid: integer("uid").references(() => users.id, { onDelete: 'cascade' }).notNull(),
    accepted: integer("accepted").default(0).notNull(),
    health: text("health").default("").notNull(),
    sort_order: integer("sort_order").default(0).notNull(),
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    acceptedOrderIdx: index("friends_accepted_order_idx").on(
        table.accepted,
        table.sort_order,
        table.createdAt,
    ),
}));

export const users = sqliteTable("users", {
    id: integer("id").primaryKey(),
    username: text("username").notNull(),
    openid: text("openid").notNull(),
    avatar: text("avatar"),
    password: text("password"),
    permission: integer("permission").default(0),
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    openidIdx: index("users_openid_idx").on(table.openid),
}));

export const comments = sqliteTable("comments", {
    id: integer("id").primaryKey(),
    feedId: integer("feed_id").references(() => feeds.id, { onDelete: 'cascade' }).notNull(),
    userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
    content: text("content").notNull(),
    guestName: text("guest_name").default(""),
    guestEmail: text("guest_email").default(""),
    guestWebsite: text("guest_website").default(""),
    approved: integer("approved").default(1).notNull(),
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    feedCreatedAtIdx: index("comments_feed_created_at_idx").on(table.feedId, table.createdAt),
}));

export const hashtags = sqliteTable("hashtags", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    nameIdx: index("hashtags_name_idx").on(table.name),
}));

export const feedHashtags = sqliteTable("feed_hashtags", {
    feedId: integer("feed_id").references(() => feeds.id, { onDelete: 'cascade' }).notNull(),
    hashtagId: integer("hashtag_id").references(() => hashtags.id, { onDelete: 'cascade' }).notNull(),
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    feedHashtagIdx: index("feed_hashtags_feed_hashtag_idx").on(table.feedId, table.hashtagId),
    hashtagFeedIdx: index("feed_hashtags_hashtag_feed_idx").on(table.hashtagId, table.feedId),
}));

export const cache = sqliteTable("cache", {
    id: integer("id").primaryKey(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    type: text("type").default("cache").notNull(),
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    // 复合唯一约束：key + type
    keyTypeUnique: unique().on(table.key, table.type),
    typeKeyIdx: index("cache_type_key_idx").on(table.type, table.key),
}));

// ========== 知识树相关表（aistock.fyi 扩展） ==========

/** 统一知识实体：概念 / 组件 / 公司 / 产品 */
export const entities = sqliteTable("entities", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    name_cn: text("name_cn"),
    type: text("type").notNull(),
    description: text("description").default("").notNull(),
    summary: text("summary").default("").notNull(),
    data: text("data", { mode: "json" }).default("{}").notNull(),
    parent_id: integer("parent_id"),
    sort_order: integer("sort_order").default(0).notNull(),
    enabled: integer("enabled").default(1).notNull(), // ← 新增：1 启用 / 0 禁用
    createdAt: created_at,
    updatedAt: updated_at,
}, (table) => ({
    slugIdx: index("entities_slug_idx").on(table.slug),
    typeIdx: index("entities_type_idx").on(table.type),
    parentIdx: index("entities_parent_idx").on(table.parent_id),
    enabledIdx: index("entities_enabled_idx").on(table.enabled),
}));

/** 实体之间的关系（多对多 + 关系类型） */
export const entityRelations = sqliteTable("entity_relations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    from_id: integer("from_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    to_id: integer("to_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    relation_type: text("relation_type").notNull(), // uses | supplier | product_of | competitor | related
    createdAt: created_at,
}, (table) => ({
    fromIdx: index("entity_relations_from_idx").on(table.from_id),
    toIdx: index("entity_relations_to_idx").on(table.to_id),
    uniqueRelation: unique().on(table.from_id, table.to_id, table.relation_type),
}));

/** 文章（feeds）与实体的关联 */
export const feedEntities = sqliteTable("feed_entities", {
    feedId: integer("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" }),
    entityId: integer("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    createdAt: created_at,
}, (table) => ({
    feedEntityIdx: index("feed_entities_feed_entity_idx").on(table.feedId, table.entityId),
    entityFeedIdx: index("feed_entities_entity_feed_idx").on(table.entityId, table.feedId),
    pk: unique().on(table.feedId, table.entityId),
}));

/** 实体（知识树节点）与标签的关联 */
export const entityHashtags = sqliteTable("entity_hashtags", {
    entityId: integer("entity_id")
        .notNull()
        .references(() => entities.id, { onDelete: "cascade" }),
    hashtagId: integer("hashtag_id")
        .notNull()
        .references(() => hashtags.id, { onDelete: "cascade" }),
    createdAt: created_at,
}, (table) => ({
    entityHashtagIdx: index("entity_hashtags_entity_hashtag_idx")
        .on(table.entityId, table.hashtagId),
    hashtagEntityIdx: index("entity_hashtags_hashtag_entity_idx")
        .on(table.hashtagId, table.entityId),
    pk: unique().on(table.entityId, table.hashtagId),
}));

// Relations（放在文件末尾现有 relations 附近）
export const entitiesRelations = relations(entities, ({ many, one }) => ({
    children: many(entities, { relationName: "parent_child" }),
    parent: one(entities, {
        fields: [entities.parent_id],
        references: [entities.id],
        relationName: "parent_child",
    }),
    outgoingRelations: many(entityRelations, { relationName: "from" }),
    incomingRelations: many(entityRelations, { relationName: "to" }),
    feeds: many(feedEntities),
    hashtags: many(entityHashtags),
}));

export const entityRelationsRelations = relations(entityRelations, ({ one }) => ({
    from: one(entities, {
        fields: [entityRelations.from_id],
        references: [entities.id],
        relationName: "from",
    }),
    to: one(entities, {
        fields: [entityRelations.to_id],
        references: [entities.id],
        relationName: "to",
    }),
}));

export const feedEntitiesRelations = relations(feedEntities, ({ one }) => ({
    feed: one(feeds, {
        fields: [feedEntities.feedId],
        references: [feeds.id],
    }),
    entity: one(entities, {
        fields: [feedEntities.entityId],
        references: [entities.id],
    }),
}));

export const feedsRelations = relations(feeds, ({ many, one }) => ({
    hashtags: many(feedHashtags),
    user: one(users, {
        fields: [feeds.uid],
        references: [users.id],
    }),
    comments: many(comments),
}));

export const momentsRelations = relations(moments, ({ one }) => ({
    user: one(users, {
        fields: [moments.uid],
        references: [users.id],
    })
}));

export const commentsRelations = relations(comments, ({ one }) => ({
    feed: one(feeds, {
        fields: [comments.feedId],
        references: [feeds.id],
    }),
    user: one(users, {
        fields: [comments.userId],
        references: [users.id],
    }),
}));

export const hashtagsRelations = relations(hashtags, ({ many }) => ({
    feeds: many(feedHashtags),
    entities: many(entityHashtags),
}));

export const feedHashtagsRelations = relations(feedHashtags, ({ one }) => ({
    feed: one(feeds, {
        fields: [feedHashtags.feedId],
        references: [feeds.id],
    }),
    hashtag: one(hashtags, {
        fields: [feedHashtags.hashtagId],
        references: [hashtags.id],
    }),
}));

export const entityHashtagsRelations = relations(entityHashtags, ({ one }) => ({
    entity: one(entities, {
        fields: [entityHashtags.entityId],
        references: [entities.id],
    }),
    hashtag: one(hashtags, {
        fields: [entityHashtags.hashtagId],
        references: [hashtags.id],
    }),
}));