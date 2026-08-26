import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { DB } from "../core/hono-types";
import { profileAsync } from "../core/server-timing";
import {
    feedHashtags,
    hashtags,
    entities,
    entityHashtags,
    feedEntities,
    entityRelations,
} from "../db/schema";
import type { AppContext } from "../core/hono-types";

export function TagService(): Hono {
    const app = new Hono();

    // GET /tag
    app.get("/", async (c: AppContext) => {
        const db = c.get("db");

        const tag_list = await profileAsync(c, "tag_list_db", () =>
            db.query.hashtags.findMany({
                with: {
                    feeds: { columns: { feedId: true } },
                },
            }),
        );

        const result = tag_list.map((tag: any) => ({
            ...tag,
            feeds: tag.feeds.length,
        }));

        return c.json(result);
    });

    // POST /tag/sync-knowledge  —— 管理员：全量同步已有文章标签到知识树
    // 必须放在 /:name 之前
    app.post("/sync-knowledge", async (c: AppContext) => {
        const admin = c.get("admin");
        if (!admin) return c.text("Permission denied", 403);

        const db = c.get("db");
        const result = await profileAsync(c, "tag_sync_knowledge", () =>
            syncAllFeedsToKnowledgeTree(db),
        );
        return c.json(result);
    });

    // GET /tag/:name
    app.get("/:name", async (c: AppContext) => {
        const db = c.get("db");
        const admin = c.get("admin");
        const nameDecoded = decodeURI(c.req.param("name"));

        const tag = await profileAsync(c, "tag_detail_db", () =>
            db.query.hashtags.findFirst({
                where: eq(hashtags.name, nameDecoded),
                with: {
                    feeds: {
                        with: {
                            feed: {
                                columns: {
                                    id: true,
                                    title: true,
                                    summary: true,
                                    content: true,
                                    createdAt: true,
                                    updatedAt: true,
                                    draft: false,
                                    listed: false,
                                },
                                with: {
                                    user: {
                                        columns: {
                                            id: true,
                                            username: true,
                                            avatar: true,
                                        },
                                    },
                                    hashtags: {
                                        columns: {},
                                        with: {
                                            hashtag: {
                                                columns: {
                                                    id: true,
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                                where: (feeds: any) =>
                                    admin
                                        ? undefined
                                        : and(eq(feeds.draft, 0), eq(feeds.listed, 1)),
                            } as any,
                        },
                    },
                },
            }),
        );

        const tagFeeds = tag?.feeds
            .map((tagFeed: any) => {
                if (!tagFeed.feed) return null;
                return {
                    ...tagFeed.feed,
                    hashtags: tagFeed.feed.hashtags.map(
                        (hashtag: any) => hashtag.hashtag,
                    ),
                };
            })
            .filter((feed: any) => feed !== null);

        if (!tag) {
            return c.text("Not found", 404);
        }

        return c.json({ ...tag, feeds: tagFeeds });
    });

    return app;
}

/**
 * 把标签绑定到文章，并自动同步到知识树（含简单父子关系）
 */
export async function bindTagToPost(db: DB, feedId: number, tags: string[]) {
    await db.delete(feedHashtags).where(eq(feedHashtags.feedId, feedId));

    const normalizedTags = [
        ...new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
    ];
    if (normalizedTags.length === 0) {
        await db.delete(feedEntities).where(eq(feedEntities.feedId, feedId));
        return;
    }

    const existingTags = await db
        .select({ id: hashtags.id, name: hashtags.name })
        .from(hashtags)
        .where(inArray(hashtags.name, normalizedTags));

    const tagIds = new Map(existingTags.map((tag) => [tag.name, tag.id]));
    const missingTags = normalizedTags.filter((tag) => !tagIds.has(tag));

    if (missingTags.length > 0) {
        const insertedTags = await db
            .insert(hashtags)
            .values(missingTags.map((name) => ({ name })))
            .returning({ id: hashtags.id, name: hashtags.name });
        for (const tag of insertedTags) {
            tagIds.set(tag.name, tag.id);
        }
    }

    await db.insert(feedHashtags).values(
        normalizedTags.map((name) => ({
            feedId,
            hashtagId: tagIds.get(name)!,
        })),
    );

    await syncTagsToKnowledgeTree(db, feedId, normalizedTags, tagIds);
}

/**
 * 标签 → 知识树自动同步 + 简单父子关系
 */
type KnowledgeEntity = {
    id: number;
    slug: string;
    type: string;
    name: string;
    name_cn: string | null;
    enabled: number;
    data: unknown;
};

function readAliases(data: unknown): string[] {
    if (!data || typeof data !== "object" || Array.isArray(data)) return [];
    const aliases = (data as { aliases?: unknown }).aliases;
    if (!Array.isArray(aliases)) return [];
    return aliases.map((item) => String(item).trim()).filter(Boolean);
}

function norm(value: string): string {
    return value.trim().toLowerCase();
}

function identityKeys(entity: KnowledgeEntity): string[] {
    return [
        ...new Set(
            [entity.slug, entity.name, entity.name_cn, ...readAliases(entity.data)]
                .filter((item): item is string => Boolean(item && item.trim()))
                .map(norm),
        ),
    ];
}

function pickPreferredEntity(list: KnowledgeEntity[]): KnowledgeEntity | null {
    if (list.length === 0) return null;
    const enabled = list.filter((item) => item.enabled !== 0);
    const pool = enabled.length > 0 ? enabled : list;
    return [...pool].sort((a, b) => a.id - b.id)[0] ?? null;
}

/**
 * 解析顺序：
 * 1. 这个 hashtag 已经挂过的实体（合并后标签会迁到保留节点）
 * 2. slug / name / name_cn / data.aliases
 * 3. 都没有再新建
 */
async function resolveEntityForTag(
    db: DB,
    tagName: string,
    hashtagId: number,
    cache: Map<string, KnowledgeEntity>,
): Promise<KnowledgeEntity | null> {
    const slug = toSlug(tagName);
    if (!slug) return null;

    const linkedRows = await db
        .select({
            id: entities.id,
            slug: entities.slug,
            type: entities.type,
            name: entities.name,
            name_cn: entities.name_cn,
            enabled: entities.enabled,
            data: entities.data,
        })
        .from(entityHashtags)
        .innerJoin(entities, eq(entityHashtags.entityId, entities.id))
        .where(eq(entityHashtags.hashtagId, hashtagId));

    const linked = pickPreferredEntity(linkedRows as KnowledgeEntity[]);
    if (linked) {
        cache.set(linked.slug, linked);
        return linked;
    }

    const keys = [...new Set([slug, tagName, norm(tagName)].filter(Boolean))];
    for (const key of keys) {
        const hit = cache.get(key) || cache.get(norm(key));
        if (hit) return hit;
    }

    const existing = await db.query.entities.findFirst({
        where: or(
            eq(entities.slug, slug),
            eq(entities.name, tagName),
            eq(entities.name_cn, tagName),
        ),
    });
    if (existing) {
        const row = existing as KnowledgeEntity;
        for (const key of identityKeys(row)) cache.set(key, row);
        cache.set(row.slug, row);
        return row;
    }

    // 别名命中：节点不多，全表扫 aliases 足够
    const all = await db
        .select({
            id: entities.id,
            slug: entities.slug,
            type: entities.type,
            name: entities.name,
            name_cn: entities.name_cn,
            enabled: entities.enabled,
            data: entities.data,
        })
        .from(entities);

    const aliasHits: KnowledgeEntity[] = [];
    const wanted = new Set([norm(slug), norm(tagName)]);
    for (const row of all as KnowledgeEntity[]) {
        for (const key of identityKeys(row)) {
            cache.set(key, row);
            if (wanted.has(key)) aliasHits.push(row);
        }
        cache.set(row.slug, row);
    }

    const aliased = pickPreferredEntity(aliasHits);
    if (aliased) return aliased;

    const type = guessEntityType(tagName);
    const [inserted] = await db
        .insert(entities)
        .values({
            slug,
            name: tagName,
            name_cn: containsChinese(tagName) ? tagName : null,
            type,
            description: "",
            summary: "",
            data: { aliases: [tagName] },
            sort_order: 10,
        })
        .returning();

    if (!inserted) return null;

    const created = inserted as KnowledgeEntity;
    for (const key of identityKeys(created)) cache.set(key, created);
    cache.set(created.slug, created);
    return created;
}

/**
 * 标签 → 知识树自动同步 + 简单父子关系
 * 不再先清空 feed_entities，避免把合并后的关联拆掉再按旧 slug 重建
 */
async function syncTagsToKnowledgeTree(
    db: DB,
    feedId: number,
    tags: string[],
    tagIds: Map<string, number>,
) {
    const entityMap = new Map<
        string,
        { id: number; slug: string; type: string; name: string }
    >();
    const cache = new Map<string, KnowledgeEntity>();
    const desiredIds: number[] = [];

    for (const tagName of tags) {
        const hashtagId = tagIds.get(tagName);
        if (!hashtagId) continue;

        const entity = await resolveEntityForTag(db, tagName, hashtagId, cache);
        if (!entity) continue;

        entityMap.set(entity.slug, {
            id: entity.id,
            slug: entity.slug,
            type: entity.type,
            name: entity.name,
        });
        desiredIds.push(entity.id);

        const ehExists = await db.query.entityHashtags.findFirst({
            where: and(
                eq(entityHashtags.entityId, entity.id),
                eq(entityHashtags.hashtagId, hashtagId),
            ),
        });
        if (!ehExists) {
            await db.insert(entityHashtags).values({
                entityId: entity.id,
                hashtagId,
            });
        }

        const feExists = await db.query.feedEntities.findFirst({
            where: and(
                eq(feedEntities.feedId, feedId),
                eq(feedEntities.entityId, entity.id),
            ),
        });
        if (!feExists) {
            await db.insert(feedEntities).values({
                feedId,
                entityId: entity.id,
            });
        }
    }

    const uniqueDesired = [...new Set(desiredIds)];
    if (uniqueDesired.length === 0) {
        await db.delete(feedEntities).where(eq(feedEntities.feedId, feedId));
    } else {
        await db
            .delete(feedEntities)
            .where(
                and(
                    eq(feedEntities.feedId, feedId),
                    notInArray(feedEntities.entityId, uniqueDesired),
                ),
            );
    }

    await autoBuildSimpleRelations(db, entityMap);
}

/**
 * 根据实体类型 + 规则自动建立 parent_id 和 entity_relations
 */
async function autoBuildSimpleRelations(
    db: DB,
    entityMap: Map<string, { id: number; slug: string; type: string; name: string }>,
) {
    const knownParents = await db.query.entities.findMany({
        where: inArray(entities.slug, [
            "ai-server",
            "gpu",
            "cpu",
            "memory",
            "nvidia",
            "amd",
            "micron",
        ]),
    });
    const parentBySlug = new Map(knownParents.map((e) => [e.slug, e]));

    for (const [slug, e] of entityMap) {
        parentBySlug.set(slug, e as any);
    }

    for (const [slug, entity] of entityMap) {
        const lower = (entity.name + " " + slug).toLowerCase();

        // 规则 1：产品 → 公司（product_of）
        if (entity.type === "product") {
            let companySlug: string | null = null;
            if (
                ["blackwell", "rubin", "vera-rubin", "gb200", "gb300", "h100", "h200", "b200"].some(
                    (k) => lower.includes(k),
                )
            ) {
                companySlug = "nvidia";
            } else if (
                ["mi300", "mi325", "mi455", "helio", "instinct"].some((k) => lower.includes(k))
            ) {
                companySlug = "amd";
            }

            if (companySlug && parentBySlug.has(companySlug)) {
                const company = parentBySlug.get(companySlug)!;
                await db
                    .update(entities)
                    .set({ parent_id: company.id })
                    .where(and(eq(entities.id, entity.id), eq(entities.parent_id, null as any)));

                await safeInsertRelation(db, entity.id, company.id, "product_of");
            }
        }

        // 规则 2：组件 → ai-server
        if (
            entity.type === "component" ||
            ["hbm", "液冷", "liquid-cooling", "nvlink", "电源"].some((k) => lower.includes(k))
        ) {
            const aiServer = parentBySlug.get("ai-server");
            if (aiServer) {
                await db
                    .update(entities)
                    .set({ parent_id: aiServer.id })
                    .where(and(eq(entities.id, entity.id), eq(entities.parent_id, null as any)));

                await safeInsertRelation(db, aiServer.id, entity.id, "uses");
            }
        }

        // 规则 3：supplier
        if (entity.type === "product" || entity.type === "component") {
            if (lower.includes("nvidia") || lower.includes("英伟达")) {
                const nvidia = parentBySlug.get("nvidia");
                if (nvidia) {
                    await safeInsertRelation(db, entity.id, nvidia.id, "supplier");
                }
            }
            if (lower.includes("amd") || lower.includes("超威")) {
                const amd = parentBySlug.get("amd");
                if (amd) {
                    await safeInsertRelation(db, entity.id, amd.id, "supplier");
                }
            }
        }

        // 规则 4：概念挂到 ai-server
        if (entity.type === "concept" && slug !== "ai-server") {
            const aiServer = parentBySlug.get("ai-server");
            if (
                aiServer &&
                (lower.includes("服务器") ||
                    lower.includes("server") ||
                    lower.includes("超节点") ||
                    lower.includes("液冷"))
            ) {
                await db
                    .update(entities)
                    .set({ parent_id: aiServer.id })
                    .where(and(eq(entities.id, entity.id), eq(entities.parent_id, null as any)));

                await safeInsertRelation(db, aiServer.id, entity.id, "related");
            }
        }
    }
}

/** 安全插入关系（忽略重复） */
async function safeInsertRelation(
    db: DB,
    fromId: number,
    toId: number,
    relationType: string,
) {
    if (fromId === toId) return;

    const exists = await db.query.entityRelations.findFirst({
        where: and(
            eq(entityRelations.from_id, fromId),
            eq(entityRelations.to_id, toId),
            eq(entityRelations.relation_type, relationType),
        ),
    });
    if (!exists) {
        await db.insert(entityRelations).values({
            from_id: fromId,
            to_id: toId,
            relation_type: relationType,
        });
    }
}

/**
 * 全量：把所有已绑定标签的文章同步到知识树
 */
export async function syncAllFeedsToKnowledgeTree(db: DB) {
    const rows = await db
        .select({
            feedId: feedHashtags.feedId,
            hashtagId: hashtags.id,
            name: hashtags.name,
        })
        .from(feedHashtags)
        .innerJoin(hashtags, eq(feedHashtags.hashtagId, hashtags.id));

    const byFeed = new Map<number, { names: string[]; tagIds: Map<string, number> }>();
    for (const row of rows) {
        if (!byFeed.has(row.feedId)) {
            byFeed.set(row.feedId, { names: [], tagIds: new Map() });
        }
        const entry = byFeed.get(row.feedId)!;
        if (!entry.tagIds.has(row.name)) {
            entry.names.push(row.name);
            entry.tagIds.set(row.name, row.hashtagId);
        }
    }

    let feedsProcessed = 0;
    let tagsProcessed = 0;
    let errors = 0;

    for (const [feedId, { names, tagIds }] of byFeed) {
        try {
            await syncTagsToKnowledgeTree(db, feedId, names, tagIds);
            feedsProcessed += 1;
            tagsProcessed += names.length;
        } catch (e) {
            console.error(`sync knowledge failed for feed ${feedId}`, e);
            errors += 1;
        }
    }

    const entityCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(entities)
        .then((r) => Number(r[0]?.count ?? 0));

    return {
        feedsProcessed,
        tagsProcessed,
        errors,
        entityCount,
        generatedAt: new Date().toISOString(),
    };
}

/** 生成唯一 slug */
function toSlug(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[\s\/\\]+/g, "-")
        .replace(/[^\w\u4e00-\u9fa5-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
}

function containsChinese(str: string): boolean {
    return /[\u4e00-\u9fa5]/.test(str);
}

function guessEntityType(name: string): string {
    const lower = name.toLowerCase();
    const raw = name.trim();

    // —— 公司（英文 / 中文常用名）——
    const companies = [
        // 海外
        "nvidia", "amd", "intel", "micron", "tsmc", "samsung", "broadcom",
        "qualcomm", "marvell", "arm", "asml", "applied materials", "lam research",
        "sk hynix", "hynix", "cisco", "dell", "hpe", "supermicro", "lenovo",
        "ibm", "google", "microsoft", "amazon", "meta", "apple", "oracle",
        // 中文 / A股相关光模块与算力链（可按你文章继续加）
        "英伟达", "超威", "华为", "阿里", "腾讯", "字节", "百度", "中兴",
        "中际旭创", "旭创", "新易盛", "光迅科技", "华工科技", "天孚通信",
        "源杰科技", "长光华芯", "剑桥科技", "铭普光磁", "太辰光", "德科立",
        "博创科技", "联特科技", "仕佳光子", "光库科技", "亨通光电", "烽火通信",
        "寒武纪", "海光", "龙芯", "壁仞", "摩尔线程", "沐曦", "天数智芯",
        "浪潮", "中科曙光", "紫光股份", "工业富联", "立讯精密", "歌尔",
    ];
    if (companies.some((k) => lower.includes(k.toLowerCase()) || raw.includes(k))) {
        return "company";
    }

    // 名称像公司：含「科技/股份/通信/光电/半导体」等，且不太像纯技术词
    if (
        /(科技|股份|集团|有限|通信|光电|半导体|电子|股份有限公司|inc\.?|ltd\.?|corp\.?|co\.,?\s*ltd)/i.test(raw)
        && !/(服务器|液冷|超节点|集群|带宽|功耗)/.test(raw)
    ) {
        return "company";
    }

    // —— 产品（具体型号）——
    if (
        [
            "h100", "h200", "b200", "b100", "blackwell", "rubin", "vera",
            "mi300", "mi325", "mi350", "mi455", "gb200", "gb300", "helio",
            "instinct", "gaudi", "trainium", "inferentia",
            "800g", "1.6t", "osfp", "qsfp", "cpo", "npo",
        ].some((k) => lower.includes(k))
    ) {
        return "product";
    }

    // —— 组件 / 部件 ——
    if (
        ["gpu", "cpu", "hbm", "memory", "dram", "sram", "液冷", "liquid",
         "nvlink", "电源", "冷却", "光模块", "光器件", "激光器", "dsp",
         "交换机", "网卡", "nic", "dpu", "npu"].some((k) => lower.includes(k))
    ) {
        return "component";
    }

    return "concept";
}