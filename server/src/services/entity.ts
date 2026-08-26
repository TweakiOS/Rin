import { Hono } from "hono";
import type { Env, Variables } from "../core/hono-types";
import { eq, and, or, desc, asc, inArray, like } from "drizzle-orm";
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
const RELATION_TYPES = new Set([
    "uses",
    "supplier",
    "product_of",
    "competitor",
    "related",
]);

type EntityRow = typeof entities.$inferSelect;

function deny(c: any, message: string, status = 403) {
    return c.json({ error: message }, status);
}

function buildTree(list: EntityRow[]) {
    const nodes = list.map((e) => ({ ...e, children: [] as any[] }));
    const map = new Map<number, (typeof nodes)[number]>();
    for (const node of nodes) map.set(node.id, node);

    const roots: typeof nodes = [];
    for (const node of nodes) {
        if (node.parent_id && map.has(node.parent_id)) {
            map.get(node.parent_id)!.children.push(node);
        } else {
            roots.push(node);
        }
    }
    return roots;
}

async function wouldCreateCycle(
    db: any,
    entityId: number,
    newParentId: number | null,
) {
    if (newParentId == null) return false;
    if (newParentId === entityId) return true;

    let cursor: number | null = newParentId;
    const seen = new Set<number>();
    while (cursor != null) {
        if (cursor === entityId) return true;
        if (seen.has(cursor)) return true;
        seen.add(cursor);
        const row = await db.query.entities.findFirst({
            where: eq(entities.id, cursor),
            columns: { parent_id: true },
        });
        cursor = row?.parent_id ?? null;
    }
    return false;
}

async function findBySlug(db: any, slug: string) {
    return db.query.entities.findFirst({
        where: eq(entities.slug, slug),
    });
}

