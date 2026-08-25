import { Hono } from "hono";
import type { AppContext } from "../core/hono-types";
import { and, desc, eq } from "drizzle-orm";
import { comments, feeds, users } from "../db/schema";
import { profileAsync } from "../core/server-timing";
import { notify } from "../utils/webhook";
import { resolveWebhookConfig } from "./config-helpers";

const MAX_CONTENT = 2000;
const MAX_NAME = 50;
const MAX_EMAIL = 100;
const MAX_WEBSITE = 200;

function normalizeWebsite(raw?: string): string {
    if (!raw?.trim()) return "";
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u)) {
        u = "https://" + u;
    }
    try {
        const parsed = new URL(u);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
        return parsed.toString().slice(0, MAX_WEBSITE);
    } catch {
        return "";
    }
}

function isValidEmail(email: string): boolean {
    if (!email) return true; // 可选
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= MAX_EMAIL;
}

function sanitizeContent(content: string): string | null {
    const t = content?.trim() ?? "";
    if (!t) return null;
    if (t.length > MAX_CONTENT) return null;
    // 简单限制外链数量，降低 spam
    const links = t.match(/https?:\/\//gi);
    if (links && links.length > 3) return null;
    return t;
}

export function CommentService(): Hono {
    const app = new Hono();

    // ========== 管理员：获取所有待审核评论（必须放在 /:feed 之前） ==========
    app.get("/pending", async (c: AppContext) => {
        const admin = c.get("admin");
        if (!admin) return c.text("Permission denied", 403);

        const db = c.get("db");

        const list = await profileAsync(c, "comment_pending_list", () =>
            db.query.comments.findMany({
                where: eq(comments.approved, 0),
                with: {
                    user: {
                        columns: {
                            id: true,
                            username: true,
                            avatar: true,
                            permission: true,
                        },
                    },
                    feed: {
                        columns: {
                            id: true,
                            title: true,
                            alias: true,
                        },
                    },
                },
                orderBy: [desc(comments.createdAt)],
            }),
        );

        const result = list.map((row: any) => {
            if (row.user) return row;
            const { user, ...rest } = row;
            return {
                ...rest,
                user: null,
                guestName: rest.guestName || "",
                guestEmail: rest.guestEmail || "",
                guestWebsite: rest.guestWebsite || "",
            };
        });

        return c.json(result);
    });

    // 列表：公众只看已审核；管理员看全部
    app.get("/:feed", async (c: AppContext) => {
        const db = c.get("db");
        const admin = c.get("admin");
        const feedId = parseInt(c.req.param("feed"));
        if (!feedId) return c.text("Invalid feed", 400);

        const comment_list = await profileAsync(c, "comment_list_db", () =>
            db.query.comments.findMany({
                where: admin
                    ? eq(comments.feedId, feedId)
                    : and(eq(comments.feedId, feedId), eq(comments.approved, 1)),
                columns: { feedId: false, userId: false },
                with: {
                    user: {
                        columns: {
                            id: true,
                            username: true,
                            avatar: true,
                            permission: true,
                        },
                    },
                },
                orderBy: [desc(comments.createdAt)],
            }),
        );

        const result = comment_list.map((row: any) => {
            if (row.user) return row;
            const { user, ...rest } = row;
            return {
                ...rest,
                user: null,
                guestName: rest.guestName || "",
                guestEmail: rest.guestEmail || "",
                guestWebsite: rest.guestWebsite || "",
            };
        });

        return c.json(result);
    });

    app.post("/:feed", async (c: AppContext) => {
        const db = c.get("db");
        const env = c.get("env");
        const serverConfig = c.get("serverConfig");
        const uid = c.get("uid");
        const feedId = parseInt(c.req.param("feed"));
        if (!feedId) return c.text("Invalid feed", 400);

        const body = await profileAsync(c, "comment_create_parse", () => c.req.json());
        const { content, guestName, guestEmail, guestWebsite } = body;

        const cleanContent = sanitizeContent(content);
        if (!cleanContent) {
            return c.text("Content is required or invalid", 400);
        }

        const exist = await profileAsync(c, "comment_create_feed", () =>
            db.query.feeds.findFirst({ where: eq(feeds.id, feedId) }),
        );
        if (!exist) {
            return c.text("Feed not found", 400);
        }

        // ---------- 登录用户：直接通过 ----------
        if (uid) {
            const user = await profileAsync(c, "comment_create_user", () =>
                db.query.users.findFirst({ where: eq(users.id, uid) }),
            );
            if (!user) {
                return c.text("User not found", 400);
            }

            await db.insert(comments).values({
                feedId,
                userId: uid,
                content: cleanContent,
                approved: 1,
            });

            await sendCommentWebhook(c, serverConfig, env, {
                feedId,
                title: exist.title || "",
                username: user.username,
                content: cleanContent,
                isGuest: false,
            });

            return c.text("OK");
        }

        // ---------- 游客：默认待审核 ----------
        if (!guestName || !String(guestName).trim()) {
            return c.text("Guest name is required", 400);
        }

        const name = String(guestName).trim().slice(0, MAX_NAME);
        const email = String(guestEmail || "").trim().slice(0, MAX_EMAIL);
        if (!isValidEmail(email)) {
            return c.text("Invalid email", 400);
        }
        const website = normalizeWebsite(guestWebsite);

        await db.insert(comments).values({
            feedId,
            userId: null,
            content: cleanContent,
            guestName: name,
            guestEmail: email,
            guestWebsite: website,
            approved: 0, // 待审核，不立刻公开展示
        });

        await sendCommentWebhook(c, serverConfig, env, {
            feedId,
            title: exist.title || "",
            username: name,
            content: cleanContent,
            isGuest: true,
            pending: true,
        });

        // 前端可提示「已提交，审核后显示」
        return c.text("OK");
    });

    // 管理员审核通过
    app.post("/:id/approve", async (c: AppContext) => {
        const admin = c.get("admin");
        if (!admin) return c.text("Permission denied", 403);

        const db = c.get("db");
        const id = parseInt(c.req.param("id"));
        if (!id) return c.text("Invalid id", 400);

        const row = await db.query.comments.findFirst({
            where: eq(comments.id, id),
        });
        if (!row) return c.text("Not found", 404);

        await db
            .update(comments)
            .set({ approved: 1, updatedAt: new Date() })
            .where(eq(comments.id, id));

        return c.text("OK");
    });

    app.delete("/:id", async (c: AppContext) => {
        const db = c.get("db");
        const uid = c.get("uid");
        const admin = c.get("admin");

        if (uid === undefined) {
            return c.text("Unauthorized", 401);
        }

        const id_num = parseInt(c.req.param("id"));
        const comment = await profileAsync(c, "comment_delete_lookup", () =>
            db.query.comments.findFirst({ where: eq(comments.id, id_num) }),
        );

        if (!comment) {
            return c.text("Not found", 404);
        }

        if (admin) {
            await db.delete(comments).where(eq(comments.id, id_num));
            return c.text("OK");
        }

        if (comment.userId !== uid) {
            return c.text("Permission denied", 403);
        }

        await db.delete(comments).where(eq(comments.id, id_num));
        return c.text("OK");
    });

    return app;
}

async function sendCommentWebhook(
    c: AppContext,
    serverConfig: any,
    env: any,
    opts: {
        feedId: number;
        title: string;
        username: string;
        content: string;
        isGuest: boolean;
        pending?: boolean;
    },
) {
    const { webhookUrl, webhookMethod, webhookContentType, webhookHeaders, webhookBodyTemplate } =
        await profileAsync(c, "comment_create_webhook_config", () =>
            resolveWebhookConfig(serverConfig, env),
        );
    const frontendUrl = new URL(c.req.url).origin;
    const pendingHint = opts.pending ? "（待审核）" : "";
    const who = opts.isGuest ? `游客 ${opts.username}` : opts.username;

    try {
        await profileAsync(c, "comment_create_notify", () =>
            notify(
                webhookUrl || "",
                {
                    event: "comment.created",
                    message: `${frontendUrl}/feed/${opts.feedId}\n${who} 评论了${pendingHint}: ${opts.title}\n${opts.content}`,
                    title: opts.title,
                    url: `${frontendUrl}/feed/${opts.feedId}`,
                    username: opts.username,
                    content: opts.content,
                },
                {
                    method: webhookMethod,
                    contentType: webhookContentType,
                    headers: webhookHeaders,
                    bodyTemplate: webhookBodyTemplate,
                },
            ),
        );
    } catch (error) {
        console.error("Failed to send comment webhook", error);
    }
}