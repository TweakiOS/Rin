import { Hono } from "hono";
import type { Env, Variables } from "../core/hono-types";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
// desc 若不再使用可去掉

import {
    entities,
    entityRelations,
    entityHashtags,
    hashtags,
    feedHashtags,
    feedEntities,
    feeds,
} from "../db/schema";

export function EntityService() {
    const app = new Hono<{ Bindings: Env; Variables: Variables }>();

    // 获取实体列表（支持 type 过滤）
    app.get("/", async (c) => {
        const db = c.get("db");
        const type = c.req.query("type"); // concept | component | company | product
        const list = await db.query.entities.findMany({
            where: type ? eq(entities.type, type) : undefined,
            orderBy: [desc(entities.sort_order), desc(entities.id)],
        });
        return c.json(list);
    });

    // 获取单个实体 + 关系 + 挂载标签 + 相关文章
    app.get("/:slug", async (c) => {
        const db = c.get("db");
        const slug = c.req.param("slug");

        const entity = await db.query.entities.findFirst({
            where: eq(entities.slug, slug),
        });
        if (!entity) return c.text("Not found", 404);

        // 出边关系
        const outgoing = await db.query.entityRelations.findMany({
            where: eq(entityRelations.from_id, entity.id),
            with: { to: true },
        });
        // 入边关系
        const incoming = await db.query.entityRelations.findMany({
            where: eq(entityRelations.to_id, entity.id),
            with: { from: true },
        });

        // 挂载的标签（entity_hashtags）
        const tagLinks = await db
            .select({
                id: hashtags.id,
                name: hashtags.name,
            })
            .from(entityHashtags)
            .innerJoin(hashtags, eq(entityHashtags.hashtagId, hashtags.id))
            .where(eq(entityHashtags.entityId, entity.id));

        const tagIds = tagLinks.map((t) => t.id);

        // 文章来源 1：标签下的已发布文章
        const feedMap = new Map<
            number,
            {
                id: number;
                title: string | null;
                alias: string | null;
                summary: string;
                createdAt: Date | number | null;
            }
        >();

        if (tagIds.length > 0) {
            const byTags = await db
                .select({
                    id: feeds.id,
                    title: feeds.title,
                    alias: feeds.alias,
                    summary: feeds.summary,
                    createdAt: feeds.createdAt,
                })
                .from(feedHashtags)
                .innerJoin(feeds, eq(feedHashtags.feedId, feeds.id))
                .where(
                    and(
                        inArray(feedHashtags.hashtagId, tagIds),
                        eq(feeds.draft, 0),
                        eq(feeds.listed, 1),
                    ),
                );

            for (const row of byTags) {
                feedMap.set(row.id, row);
            }
        }

        // 文章来源 2：原 feed_entities 直连（保留兼容）
        const byEntity = await db
            .select({
                id: feeds.id,
                title: feeds.title,
                alias: feeds.alias,
                summary: feeds.summary,
                createdAt: feeds.createdAt,
            })
            .from(feedEntities)
            .innerJoin(feeds, eq(feedEntities.feedId, feeds.id))
            .where(
                and(
                    eq(feedEntities.entityId, entity.id),
                    eq(feeds.draft, 0),
                    eq(feeds.listed, 1),
                ),
            )
            .limit(50);

        for (const row of byEntity) {
            feedMap.set(row.id, row);
        }

        const relatedFeeds = [...feedMap.values()].sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
            const tb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
            return tb - ta;
        }).slice(0, 50);

        return c.json({
            ...entity,
            outgoing: outgoing.map((r) => ({ type: r.relation_type, entity: r.to })),
            incoming: incoming.map((r) => ({ type: r.relation_type, entity: r.from })),
            hashtags: tagLinks,
            feeds: relatedFeeds,
        });
    });

    // 创建实体（仅管理员）
    app.post("/", async (c) => {
        const admin = c.get("admin");
        if (!admin) {
            return c.text("Permission denied", 403);
        }

        const db = c.get("db");
        const body = await c.req.json();

        // 简单校验
        if (!body.slug || !body.name || !body.type) {
            return c.text("slug, name, type are required", 400);
        }

        const [result] = await db.insert(entities).values({
            slug: body.slug,
            name: body.name,
            name_cn: body.name_cn ?? null,
            type: body.type,
            description: body.description ?? "",
            summary: body.summary ?? "",
            data: body.data ?? {},
            parent_id: body.parent_id ?? null,
            sort_order: body.sort_order ?? 0,
        }).returning();

        return c.json(result);
    });
    // 更多 CRUD、关系管理可继续按同样模式加...

    return app;
}