export function EntityService() {
    const app = new Hono<{ Bindings: Env; Variables: Variables }>();

    // GET /entity/search  必须放在 /:slug 之前
    app.get("/search", async (c) => {
        const db = c.get("db");
        const admin = c.get("admin");
        const q = (c.req.query("q") || "").trim();
        const limit = Math.min(Number(c.req.query("limit")) || 20, 50);
        if (!q) return c.json([]);

        const safe = q.replace(/[%_]/g, "");
        if (!safe) return c.json([]);
        const pattern = `%${safe}%`;

        const conditions = [
            or(
                like(entities.slug, pattern),
                like(entities.name, pattern),
                like(entities.name_cn, pattern),
            ),
        ];
        if (!admin) conditions.push(eq(entities.enabled, 1));

        const list = await db
            .select({
                id: entities.id,
                slug: entities.slug,
                name: entities.name,
                name_cn: entities.name_cn,
                type: entities.type,
                enabled: entities.enabled,
                parent_id: entities.parent_id,
            })
            .from(entities)
            .where(and(...conditions))
            .orderBy(desc(entities.sort_order), desc(entities.id))
            .limit(limit);

        return c.json(list);
    });

    // GET /entity/tree
    app.get("/tree", async (c) => {
        const db = c.get("db");
        const admin = c.get("admin");
        const includeDisabled = c.req.query("include_disabled") === "1";

        const list = await db.query.entities.findMany({
            where: !admin || !includeDisabled ? eq(entities.enabled, 1) : undefined,
            orderBy: [asc(entities.sort_order), asc(entities.id)],
        });
        return c.json(buildTree(list));
    });

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

    // GET /entity/:slug/impact
    app.get("/:slug/impact", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const entity = await findBySlug(db, c.req.param("slug"));
        if (!entity) return deny(c, "Not found", 404);

        const children = await db.query.entities.findMany({
            where: eq(entities.parent_id, entity.id),
            columns: {
                id: true,
                slug: true,
                name: true,
                name_cn: true,
                type: true,
            },
        });
        const rels = await db.query.entityRelations.findMany({
            where: or(
                eq(entityRelations.from_id, entity.id),
                eq(entityRelations.to_id, entity.id),
            ),
        });
        const tags = await db.query.entityHashtags.findMany({
            where: eq(entityHashtags.entityId, entity.id),
        });
        const linkedFeeds = await db.query.feedEntities.findMany({
            where: eq(feedEntities.entityId, entity.id),
        });

        return c.json({
            entity: {
                id: entity.id,
                slug: entity.slug,
                name: entity.name,
                name_cn: entity.name_cn,
            },
            children,
            relations: rels.length,
            hashtags: tags.length,
            feeds: linkedFeeds.length,
        });
    });

    // GET /entity/:slug
    app.get("/:slug", async (c) => {
        const db = c.get("db");
        const admin = c.get("admin");
        const slug = c.req.param("slug");

        const entity = await findBySlug(db, slug);
        if (!entity) return c.text("Not found", 404);

        if (!admin && entity.enabled === 0) {
            return c.text("Not found", 404);
        }

        const parent = entity.parent_id
            ? await db.query.entities.findFirst({
                where: eq(entities.id, entity.parent_id),
            })
            : null;

        const children = await db.query.entities.findMany({
            where: eq(entities.parent_id, entity.id),
            orderBy: [asc(entities.sort_order), asc(entities.id)],
        });

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
            parent: parent
                ? {
                    id: parent.id,
                    slug: parent.slug,
                    name: parent.name,
                    name_cn: parent.name_cn,
                    type: parent.type,
                    enabled: parent.enabled,
                }
                : null,
            children: children.map((child) => ({
                id: child.id,
                slug: child.slug,
                name: child.name,
                name_cn: child.name_cn,
                type: child.type,
                enabled: child.enabled,
            })),
            outgoing: outgoing.map((r) => ({
                id: r.id,
                type: r.relation_type,
                entity: r.to,
            })),
            incoming: incoming.map((r) => ({
                id: r.id,
                type: r.relation_type,
                entity: r.from,
            })),
            hashtags: tagLinks,
            feeds: relatedFeeds,
        });
    });

    // POST /entity  创建（管理员）
    app.post("/", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const body = await c.req.json();

        if (!body.slug || !body.name || !body.type) {
            return deny(c, "slug, name, type are required", 400);
        }
        if (!ALLOWED_TYPES.has(body.type)) {
            return deny(c, "invalid type", 400);
        }

        const slug = String(body.slug).trim();
        const existed = await findBySlug(db, slug);
        if (existed) return deny(c, "slug already exists", 409);

        let parentId: number | null = null;
        if (body.parent_id != null && body.parent_id !== "") {
            parentId = Number(body.parent_id);
        } else if (body.parent_slug) {
            const parent = await findBySlug(db, String(body.parent_slug));
            if (!parent) return deny(c, "parent not found", 404);
            parentId = parent.id;
        }

        const [result] = await db
            .insert(entities)
            .values({
                slug,
                name: String(body.name).trim(),
                name_cn: body.name_cn ?? null,
                type: body.type,
                description: body.description ?? "",
                summary: body.summary ?? "",
                data: body.data ?? {},
                parent_id: parentId,
                sort_order: Number(body.sort_order) || 0,
                enabled: body.enabled === 0 ? 0 : 1,
            })
            .returning();

        return c.json(result);
    });

    // PUT /entity/:slug  更新（管理员）
    app.put("/:slug", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const slug = c.req.param("slug");
        const body = await c.req.json();

        const existing = await findBySlug(db, slug);
        if (!existing) return deny(c, "Not found", 404);

        const patch: Record<string, unknown> = {
            updatedAt: new Date(),
        };

        if (body.name !== undefined) patch.name = String(body.name).trim();
        if (body.name_cn !== undefined) {
            patch.name_cn = body.name_cn ? String(body.name_cn).trim() : null;
        }
        if (body.type !== undefined) {
            if (!ALLOWED_TYPES.has(body.type)) return deny(c, "invalid type", 400);
            patch.type = body.type;
        }
        if (body.description !== undefined) patch.description = String(body.description ?? "");
        if (body.summary !== undefined) patch.summary = String(body.summary ?? "");
        if (body.data !== undefined) patch.data = body.data;
        if (body.parent_id !== undefined || body.parent_slug !== undefined) {
            let parentId: number | null = null;
            if (body.parent_slug) {
                const parent = await findBySlug(db, String(body.parent_slug));
                if (!parent) return deny(c, "parent not found", 404);
                parentId = parent.id;
            } else if (body.parent_id !== null && body.parent_id !== "") {
                parentId = Number(body.parent_id);
            }
            if (await wouldCreateCycle(db, existing.id, parentId)) {
                return deny(c, "cycle detected", 400);
            }
            patch.parent_id = parentId;
        }
        if (body.sort_order !== undefined) patch.sort_order = Number(body.sort_order) || 0;
        if (body.enabled !== undefined) {
            patch.enabled = body.enabled === 0 || body.enabled === false ? 0 : 1;
        }

        const [updated] = await db
            .update(entities)
            .set(patch as any)
            .where(eq(entities.id, existing.id))
            .returning();

        return c.json(updated);
    });

    // POST /entity/:slug/toggle
    app.post("/:slug/toggle", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const existing = await findBySlug(db, c.req.param("slug"));
        if (!existing) return deny(c, "Not found", 404);

        const next = existing.enabled === 1 ? 0 : 1;
        const [updated] = await db
            .update(entities)
            .set({ enabled: next, updatedAt: new Date() })
            .where(eq(entities.id, existing.id))
            .returning();

        return c.json(updated);
    });

    // PUT /entity/:slug/parent
    app.put("/:slug/parent", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const body = await c.req.json();
        const entity = await findBySlug(db, c.req.param("slug"));
        if (!entity) return deny(c, "Not found", 404);

        let parentId: number | null = null;
        if (body.parent_slug) {
            const parent = await findBySlug(db, String(body.parent_slug));
            if (!parent) return deny(c, "parent not found", 404);
            parentId = parent.id;
        } else if (body.parent_id != null && body.parent_id !== "") {
            parentId = Number(body.parent_id);
        }

        if (await wouldCreateCycle(db, entity.id, parentId)) {
            return deny(c, "cycle detected", 400);
        }

        const [updated] = await db
            .update(entities)
            .set({ parent_id: parentId, updatedAt: new Date() })
            .where(eq(entities.id, entity.id))
            .returning();

        return c.json(updated);
    });

    // POST /entity/:slug/relations
    app.post("/:slug/relations", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const body = await c.req.json();
        const type = String(body.relation_type || "");
        if (!RELATION_TYPES.has(type)) {
            return deny(c, "invalid relation_type", 400);
        }

        const from = await findBySlug(db, c.req.param("slug"));
        const to = body.to_slug
            ? await findBySlug(db, String(body.to_slug))
            : body.to_id
                ? await db.query.entities.findFirst({
                    where: eq(entities.id, Number(body.to_id)),
                })
                : null;

        if (!from || !to) return deny(c, "entity not found", 404);
        if (from.id === to.id) return deny(c, "cannot relate to self", 400);

        const exists = await db.query.entityRelations.findFirst({
            where: and(
                eq(entityRelations.from_id, from.id),
                eq(entityRelations.to_id, to.id),
                eq(entityRelations.relation_type, type),
            ),
        });
        if (exists) return deny(c, "relation already exists", 409);

        const [row] = await db
            .insert(entityRelations)
            .values({
                from_id: from.id,
                to_id: to.id,
                relation_type: type,
            })
            .returning();

        return c.json(row);
    });

    // DELETE /entity/:slug/relations/:id
    app.delete("/:slug/relations/:id", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const from = await findBySlug(db, c.req.param("slug"));
        if (!from) return deny(c, "Not found", 404);

        const relId = Number(c.req.param("id"));
        if (!Number.isFinite(relId)) return deny(c, "invalid relation id", 400);

        await db.delete(entityRelations).where(
            and(
                eq(entityRelations.id, relId),
                or(
                    eq(entityRelations.from_id, from.id),
                    eq(entityRelations.to_id, from.id),
                ),
            ),
        );

        return c.json({ ok: true });
    });

    // POST /entity/:slug/hashtags
    app.post("/:slug/hashtags", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const entity = await findBySlug(db, c.req.param("slug"));
        if (!entity) return deny(c, "Not found", 404);

        const body = await c.req.json();
        const name = String(body.name || "")
            .trim()
            .replace(/^#/, "");
        if (!name) return deny(c, "hashtag name required", 400);

        let tag = await db.query.hashtags.findFirst({
            where: eq(hashtags.name, name),
        });
        if (!tag) {
            const [inserted] = await db
                .insert(hashtags)
                .values({ name })
                .returning();
            tag = inserted;
        }

        const exists = await db.query.entityHashtags.findFirst({
            where: and(
                eq(entityHashtags.entityId, entity.id),
                eq(entityHashtags.hashtagId, tag.id),
            ),
        });
        if (!exists) {
            await db.insert(entityHashtags).values({
                entityId: entity.id,
                hashtagId: tag.id,
            });
        }

        return c.json({ id: tag.id, name: tag.name });
    });

    // DELETE /entity/:slug/hashtags/:name
    app.delete("/:slug/hashtags/:name", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const entity = await findBySlug(db, c.req.param("slug"));
        if (!entity) return deny(c, "Not found", 404);

        const name = decodeURIComponent(c.req.param("name")).replace(/^#/, "");
        const tag = await db.query.hashtags.findFirst({
            where: eq(hashtags.name, name),
        });
        if (!tag) return c.json({ ok: true });

        await db.delete(entityHashtags).where(
            and(
                eq(entityHashtags.entityId, entity.id),
                eq(entityHashtags.hashtagId, tag.id),
            ),
        );

        return c.json({ ok: true });
    });

    // POST /entity/:slug/merge   body: { source_slug }
    app.post("/:slug/merge", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const target = await findBySlug(db, c.req.param("slug"));
        const body = await c.req.json();
        const source = await findBySlug(db, String(body.source_slug || ""));
        if (!target || !source) return deny(c, "entity not found", 404);
        if (target.id === source.id) return deny(c, "cannot merge itself", 400);

        const sourceRels = await db.query.entityRelations.findMany({
            where: or(
                eq(entityRelations.from_id, source.id),
                eq(entityRelations.to_id, source.id),
            ),
        });
        for (const rel of sourceRels) {
            const fromId = rel.from_id === source.id ? target.id : rel.from_id;
            const toId = rel.to_id === source.id ? target.id : rel.to_id;
            if (fromId === toId) {
                await db.delete(entityRelations).where(eq(entityRelations.id, rel.id));
                continue;
            }
            const dup = await db.query.entityRelations.findFirst({
                where: and(
                    eq(entityRelations.from_id, fromId),
                    eq(entityRelations.to_id, toId),
                    eq(entityRelations.relation_type, rel.relation_type),
                ),
            });
            if (dup) {
                await db.delete(entityRelations).where(eq(entityRelations.id, rel.id));
            } else {
                await db
                    .update(entityRelations)
                    .set({ from_id: fromId, to_id: toId })
                    .where(eq(entityRelations.id, rel.id));
            }
        }

        const sourceTags = await db.query.entityHashtags.findMany({
            where: eq(entityHashtags.entityId, source.id),
        });
        for (const link of sourceTags) {
            const dup = await db.query.entityHashtags.findFirst({
                where: and(
                    eq(entityHashtags.entityId, target.id),
                    eq(entityHashtags.hashtagId, link.hashtagId),
                ),
            });
            if (dup) {
                await db.delete(entityHashtags).where(
                    and(
                        eq(entityHashtags.entityId, source.id),
                        eq(entityHashtags.hashtagId, link.hashtagId),
                    ),
                );
            } else {
                await db
                    .update(entityHashtags)
                    .set({ entityId: target.id })
                    .where(
                        and(
                            eq(entityHashtags.entityId, source.id),
                            eq(entityHashtags.hashtagId, link.hashtagId),
                        ),
                    );
            }
        }

        const sourceFeeds = await db.query.feedEntities.findMany({
            where: eq(feedEntities.entityId, source.id),
        });
        for (const link of sourceFeeds) {
            const dup = await db.query.feedEntities.findFirst({
                where: and(
                    eq(feedEntities.feedId, link.feedId),
                    eq(feedEntities.entityId, target.id),
                ),
            });
            if (dup) {
                await db.delete(feedEntities).where(
                    and(
                        eq(feedEntities.feedId, link.feedId),
                        eq(feedEntities.entityId, source.id),
                    ),
                );
            } else {
                await db
                    .update(feedEntities)
                    .set({ entityId: target.id })
                    .where(
                        and(
                            eq(feedEntities.feedId, link.feedId),
                            eq(feedEntities.entityId, source.id),
                        ),
                    );
            }
        }

        await db
            .update(entities)
            .set({ parent_id: target.id, updatedAt: new Date() })
            .where(eq(entities.parent_id, source.id));

        if (target.parent_id === source.id) {
            await db
                .update(entities)
                .set({ parent_id: source.parent_id, updatedAt: new Date() })
                .where(eq(entities.id, target.id));
        }

        await db.delete(entities).where(eq(entities.id, source.id));

        return c.json({
            ok: true,
            kept: target.slug,
            deleted: source.slug,
        });
    });

    // DELETE /entity/:slug?mode=reparent|orphan|forbid
    app.delete("/:slug", async (c) => {
        const admin = c.get("admin");
        if (!admin) return deny(c, "Permission denied");

        const db = c.get("db");
        const mode = c.req.query("mode") || "forbid";
        const entity = await findBySlug(db, c.req.param("slug"));
        if (!entity) return deny(c, "Not found", 404);

        const children = await db.query.entities.findMany({
            where: eq(entities.parent_id, entity.id),
        });

        if (children.length && mode === "forbid") {
            return c.json(
                {
                    error: "has_children",
                    children: children.map((x) => ({
                        id: x.id,
                        slug: x.slug,
                        name: x.name,
                    })),
                },
                409,
            );
        }

        if (mode === "reparent") {
            await db
                .update(entities)
                .set({ parent_id: entity.parent_id, updatedAt: new Date() })
                .where(eq(entities.parent_id, entity.id));
        } else if (mode === "orphan") {
            await db
                .update(entities)
                .set({ parent_id: null, updatedAt: new Date() })
                .where(eq(entities.parent_id, entity.id));
        }

        await db.delete(entities).where(eq(entities.id, entity.id));
        return c.json({ ok: true, deleted: entity.slug });
    });

    return app;
}