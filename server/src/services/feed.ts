import {
    feedCreateSchema,
    feedSetTopSchema,
    feedUpdateSchema,
    feedUnlockSchema,
} from "@rin/api";
import type { CreateFeedRequest, UpdateFeedRequest } from "@rin/api";
import { and, asc, count, desc, eq, gt, lt, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { Variables } from "../core/hono-types";
import { adminOnly, userOnly, withJsonBody } from "../core/route-boundaries";
import { profileAsync } from "../core/server-timing";
import { feeds, visitStats } from "../db/schema";
import { createTaskQueue, createFeedVisitTask } from "../queue";
import {
    deleteFeedById,
    findDuplicateFeed,
    findFeedById,
    insertFeed,
    searchFeedPage,
    updateFeedById,
} from "../features/feed/repository";
import { HyperLogLog } from "../utils/hyperloglog";
import { extractImage, extractImageWithMetadata } from "../utils/image";
import { stripMarkdown } from "../utils/markdown";
import {
    hashFeedPassword,
    isProtected,
    randomSalt,
    unlockCookieName,
    unlockCookieValue,
    verifyFeedPassword,
} from "../utils/feed-password";
import { syncFeedAISummaryQueueState } from "./feed-ai-summary";
import { bindTagToPost } from "./tag";
import { clearFeedCache, clearFeedCollectionCaches } from "./clear-feed-cache";
export { clearFeedCache } from "./clear-feed-cache";


let XMLParser: any;
let html2md: any;

function parseFeedId(value: string): number | null {
    if (!/^[1-9]\d*$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}

function parsePositiveInteger(value: string | undefined, fallback: number, maximum?: number) {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return maximum ? Math.min(parsed, maximum) : parsed;
}

async function initWPModules() {
    if (!XMLParser) {
        const fxp = await import("fast-xml-parser");
        XMLParser = fxp.XMLParser;
    }
    if (!html2md) {
        const h2m = await import("html-to-md");
        html2md = h2m.default;
    }
}

async function resolvePasswordFields(
    encrypted: boolean | undefined,
    password: string | undefined,
    prev?: { passwordHash?: string | null; passwordSalt?: string | null },
) {
    if (encrypted === false) return { passwordHash: "", passwordSalt: "" };
    if (password) {
        const salt = randomSalt();
        return { passwordHash: await hashFeedPassword(password, salt), passwordSalt: salt };
    }
    if (encrypted && !prev?.passwordHash) throw new Error("Password required");
    return { passwordHash: prev?.passwordHash ?? "", passwordSalt: prev?.passwordSalt ?? "" };
}

function stripSecrets(feed: any) {
    const { passwordHash, passwordSalt, ...rest } = feed;
    return { ...rest, encrypted: Boolean(passwordHash) };
}

function publicListedWhere() {
    return and(eq(feeds.draft, 0), eq(feeds.listed, 1));
}

function listScope(admin: boolean | undefined, uid: number | undefined) {
    if (admin) return undefined;
    if (uid) return or(publicListedWhere(), eq(feeds.uid, uid));
    return publicListedWhere();
}

function adjacentScope(admin: boolean | undefined, uid: number | undefined) {
    if (admin) return undefined;
    if (uid) return eq(feeds.uid, uid);
    return publicListedWhere();
}

export function FeedService(): Hono<{ Bindings: Env; Variables: Variables }> {
    const app = new Hono<{ Bindings: Env; Variables: Variables }>();

    app.get("/", async (c) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const admin = c.get("admin");
        const uid = c.get("uid");
        const type = c.req.query("type");
        const page = c.req.query("page");
        const limit = c.req.query("limit");

        if ((type === "draft" || type === "unlisted" || type === "encrypted") && !admin && !uid) {
            return c.text("Permission denied", 403);
        }

        const page_num = parsePositiveInteger(page, 1) - 1;
        const limit_num = parsePositiveInteger(limit, 20, 50);
        const viewer = admin ? "admin" : uid ? `user_${uid}` : "pub";
        const cacheKey = `feeds_${viewer}_${type}_${page_num}_${limit_num}`;
        const cached = await profileAsync(c, "feed_list_cache_get", () => cache.get(cacheKey));
        if (cached) return c.json(cached);

        const where =
            type === "draft"
                ? admin
                    ? eq(feeds.draft, 1)
                    : and(eq(feeds.draft, 1), eq(feeds.uid, uid!))
                : type === "unlisted"
                  ? admin
                      ? and(eq(feeds.draft, 0), eq(feeds.listed, 0))
                      : and(eq(feeds.draft, 0), eq(feeds.listed, 0), eq(feeds.uid, uid!))
                  : type === "encrypted"
                    ? admin
                        ? sql`${feeds.passwordHash} != ''`
                        : and(sql`${feeds.passwordHash} != ''`, eq(feeds.uid, uid!))
                    : and(eq(feeds.draft, 0), eq(feeds.listed, 1));

        const size = await profileAsync(c, "feed_list_count", () =>
            db.select({ count: count() }).from(feeds).where(where),
        );
        if (size[0].count === 0) return c.json({ size: 0, data: [], hasNext: false });

        const feed_list = (
            await profileAsync(c, "feed_list_db", () =>
                db.query.feeds.findMany({
                    where,
                    columns: admin || uid
                        ? undefined
                        : { draft: false, listed: false, passwordSalt: false },
                    with: {
                        hashtags: {
                            columns: {},
                            with: {
                                hashtag: { columns: { id: true, name: true } },
                            },
                        },
                        user: { columns: { id: true, username: true, avatar: true } },
                    },
                    orderBy: [desc(feeds.top), desc(feeds.createdAt), desc(feeds.updatedAt)],
                    offset: page_num * limit_num,
                    limit: limit_num + 1,
                }),
            )
        ).map(({ content, hashtags, summary, passwordHash, passwordSalt, ...other }: any) => {
            const encrypted = Boolean(passwordHash);
            const canSee = Boolean(admin || other.uid === uid);
            const plainText = stripMarkdown(content);
            return {
                ...other,
                hashtags: hashtags.map(({ hashtag }: any) => hashtag),
                avatar: encrypted && !canSee ? undefined : extractImageWithMetadata(content),
                encrypted,
                canSee,
                summary:
                    encrypted && !canSee
                        ? ""
                        : summary.length > 0
                            ? summary
                            : plainText.length > 200
                                ? plainText.slice(0, 200)
                                : plainText,
            };
        });

        let hasNext = false;
        if (feed_list.length === limit_num + 1) {
            feed_list.pop();
            hasNext = true;
        }
        const data = { size: size[0].count, data: feed_list, hasNext };
        if (type === undefined || type === "normal" || type === "") {
            await profileAsync(c, "feed_list_cache_set", () => cache.set(cacheKey, data));
        }
        return c.json(data);
    });

    app.get("/timeline", async (c) => {
        const db = c.get("db");
        return c.json(
            await profileAsync(c, "feed_timeline_db", () =>
                db.query.feeds.findMany({
                    where: publicListedWhere(),
                    columns: { id: true, title: true, createdAt: true },
                    orderBy: [desc(feeds.createdAt), desc(feeds.updatedAt)],
                }),
            ),
        );
    });

    app.post(
        "/",
        adminOnly(
            withJsonBody<CreateFeedRequest>(feedCreateSchema, async (c, body) => {
                const db = c.get("db");
                const cache = c.get("cache");
                const serverConfig = c.get("serverConfig");
                const env = c.get("env");
                const uid = c.get("uid");
                const { title, alias, listed, content, summary, draft, tags, createdAt, password, encrypted } = body as any;
                const exist = await profileAsync(c, "feed_create_existing", () => findDuplicateFeed(db, title, content));
                if (exist) return c.text("Content already exists", 400);
                if (!uid) return c.text("User ID is required", 400);
                let pwd;
                try {
                    pwd = await resolvePasswordFields(encrypted, password);
                } catch {
                    return c.text("Password required", 400);
                }
                const date = createdAt ? new Date(createdAt) : new Date();
                const listedFlag = draft ? 0 : listed ? 1 : 0;
                const result = await profileAsync(c, "feed_create_insert", () =>
                    insertFeed(db, {
                        title,
                        content,
                        summary,
                        ai_summary: "",
                        ai_summary_status: "idle",
                        ai_summary_error: "",
                        uid,
                        alias,
                        listed: listedFlag,
                        draft: draft ? 1 : 0,
                        passwordHash: pwd.passwordHash,
                        passwordSalt: pwd.passwordSalt,
                        createdAt: date,
                        updatedAt: date,
                    } as any),
                );
                if (!result) return c.text("Failed to insert", 500);
                await profileAsync(c, "feed_create_tags", () => bindTagToPost(db, result.insertedId, tags));
                await profileAsync(c, "feed_create_ai_queue", () =>
                    syncFeedAISummaryQueueState(db, serverConfig, env, result.insertedId, {
                        draft: Boolean(draft),
                        updatedAt: date,
                        resetSummary: true,
                    }),
                );
                await profileAsync(c, "feed_create_cache_invalidate", () => clearFeedCollectionCaches(cache));
                return c.json(result);
            }, {
                errorMessage: (issues) => issues[0]?.message ?? "Invalid request body",
            }),
            { message: "Permission denied", status: 403 },
        ),
    );

    app.get("/seo/:id", async (c) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const id = c.req.param("id");
        const id_num = parseFeedId(id);
        const cacheKey = id_num === null ? `feed_seo_alias_${id}` : `feed_seo_id_${id_num}`;
        const where = id_num === null ? eq(feeds.alias, id) : eq(feeds.id, id_num);
        const feed = await profileAsync(c, "feed_seo_cache_db", () =>
            cache.getOrSet(cacheKey, () =>
                db.query.feeds.findFirst({
                    where,
                    columns: {
                        id: true, alias: true, title: true, summary: true, content: true,
                        draft: true, listed: true, passwordHash: true,
                    },
                }),
            ),
        );
        if (!feed || feed.draft || !feed.listed || feed.passwordHash) return c.json({ found: false });
        const plainText = feed.summary.length > 0 ? feed.summary : stripMarkdown(feed.content);
        return c.json({
            found: true,
            id: feed.id,
            alias: feed.alias,
            title: feed.title,
            description: plainText.length > 200 ? plainText.slice(0, 200) : plainText,
            image: extractImage(feed.content),
        });
    });

    app.post("/:id/unlock", withJsonBody<{ password: string }>(feedUnlockSchema as any, async (c, body) => {
        const db = c.get("db");
        const id = c.req.param("id");
        const id_num = parseFeedId(id);
        const where = id_num === null ? eq(feeds.alias, id) : eq(feeds.id, id_num);
        const feed = await db.query.feeds.findFirst({
            where,
            with: {
                hashtags: { columns: {}, with: { hashtag: { columns: { id: true, name: true } } } },
                user: { columns: { id: true, username: true, avatar: true } },
            },
        });
        if (!feed) return c.text("Not found", 404);
        if (feed.draft) return c.text("Permission denied", 403);
        if (!isProtected(feed)) return c.text("Not encrypted", 400);
        const ok = await verifyFeedPassword((body as { password: string }).password, feed.passwordSalt, feed.passwordHash);
        if (!ok) return c.text("Wrong password", 403);
        const token = await unlockCookieValue(feed.id, feed.passwordHash);
        c.header("Set-Cookie", `${unlockCookieName(feed.id)}=${token}; Path=/; HttpOnly; SameSite=Lax`);
        const { hashtags, ...other } = feed as any;
        return c.json(stripSecrets({
            ...other,
            hashtags: hashtags.map((f: any) => f.hashtag),
            locked: false,
            pv: 0,
            uv: 0,
        }));
    }));

    app.get("/:id", async (c) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const clientConfig = c.get("clientConfig");
        const admin = c.get("admin");
        const uid = c.get("uid");
        const env = c.get("env");
        const id = c.req.param("id");
        const id_num = parseFeedId(id);
        const cacheKey = id_num === null ? `feed_alias_${id}` : `feed_id_${id_num}`;
        const where = id_num === null ? eq(feeds.alias, id) : eq(feeds.id, id_num);
        const feed = await profileAsync(c, "feed_detail_cache_db", () =>
            cache.getOrSet(cacheKey, () =>
                db.query.feeds.findFirst({
                    where,
                    with: {
                        hashtags: { columns: {}, with: { hashtag: { columns: { id: true, name: true } } } },
                        user: { columns: { id: true, username: true, avatar: true } },
                    },
                }),
            ),
        );
        if (!feed) return c.text("Not found", 404);
        if (feed.draft && feed.uid !== uid && !admin) return c.text("Permission denied", 403);

        const protectedFeed = isProtected(feed);
        const isOwner = feed.uid === uid || admin;
        const expected = protectedFeed ? await unlockCookieValue(feed.id, feed.passwordHash) : "";
        const cookie = c.req.header("cookie") || "";
        const unlocked = Boolean(expected) && cookie.includes(`${unlockCookieName(feed.id)}=${expected}`);
        if (protectedFeed && !isOwner && !unlocked) {
            return c.json({
                locked: true,
                encrypted: true,
                id: feed.id,
                title: feed.title,
                createdAt: feed.createdAt,
                updatedAt: feed.updatedAt,
                listed: feed.listed,
                draft: feed.draft,
                user: feed.user,
                hashtags: [],
                content: "",
                summary: c.text("feed.encrypted_summary"),
                pv: 0,
                uv: 0,
            }, 403);
        }

        const { hashtags, ...other } = feed;
        const enableVisit = await profileAsync(c, "feed_detail_counter_flag", () =>
            clientConfig.getOrDefault("counter.enabled", true),
        );
        let pv = 0;
        let uv = 0;
        if (enableVisit) {
            const ip = c.req.header("cf-connecting-ip") || c.req.header("x-real-ip") || "UNK";
            await profileAsync(c, "feed_detail_pv_incr", () =>
                db.insert(visitStats)
                    .values({ feedId: feed.id, pv: 1, hllData: new HyperLogLog().serialize() })
                    .onConflictDoUpdate({
                        target: visitStats.feedId,
                        set: { pv: sql`${visitStats.pv} + 1`, updatedAt: new Date() },
                    }),
            );
            if (env?.TASK_QUEUE) {
                try {
                    await createTaskQueue(env).send(createFeedVisitTask({ feedId: feed.id, ip }));
                } catch (e) {
                    console.error("failed to enqueue visit recording task", e);
                }
            }
            const stats = await profileAsync(c, "feed_detail_stats_read", () =>
                db.query.visitStats.findFirst({
                    where: eq(visitStats.feedId, feed.id),
                    columns: { pv: true, hllData: true },
                }),
            );
            pv = stats?.pv ?? 1;
            uv = stats ? Math.round(new HyperLogLog(stats.hllData).count()) : 1;
        }
        return c.json(stripSecrets({ ...other, hashtags: hashtags.map((f: any) => f.hashtag), pv, uv }));
    });

    app.get("/adjacent/:id", async (c) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const admin = c.get("admin");
        const uid = c.get("uid");
        const id = c.req.param("id");
        let id_num = parseFeedId(id);
        if (id_num === null) {
            const aliasRecord = await profileAsync(c, "feed_adjacent_alias_lookup", () =>
                db.select({ id: feeds.id }).from(feeds).where(eq(feeds.alias, id)),
            );
            if (aliasRecord.length === 0) return c.text("Not found", 404);
            id_num = aliasRecord[0].id;
        }
        const feed = await profileAsync(c, "feed_adjacent_current", () =>
            db.query.feeds.findFirst({ where: eq(feeds.id, id_num), columns: { createdAt: true } }),
        );
        if (!feed) return c.text("Not found", 404);
        const created_at = feed.createdAt;
        const viewer = admin ? "admin" : uid ? `user_${uid}` : "pub";
        const scope = adjacentScope(admin, uid);
        const withTime = (cmp: ReturnType<typeof lt> | ReturnType<typeof gt>) => (scope ? and(scope, cmp) : cmp);

        function formatAndCacheData(row: any, feedDirection: "previous_feed" | "next_feed") {
            if (!row) return null;
            const encrypted = Boolean(row.passwordHash);
            const canSee = Boolean(admin || row.uid === uid);
            const plainText = stripMarkdown(row.content);
            const summary =
                encrypted && !canSee
                    ? ""
                    : row.summary.length > 0
                      ? row.summary
                      : plainText.length > 50
                        ? plainText.slice(0, 50)
                        : plainText;
            const cacheKey = `adjacent_${feedDirection === "previous_feed" ? "prev" : "next"}_${viewer}_${id_num}`;
            const cacheData = {
                id: row.id,
                title: row.title,
                encrypted,
                canSee,
                summary,
                hashtags: row.hashtags.map((f: any) => f.hashtag),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            };
            cache.set(cacheKey, cacheData);
            return cacheData;
        }

        const getPreviousFeed = async () => {
            const cacheKey = `adjacent_prev_${viewer}_${id_num}`;
            const cachedPrev = await profileAsync(c, "feed_adjacent_prev_cache", () => cache.get(cacheKey));
            if (cachedPrev) return cachedPrev;
            const temp = await profileAsync(c, "feed_adjacent_prev_db", () =>
                db.query.feeds.findFirst({
                    where: withTime(lt(feeds.createdAt, created_at)),
                    orderBy: [desc(feeds.createdAt)],
                    with: {
                        hashtags: { columns: {}, with: { hashtag: { columns: { id: true, name: true } } } },
                        user: { columns: { id: true, username: true, avatar: true } },
                    },
                }),
            );
            return formatAndCacheData(temp, cacheKey);
        };

        const getNextFeed = async () => {
            const cacheKey = `adjacent_next_${viewer}_${id_num}`;
            const cachedNext = await profileAsync(c, "feed_adjacent_next_cache", () => cache.get(cacheKey));
            if (cachedNext) return cachedNext;
            const temp = await profileAsync(c, "feed_adjacent_next_db", () =>
                db.query.feeds.findFirst({
                    where: withTime(gt(feeds.createdAt, created_at)),
                    orderBy: [asc(feeds.createdAt)],
                    with: {
                        hashtags: { columns: {}, with: { hashtag: { columns: { id: true, name: true } } } },
                        user: { columns: { id: true, username: true, avatar: true } },
                    },
                }),
            );
            return formatAndCacheData(temp, cacheKey);
        };

        const [previousFeed, nextFeed] = await Promise.all([getPreviousFeed(), getNextFeed()]);
        return c.json({ previousFeed, nextFeed });
    });

    app.post("/:id", userOnly(withJsonBody<UpdateFeedRequest>(feedUpdateSchema, async (c, body) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const serverConfig = c.get("serverConfig");
        const env = c.get("env");
        const admin = c.get("admin");
        const uid = c.get("uid")!;
        const id = c.req.param("id");
        const { title, listed, content, summary, alias, draft, top, tags, createdAt, password, encrypted } = body as any;
        const id_num = parseFeedId(id);
        if (id_num === null) return c.text("Not found", 404);
        const feed = await profileAsync(c, "feed_update_lookup", () => findFeedById(db, id_num));
        if (!feed) return c.text("Not found", 404);
        if (feed.uid !== uid && !admin) return c.text("Permission denied", 403);
        let pwd;
        try {
            pwd = await resolvePasswordFields(encrypted, password, feed);
        } catch {
            return c.text("Password required", 400);
        }
        const contentChanged = content && content !== feed.content;
        const isDraft = draft !== undefined ? draft : feed.draft === 1;
        const shouldQueueAISummary = (contentChanged && !isDraft) || (!isDraft && feed.draft === 1 && !feed.ai_summary);
        const updateTime = new Date();
        const listedFlag = isDraft ? 0 : listed ? 1 : 0;
        await profileAsync(c, "feed_update_db", () =>
            updateFeedById(db, id_num, {
                title,
                content,
                summary,
                ai_summary: shouldQueueAISummary ? "" : undefined,
                ai_summary_status: isDraft ? "idle" : undefined,
                ai_summary_error: shouldQueueAISummary || isDraft ? "" : undefined,
                alias,
                top,
                listed: listedFlag,
                draft: draft === undefined ? undefined : draft ? 1 : 0,
                passwordHash: pwd.passwordHash,
                passwordSalt: pwd.passwordSalt,
                createdAt: createdAt ? new Date(createdAt) : undefined,
                updatedAt: updateTime,
            } as any),
        );
        if (tags) await profileAsync(c, "feed_update_tags", () => bindTagToPost(db, id_num, tags));
        if (shouldQueueAISummary || isDraft) {
            await profileAsync(c, "feed_update_ai_queue", () =>
                syncFeedAISummaryQueueState(db, serverConfig, env, id_num, {
                    draft: Boolean(isDraft),
                    updatedAt: updateTime,
                    resetSummary: shouldQueueAISummary,
                }),
            );
        }
        await profileAsync(c, "feed_update_cache_invalidate", () => clearFeedCache(cache, id_num, feed.alias, alias || null));
        return c.text("Updated");
    }), { message: "Permission denied", status: 403 }));

    app.post("/top/:id", userOnly(withJsonBody<{ top: number }>(feedSetTopSchema, async (c, body) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const admin = c.get("admin");
        const uid = c.get("uid")!;
        const id = c.req.param("id");
        const id_num = parseFeedId(id);
        if (id_num === null) return c.text("Not found", 404);
        const feed = await profileAsync(c, "feed_top_lookup", () => findFeedById(db, id_num));
        if (!feed) return c.text("Not found", 404);
        if (feed.uid !== uid && !admin) return c.text("Permission denied", 403);
        await profileAsync(c, "feed_top_db", () => updateFeedById(db, feed.id, { top: body.top }));
        await profileAsync(c, "feed_top_cache_invalidate", () => clearFeedCache(cache, feed.id, feed.alias, feed.alias));
        return c.text("Updated");
    }), { message: "Permission denied", status: 403 }));

    app.delete("/:id", userOnly(async (c, uid) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const admin = c.get("admin");
        const id = c.req.param("id");
        const id_num = parseFeedId(id);
        if (id_num === null) return c.text("Not found", 404);
        const feed = await profileAsync(c, "feed_delete_lookup", () => findFeedById(db, id_num));
        if (!feed) return c.text("Not found", 404);
        if (feed.uid !== uid && !admin) return c.text("Permission denied", 403);
        await profileAsync(c, "feed_delete_db", () => deleteFeedById(db, id_num));
        await profileAsync(c, "feed_delete_cache_invalidate", () => clearFeedCache(cache, id_num, feed.alias, null));
        return c.text("Deleted");
    }, { message: "Permission denied", status: 403 }));

    return app;
}

