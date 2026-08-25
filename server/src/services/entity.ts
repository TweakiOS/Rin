import { Hono } from "hono";
import type { Env, Variables } from "../core/hono-types";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
    entities,
    entityRelations,
    entityHashtags,
    hashtags,
    feedHashtags,
    feedEntities,
    feeds,
} from "../db/schema";

const ALLOWED_TYPES = new Set(["concept", "component", "company", "product"]);

export function EntityService() {
    const app = new Hono<{ Bindings: Env; Variables: Variables }>();

    // GET /entity  列表（游客只看 enabled=1；管理员可看全部，?include_disabled=1）
    app.get("/", async (c) => {
        const db = c.get("db");
        const admin = c.get("admin");
        const type = c.req.query("type");
        const includeDisabled = c.req.query("include_disabled") === "1";

        const conditions = [];
        if (type) conditions.push(eq(entities.type, type));
        if (!admin || !includeDisabled) {
            conditions.push(eq(entities.enabled, 1));
        }

        const list = await db.query.entities.findMany({
            where: conditions.length
                ? conditions.length === 1
                    ? conditions[0]
                    : and(...conditions)
                : undefined,
            orderBy: [desc(entities.sort_order), desc(entities.id)],
        });
        return c.json(list);
    });

    // GET /entity/:slug
    app.get("/:slug", async (c) => {
        const db = c.get("db");
        const admin = c.get("admin");
        const slug = c.req.param("slug");

        const entity = await db.query.entities.findFirst({
            where: eq(entities.slug, slug),
        });
        if (!entity) return c.text("Not found", 404);

        // 非管理员不能看已禁用节点
        if (!admin && entity.enabled === 0) {
            return c.text("Not found", 404);
        }

        const outgoing = await db.query.entityRelations.findMany({
            where: eq(entityRelations.from_id, entity.id),
            with: { to: true },
        });
        const incoming = await db.query.entityRelations.findMany({
            where: eq(entityRelations.to_id, entity.id),
            with: { from: true },
        });

        const tagLinks = await db
            .select({ id: hashtags.id, name: hashtags.name })
            .from(entityHashtags)
            .innerJoin(hashtags, eq(entityHashtags.hashtagId, hashtags.id))
            .where(eq(entityHashtags.entityId, entity.id));

        const tagIds = tagLinks.map((t) => t.id);
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
            for (const row of byTags) feedMap.set(row.id, row);
        }

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
        for (const row of byEntity) feedMap.set(row.id, row);

        const relatedFeeds = [...feedMap.values()]
            .sort((a, b) => {
                const ta = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
                const tb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
                return tb - ta;
            })
            .slice(0, 50);

        return c.json({
            ...entity,
            outgoing: outgoing.map((r) => ({ type: r.relation_type, entity: r.to })),
            incoming: incoming.map((r) => ({ type: r.relation_type, entity: r.from })),
            hashtags: tagLinks,
            feeds: relatedFeeds,
        });
    });

    // POST /entity  创建（管理员）
    app.post("/", async (c) => {
        const admin = c.get("admin");
        if (!admin) return c.text("Permission denied", 403);

        const db = c.get("db");
        const body = await c.req.json();

        if (!body.slug || !body.name || !body.type) {
            return c.text("slug, name, type are required", 400);
        }
        if (!ALLOWED_TYPES.has(body.type)) {
            return c.text("invalid type", 400);
        }

        const [result] = await db
            .insert(entities)
            .values({
                slug: String(body.slug).trim(),
                name: String(body.name).trim(),
                name_cn: body.name_cn ?? null,
                type: body.type,
                description: body.description ?? "",
                summary: body.summary ?? "",
                data: body.data ?? {},
                parent_id: body.parent_id ?? null,
                sort_order: Number(body.sort_order) || 0,
                enabled: body.enabled === 0 ? 0 : 1,
            })
            .returning();

        return c.json(result);
    });

    // PUT /entity/:slug  更新（管理员）—— 描述 / 禁用 / 排序等
    app.put("/:slug", async (c) => {
        const admin = c.get("admin");
        if (!admin) return c.text("Permission denied", 403);

        const db = c.get("db");
        const slug = c.req.param("slug");
        const body = await c.req.json();

        const existing = await db.query.entities.findFirst({
            where: eq(entities.slug, slug),
        });
        if (!existing) return c.text("Not found", 404);

        const patch: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (body.name !== undefined) patch.name = String(body.name).trim();
        if (body.name_cn !== undefined) patch.name_cn = body.name_cn ? String(body.name_cn).trim() : null;
        if (body.type !== undefined) {
            if (!ALLOWED_TYPES.has(body.type)) return c.text("invalid type", 400);
            patch.type = body.type;
        }
        if (body.description !== undefined) patch.description = String(body.description ?? "");
        if (body.summary !== undefined) patch.summary = String(body.summary ?? "");
        if (body.data !== undefined) patch.data = body.data;
        if (body.parent_id !== undefined) {
            patch.parent_id = body.parent_id === null || body.parent_id === "" ? null : Number(body.parent_id);
        }
        if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
        if (body.enabled !== undefined) patch.enabled = body.enabled === 0 || body.enabled === false ? 0 : 1;

        // 不允许通过此接口改 slug（避免外链失效）；需要改 slug 可另做迁移接口

        const [updated] = await db
            .update(entities)
            .set(patch as any)
            .where(eq(entities.id, existing.id))
            .returning();

        return c.json(updated);
    });

    // POST /entity/:slug/toggle  快捷启用/禁用
    app.post("/:slug/toggle", async (c) => {
        const admin = c.get("admin");
        if (!admin) return c.text("Permission denied", 403);

        const db = c.get("db");
        const slug = c.req.param("slug");
        const existing = await db.query.entities.findFirst({
            where: eq(entities.slug, slug),
        });
        if (!existing) return c.text("Not found", 404);

        const next = existing.enabled === 1 ? 0 : 1;
        const [updated] = await db
            .update(entities)
            .set({ enabled: next, updatedAt: new Date() })
            .where(eq(entities.id, existing.id))
            .returning();

        return c.json(updated);
    });

    return app;
}