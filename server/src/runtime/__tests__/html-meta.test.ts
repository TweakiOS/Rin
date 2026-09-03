// Tests for server-side SEO/OG meta injection (html-meta.ts).
import { describe, expect, mock, it } from "bun:test";

const fakeFeed = {
    found: true,
    id: 9,
    alias: "",
    title: "Samtec 在台湾 OCP 展示 CPC，以及 CPC vs CPO <special> & \"quotes\"",
    description: "每个模块含128个连接器引脚，对应64个差分对或32个200G通道。$100",
    image: "/images/cover.png#blurhash=xxx&width=100",
};

const fakeConfig: Record<string, string> = {
    "site.name": "AI Stock | 智股",
    "site.description": "聚焦 AI 产业链",
    "site.avatar": "https://img.example.com/avatar.jpg",
};

mock.module("../../../src/runtime/app-instance", () => ({
    getApp: () => ({
        fetch: async (req: Request) => {
            const url = new URL(req.url);
            if (url.pathname === "/config/client") {
                return Response.json(fakeConfig);
            }
            const m = /^\/feed\/seo\/(.+)$/.exec(url.pathname);
            if (m) {
                if (m[1] === "9") return Response.json(fakeFeed);
                return Response.json({ found: false });
            }
            return new Response("not found", { status: 404 });
        },
    }),
}));

const { injectHtmlMeta } = await import("../../../src/runtime/html-meta");

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="module" crossorigin src="/assets/index-9YYcmzn-.js"></script>
  </head>
  <body><div id="root"></div></body>
</html>`;

const env = {} as Env;

describe("injectHtmlMeta", () => {
    it("injects escaped article meta with absolute og:image on /feed/:id", async () => {
        const html = await injectHtmlMeta(INDEX_HTML, new Request("https://aistock.lxc.one/feed/9"), env);
        expect(html).toContain(
            "<title>Samtec 在台湾 OCP 展示 CPC，以及 CPC vs CPO &lt;special&gt; &amp; &quot;quotes&quot; - AI Stock | 智股</title>",
        );
        expect(html).toContain('property="og:type" content="article"');
        expect(html).toContain('property="og:image" content="https://aistock.lxc.one/images/cover.png"');
        expect(html).toContain('name="twitter:card" content="summary_large_image"');
        expect((html.match(/<title/g) || []).length).toBe(1);
    });

    it("injects site defaults on non-article pages", async () => {
        const html = await injectHtmlMeta(INDEX_HTML, new Request("https://aistock.lxc.one/timeline"), env);
        expect(html).toContain("<title>AI Stock | 智股</title>");
        expect(html).toContain('property="og:type" content="website"');
        expect(html).toContain('property="og:image" content="https://img.example.com/avatar.jpg"');
    });

    it("falls back to site meta when feed is missing", async () => {
        const html = await injectHtmlMeta(INDEX_HTML, new Request("https://aistock.lxc.one/feed/404"), env);
        expect(html).toContain("<title>AI Stock | 智股</title>");
    });

    it("returns HTML untouched when there is no </head>", async () => {
        const noHead = "<html><body>x</body></html>";
        const html = await injectHtmlMeta(noHead, new Request("https://aistock.lxc.one/"), env);
        expect(html).toBe(noHead);
    });

    it("emits an RSS auto-discovery link on both article and site pages", async () => {
        const articleHtml = await injectHtmlMeta(INDEX_HTML, new Request("https://aistock.lxc.one/feed/9"), env);
        expect(articleHtml).toContain(
            '<link rel="alternate" type="application/rss+xml" title="AI Stock | 智股" href="https://aistock.lxc.one/rss.xml" />',
        );
        const siteHtml = await injectHtmlMeta(INDEX_HTML, new Request("https://aistock.lxc.one/timeline"), env);
        expect(siteHtml).toContain('href="https://aistock.lxc.one/rss.xml"');
    });
});