export function SearchService(): Hono<{
    Bindings: Env;
    Variables: Variables;
}> {
    const app = new Hono<{
        Bindings: Env;
        Variables: Variables;
    }>();

    app.get("/:keyword", async (c) => {
        const db = c.get("db");
        const cache = c.get("cache");
        const admin = c.get("admin");
        const page = c.req.query("page");
        const limit = c.req.query("limit");
        let keyword = c.req.param("keyword");
        keyword = decodeURI(keyword);
        const page_num = parsePositiveInteger(page, 1) - 1;
        const limit_num = parsePositiveInteger(limit, 20, 50);

        if (keyword === undefined || keyword.trim().length === 0) {
            return c.json({ size: 0, data: [], hasNext: false });
        }

        const scope = admin ? "admin" : "public";
        const cacheKey = `search_${scope}_${page_num}_${limit_num}_${encodeURIComponent(keyword)}`;
        const result = await profileAsync(c, "feed_search_cache_db", () =>
            cache.getOrSet(cacheKey, async () => {
                const pageResult = await searchFeedPage(db, {
                    keyword,
                    admin,
                    pageIndex: page_num,
                    limit: limit_num,
                });
                const data = pageResult.rows.map(({ content, hashtags, summary, ...other }: any) => {
                    const plainText = stripMarkdown(content);
                    return {
                        summary: summary.length > 0 ? summary : plainText.length > 200 ? plainText.slice(0, 200) : plainText,
                        hashtags: hashtags.map(({ hashtag }: any) => hashtag),
                        ...other,
                    };
                });
                return { size: pageResult.size, data, hasNext: pageResult.hasNext };
            }),
        );
        return c.json(result);
    });
    return app;
}

