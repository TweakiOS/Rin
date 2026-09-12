import { drizzle } from "drizzle-orm/d1";
import PostalMime from "postal-mime";
import * as schema from "../db/schema";
import { findDuplicateFeed, insertFeed } from "../features/feed/repository";
import { clearFeedCollectionCaches } from "../services/clear-feed-cache";
import { bindTagToPost } from "../services/tag";
import { CacheImpl } from "../utils/cache";

const WRITER_ADDRESS = "aistock@rin.lxc.one";

function parseFrontmatter(raw: string) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) {
        return { meta: {} as Record<string, string>, body: raw.trim() };
    }

    const meta: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        meta[key] = value;
    }

    return { meta, body: raw.slice(match[0].length).trim() };
}

function extractTags(subject: string, body: string, metaTags?: string) {
    const fromHash = [...`${subject}\n${body}`.matchAll(/#([^\s#]+)/g)].map((m) => m[1]);
    const fromMeta = (metaTags ?? "")
        .replace(/[\[\]]/g, "")
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    return [...new Set([...fromMeta, ...fromHash])];
}

function truthy(v: string | undefined, fallback: boolean) {
    if (v == null || v === "") return fallback;
    return !["false", "0", "no", "off"].includes(v.toLowerCase());
}

export async function handleEmail(
    message: ForwardableEmailMessage,
    env: Env,
    _ctx: ExecutionContext,
) {
    const allowedSenders = (env.EMAIL_ALLOWED_SENDERS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    const to = message.to.toLowerCase();
    const from = message.from.toLowerCase();

    if (to !== WRITER_ADDRESS) {
        message.setReject("Unknown recipient");
        return;
    }

    if (allowedSenders.length > 0 && !allowedSenders.includes(from)) {
        message.setReject("Sender not allowed");
        return;
    }

    const parsed = await PostalMime.parse(message.raw);
    const subject = (parsed.subject || "").trim();
    const rawBody = (parsed.text || parsed.html || "").trim();

    if (!subject || !rawBody) {
        message.setReject("Subject and body are required");
        return;
    }

    const { meta, body } = parseFrontmatter(rawBody);
    const isDraft = /^\[draft\]/i.test(subject) || truthy(meta.draft, false);
    const title = subject.replace(/^\[draft\]\s*/i, "").trim();
    const tags = extractTags(title, body, meta.tags);
    const listed = truthy(meta.listed, true);
    const alias = meta.alias || undefined;
    const uid = Number(env.EMAIL_PUBLISH_UID);

    if (!uid) {
        console.error("EMAIL_PUBLISH_UID is not set");
        message.setReject("Server not configured");
        return;
    }

    const db = drizzle(env.DB, { schema });
    const exist = await findDuplicateFeed(db, title, body);
    if (exist) {
        console.log("Duplicate article ignored:", title);
        return;
    }

    const now = parsed.date ? new Date(parsed.date) : new Date();
    const result = await insertFeed(db, {
        title,
        content: body,
        summary: meta.summary ?? "",
        ai_summary: "",
        ai_summary_status: "idle",
        ai_summary_error: "",
        uid,
        alias,
        listed: listed ? 1 : 0,
        draft: isDraft ? 1 : 0,
        createdAt: now,
        updatedAt: now,
    });

    if (!result) {
        message.setReject("Failed to insert article");
        return;
    }

    await bindTagToPost(db, result.insertedId, tags);
    await clearFeedCollectionCaches(new CacheImpl(db, env, "cache"));

    console.log("Published from email", {
        id: result.insertedId,
        title,
        from,
        draft: isDraft,
    });
}