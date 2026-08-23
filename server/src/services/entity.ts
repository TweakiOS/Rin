import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import type { Env, Variables } from "../core/hono-types";
import { entities, entityRelations, feedEntities, feeds } from "../db/schema";
import { adminOnly } from "../core/hono-middleware"; // 按实际导出路径调整

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

    // 获取单个实体 + 关联 + 相关文章
    app.get("/:slug", async (c) => {
        const db = c.get("db");
        const slug = c.req.param("slug");

        const entity = await db.query.entities.findFirst({
            where: eq(entities.slug, slug),
            with: {
                // 可按需扩展
            },
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

        // 关联文章（只返回已发布）
        const relatedFeeds = await db
            .select({
                id: feeds.id,
                title: feeds.title,
                alias: feeds.alias,
                summary: feeds.summary,
                createdAt: feeds.createdAt,
            })
            .from(feedEntities)
            .innerJoin(feeds, eq(feedEntities.feedId, feeds.id))
            .where(and(
                eq(feedEntities.entityId, entity.id),
                eq(feeds.draft, 0),
                eq(feeds.listed, 1),
            ))
            .orderBy(desc(feeds.createdAt))
            .limit(20);

        return c.json({
            ...entity,
            outgoing: outgoing.map(r => ({ type: r.relation_type, entity: r.to })),
            incoming: incoming.map(r => ({ type: r.relation_type, entity: r.from })),
            feeds: relatedFeeds,
        });
    });

    // 创建实体（仅管理员）
    app.post("/", adminOnly(async (c) => {
        const db = c.get("db");
        const body = await c.req.json();
        // 简单校验，实际可加 zod
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
    }));

    // 更多 CRUD、关系管理可继续按同样模式加...

    return app;
}