export function WordPressService(): Hono<{
    Bindings: Env;
    Variables: Variables;
}> {
    const app = new Hono<{
        Bindings: Env;
        Variables: Variables;
    }>();

    app.post(
        "/",
        adminOnly(async (c) => {
            const db = c.get("db");
            const cache = c.get("cache");
            const body = await profileAsync(c, "wp_import_parse", () => c.req.parseBody());
            const data = body.data as File;
            if (!data) {
                return c.text("Data is required", 400);
            }
            await profileAsync(c, "wp_import_modules", () => initWPModules());
            const xml = await profileAsync(c, "wp_import_read", () => data.text());
            const parser = new XMLParser();
            const result = await profileAsync(c, "wp_import_xml_parse", () => parser.parse(xml));
            const items = result.rss.channel.item;
            if (!items) {
                return c.text("No items found", 404);
            }

            const feedItems: FeedItem[] = items?.map((item: any) => {
                const createdAt = new Date(item?.["wp:post_date"]);
                const updatedAt = new Date(item?.["wp:post_modified"]);
                const draft = item?.["wp:status"] !== "publish";
                const contentHtml = item?.["content:encoded"];
                const content = html2md(contentHtml);
                const summary = content.length > 100 ? content.slice(0, 100) : content;
                let tags = item?.["category"];
                if (tags && Array.isArray(tags)) {
                    tags = tags.map((tag: any) => tag + "");
                } else if (tags && typeof tags === "string") {
                    tags = [tags];
                }
                return {
                    title: item.title,
                    summary,
                    content,
                    draft,
                    createdAt,
                    updatedAt,
                    tags,
                };
            });

            let success = 0;
            let skipped = 0;
            const skippedList: { title: string; reason: string }[] = [];

            for (const item of feedItems) {
                if (!item.content) {
                    skippedList.push({ title: item.title, reason: "no content" });
                    skipped++;
                    continue;
                }
                const exist = await profileAsync(c, "wp_import_existing", () =>
                    db.query.feeds.findFirst({ where: eq(feeds.content, item.content) }),
                );
                if (exist) {
                    skippedList.push({ title: item.title, reason: "content exists" });
                    skipped++;
                    continue;
                }
                const inserted = await profileAsync(c, "wp_import_insert", () =>
                    db
                        .insert(feeds)
                        .values({
                            title: item.title,
                            content: item.content,
                            summary: item.summary,
                            uid: 1,
                            listed: 1,
                            draft: item.draft ? 1 : 0,
                            createdAt: item.createdAt,
                            updatedAt: item.updatedAt,
                        })
                        .returning({ insertedId: feeds.id }),
                );
                if (item.tags) {
                    await profileAsync(c, "wp_import_tags", () => bindTagToPost(db, inserted[0].insertedId, item.tags!));
                }
                success++;
            }

            await profileAsync(c, "wp_import_cache_invalidate", () => clearFeedCollectionCaches(cache));
            return c.json({ success, skipped, skippedList });
        }, { message: "Permission denied", status: 403 }),
    );
    return app;
}

type FeedItem = {
    title: string;
    summary: string;
    content: string;
    draft: boolean;
    createdAt: Date;
    updatedAt: Date;
    tags?: string[];
};