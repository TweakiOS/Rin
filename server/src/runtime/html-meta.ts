import { getApp } from "./app-instance";

/**
 * Server-side SEO/OG meta injection for the SPA entry HTML.
 *
 * The client is a pure CSR app: crawlers and social-card scrapers only see the
 * static index.html, which carries no <title>/meta/og tags at all. The client
 * does render react-helmet tags, but only after hydration — too late for any
 * scraper. This module rewrites the served index.html with real metadata:
 *
 * - /feed/:idOrAlias pages -> article title/description/cover (via the
 *   read-only /feed/seo/:id route, no visit-counting side effects)
 * - every other page -> site-level defaults (via /config/client)
 *
 * Injection is best-effort: on any failure the original HTML is returned
 * untouched, and internal lookups are time-boxed so HTML responses never stall.
 */

const FEED_PAGE_PATTERN = /^\/feed\/([^/]+)\/?$/;
const LOOKUP_TIMEOUT_MS = 1500;
const SITE_META_CACHE_TTL_MS = 5 * 60 * 1000;

type SiteMeta = {
    name: string;
    description: string;
    avatar?: string;
};

let siteMetaCache: { value: SiteMeta; expiresAt: number } | null = null;

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function decodeEntities(input: string): string {
    return input
        .replace(/&#36;/g, "$")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}

function collapseWhitespace(input: string): string {
    return input.replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(raw: string | undefined, origin: string): string | undefined {
    if (!raw) {
        return undefined;
    }
    try {
        // Strip Rin's image metadata fragment (e.g. "#blurhash=...&width=...") —
        // scrapers must never see it.
        const clean = raw.split("#", 2)[0];
        return new URL(clean, origin).toString();
    } catch {
        return undefined;
    }
}

async function fetchJsonInternal(path: string, origin: string, env: Env): Promise<unknown | null> {
    try {
        const request = new Request(new URL(path, origin), {
            headers: { accept: "application/json" },
        });
        const response = await getApp().fetch(request, env);
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch {
        return null;
    }
}

function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | null> {
    return Promise.race([
        task.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
}

async function loadSiteMeta(origin: string, env: Env): Promise<SiteMeta> {
    if (siteMetaCache && siteMetaCache.expiresAt > Date.now()) {
        return siteMetaCache.value;
    }

    const fallback: SiteMeta = { name: "", description: "" };
    const config = (await withTimeout(
        fetchJsonInternal("/config/client", origin, env) as Promise<Record<string, unknown>>,
        LOOKUP_TIMEOUT_MS,
    )) as Record<string, unknown> | null;

    const value: SiteMeta = {
        name: typeof config?.["site.name"] === "string" ? (config["site.name"] as string) : "",
        description:
            typeof config?.["site.description"] === "string" ? (config["site.description"] as string) : "",
        avatar: typeof config?.["site.avatar"] === "string" ? (config["site.avatar"] as string) : undefined,
    };

    const result = value.name || value.description ? value : fallback;
    siteMetaCache = { value: result, expiresAt: Date.now() + SITE_META_CACHE_TTL_MS };
    return result;
}

function buildMetaHtml(options: {
    title: string;
    description: string;
    image?: string;
    url: string;
    siteName: string;
    type: "website" | "article";
    rssUrl?: string;
}): string {
    const { title, description, image, url, siteName, type, rssUrl } = options;
    const tags: string[] = [];

    tags.push(`<title>${escapeHtml(title)}</title>`);
    if (description) {
        tags.push(`<meta name="description" content="${escapeHtml(description)}" />`);
    }
    tags.push(`<link rel="canonical" href="${escapeHtml(url)}" />`);
    if (rssUrl) {
        tags.push(`<link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteName || "RSS")}" href="${escapeHtml(rssUrl)}" />`);
    }
    tags.push(`<meta property="og:title" content="${escapeHtml(title)}" />`);
    tags.push(`<meta property="og:type" content="${type}" />`);
    tags.push(`<meta property="og:url" content="${escapeHtml(url)}" />`);
    if (siteName) {
        tags.push(`<meta property="og:site_name" content="${escapeHtml(siteName)}" />`);
    }
    if (description) {
        tags.push(`<meta property="og:description" content="${escapeHtml(description)}" />`);
    }
    if (image) {
        tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
        tags.push(`<meta name="twitter:card" content="summary_large_image" />`);
    } else {
        tags.push(`<meta name="twitter:card" content="summary" />`);
    }

    return tags.join("\n    ");
}

function injectIntoHead(html: string, metaHtml: string): string {
    // Drop any existing static <title> so the injected one wins.
    const stripped = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, "");
    if (/<\/head>/i.test(stripped)) {
        return stripped.replace(/<\/head>/i, `    ${metaHtml}\n</head>`);
    }
    return stripped;
}

export async function injectHtmlMeta(html: string, request: Request, env: Env): Promise<string> {
    try {
        const url = new URL(request.url);
        const feedMatch = FEED_PAGE_PATTERN.exec(url.pathname);

        let article: { title?: string; description?: string; image?: string } | null = null;

        if (feedMatch) {
            const id = encodeURIComponent(decodeURIComponent(feedMatch[1]));
            const data = (await withTimeout(
                fetchJsonInternal(`/feed/seo/${id}`, url.origin, env) as Promise<Record<string, unknown>>,
                LOOKUP_TIMEOUT_MS,
            )) as Record<string, unknown> | null;

            if (data?.found) {
                article = {
                    title: typeof data.title === "string" ? data.title : "",
                    description: typeof data.description === "string" ? data.description : "",
                    image: typeof data.image === "string" ? data.image : undefined,
                };
            }
        }

        const site = await loadSiteMeta(url.origin, env);
        const canonicalPath = feedMatch ? `/feed/${decodeURIComponent(feedMatch[1])}` : url.pathname;
        const canonicalUrl = new URL(canonicalPath, url.origin).toString();
        const rssUrl = new URL("/rss.xml", url.origin).toString();

        if (article?.title) {
            const title = `${article.title}${site.name ? ` - ${site.name}` : ""}`;
            const description = collapseWhitespace(decodeEntities(article.description || site.description));
            const metaHtml = buildMetaHtml({
                title,
                description,
                image: toAbsoluteUrl(article.image, url.origin),
                url: canonicalUrl,
                siteName: site.name,
                type: "article",
                rssUrl,
            });
            return injectIntoHead(html, metaHtml);
        }

        const title = site.name || "Blog";
        const metaHtml = buildMetaHtml({
            title,
            description: collapseWhitespace(site.description),
            image: toAbsoluteUrl(site.avatar, url.origin),
            url: canonicalUrl,
            siteName: site.name,
            type: "website",
            rssUrl,
        });
        return injectIntoHead(html, metaHtml);
    } catch {
        return html;
    }
}
