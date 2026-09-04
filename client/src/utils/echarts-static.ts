/**
 * Turn the JavaScript-drawn charts in a pasted HTML report into static images.
 *
 * Why this exists:
 *   React never executes `<script>` tags that come from rendered markup — it
 *   inserts the element first and only then fills in its text, and per the HTML
 *   spec a dynamically inserted script only runs if it already has content at
 *   insertion time. So `echarts.init(...).setOption(...)` in pasted HTML never
 *   runs, leaving the `<div class="chart">` placeholder empty (the "blank gap").
 *
 * Approach:
 *   Run the original HTML inside a sandboxed iframe (`allow-scripts`, but
 *   deliberately WITHOUT `allow-same-origin`) so the third-party script can
 *   draw normally while being unable to touch our DOM, cookies or storage.
 *   Once ECharts has rendered, ask each chart for `getDataURL()` and replace
 *   the placeholder `<div>` with a plain `<img>` — which *does* render, both in
 *   the editor preview and in the published article.
 */

/** Matches `echarts.init(document.getElementById('chartAI'))` and friends. */
const INIT_CALL =
  /echarts\s*\.\s*init\s*\(\s*(?:document\s*\.\s*getElementById\s*\(\s*["']|["']#?)([^"')]+)["']?\s*\)\s*\)/g;

/** Best-effort `alt` text: resolve the option variable, then read `title.text`. */
function findTitle(html: string, id: string): string | undefined {
  const varName = html.match(
    new RegExp(`['"]${escapeRegExp(id)}['"]\\s*\\)\\s*\\)\\s*\\.\\s*setOption\\(\\s*([A-Za-z_$][\\w$]*)`)
  )?.[1];
  if (!varName) return undefined;
  const title = html.match(
    new RegExp(`${varName}\\s*=\\s*\\{[\\s\\S]{0,400}?title\\s*:\\s*\\{\\s*text\\s*:\\s*['"]([^'"]+)['"]`)
  )?.[1];
  return title;
}

/** Chart container ids declared by `echarts.init(...)` calls. */
export function findEchartsChartIds(html: string): string[] {
  const ids = new Set<string>();
  for (const match of html.matchAll(INIT_CALL)) {
    const id = match[1]?.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

export function hasEchartsCharts(html: string): boolean {
  return findEchartsChartIds(html).length > 0;
}

/**
 * Render the given charts offscreen and resolve to `{ containerId: dataUrl }`.
 * Charts that fail to render are simply absent from the result.
 */
export function renderEchartsToDataUrls(
  html: string,
  ids: string[],
  timeoutMs = 25_000
): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || ids.length === 0) {
      resolve({});
      return;
    }

    const probe = `
<script>
(function () {
  var ids = ${JSON.stringify(ids)};
  var out = {};
  function grab() {
    var pending = 0;
    ids.forEach(function (id) {
      if (out[id]) return;
      var inst = null;
      try {
        var el = document.getElementById(id);
        inst = window.echarts && el ? window.echarts.getInstanceByDom(el) : null;
      } catch (e) {}
      if (inst) {
        try {
          out[id] = inst.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
        } catch (e) {
          out[id] = "";
        }
      } else {
        pending++;
      }
    });
    if (pending === 0) {
      parent.postMessage({ __rinEcharts: true, images: out }, "*");
      return true;
    }
    return false;
  }
  var timer = setInterval(function () { if (grab()) clearInterval(timer); }, 300);
})();
</script>`;

    const doc = html.includes("</body>")
      ? html.replace("</body>", `${probe}</body>`)
      : `${html}${probe}`;

    const iframe = document.createElement("iframe");
    // `allow-scripts` only: the report can run, but it lives on an opaque
    // origin and cannot read our page, cookies or storage.
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;left:-100000px;top:0;width:1080px;height:900px;border:0;visibility:hidden;";

    let settled = false;
    const finish = (images: Record<string, string>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      iframe.remove();
      resolve(images);
    };

    function onMessage(event: MessageEvent) {
      const data = event.data as { __rinEcharts?: boolean; images?: Record<string, string> } | null;
      if (!data || data.__rinEcharts !== true) return;
      // Drop empty entries (charts that could not be rasterised).
      const images: Record<string, string> = {};
      for (const [id, url] of Object.entries(data.images || {})) {
        if (url) images[id] = url;
      }
      finish(images);
    }

    const timer = window.setTimeout(() => finish({}), timeoutMs);
    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
    iframe.srcdoc = doc;
  });
}

/**
 * Replace `<div id="chartX" ...></div>` placeholders with `<img>` tags and strip
 * the ECharts `<script>` tags, so the result renders as ordinary Markdown/HTML.
 *
 * The echarts CDN `<script src=...>` is removed too: it is dead weight once the
 * charts are baked into images (and it would never run anyway).
 */
export function replaceChartsWithImages(
  html: string,
  images: Record<string, string>
): { content: string; replaced: string[] } {
  let out = html;
  const replaced: string[] = [];

  for (const [id, url] of Object.entries(images)) {
    const div = new RegExp(
      `<div\\s+([^>]*\\bid\\s*=\\s*["']${escapeRegExp(id)}["'][^>]*)>\\s*</div>`,
      "i"
    );
    const alt = findTitle(html, id) || id;
    const img = `<img src="${url}" alt="${escapeAttr(alt)}" />`;
    if (div.test(out)) {
      out = out.replace(div, img);
      replaced.push(id);
    }
  }

  if (replaced.length > 0) {
    // Inline scripts that reference echarts, and the CDN loader itself.
    out = out.replace(/<script[^>]*\becharts\b[^>]*>\s*<\/script>\s*/gi, "");
    out = out.replace(
      /<script(?![^>]*\bsrc\b)[^>]*>[\s\S]*?\becharts\s*\.\s*init\s*\([\s\S]*?<\/script>\s*/gi,
      ""
    );
  }

  return { content: out, replaced };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * One-shot helper: take pasted HTML, bake its ECharts charts into images and
 * return the rewritten HTML. Resolves to `null` when there is nothing to do.
 */
export async function convertEchartsHtmlToImages(
  html: string
): Promise<{ content: string; replaced: string[] } | null> {
  const ids = findEchartsChartIds(html);
  if (ids.length === 0) return null;

  const images = await renderEchartsToDataUrls(html, ids);
  if (Object.keys(images).length === 0) return null;

  return replaceChartsWithImages(html, images);
}
