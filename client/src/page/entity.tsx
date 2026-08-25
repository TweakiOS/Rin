import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Waiting } from "../components/loading";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import { endpoint } from "../app/runtime";

type EntityDetail = {
  id: number;
  slug: string;
  name: string;
  name_cn?: string | null;
  type: string;
  description: string;
  summary: string;
  outgoing?: { type: string; entity: any }[];
  incoming?: { type: string; entity: any }[];
  hashtags?: { id: number; name: string }[];
  feeds?: {
    id: number;
    title: string | null;
    summary: string;
    alias: string | null;
  }[];
};

const typeLabels: Record<string, string> = {
  concept: "概念",
  component: "组件",
  company: "公司",
  product: "产品",
};

export function EntityPage({ slug }: { slug: string }) {
  const siteConfig = useSiteConfig();
  const [entity, setEntity] = useState<EntityDetail>();
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    setStatus("loading");
    fetch(`${endpoint}/api/entity/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setEntity(data);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }, [slug]);

  if (status === "error") {
    return (
      <main className="w-full flex justify-center items-center py-20">
        <p className="text-neutral-500">实体不存在</p>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${entity?.name_cn || entity?.name || slug} - ${siteConfig.name}`}</title>
        <meta property="og:title" content={entity?.name_cn || entity?.name} />
        <meta property="og:site_name" content={siteName} />
      </Helmet>
      <Waiting for={entity || status === "idle"}>
        <main className="w-full flex flex-col justify-center items-center mb-8 ani-show">
          <div className="wauto text-start py-4">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-black dark:text-white">
                {entity?.name_cn || entity?.name}
              </h1>
              <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                {typeLabels[entity?.type || ""] || entity?.type}
              </span>
            </div>
            <p className="text-neutral-500 mt-2">{entity?.description}</p>
            {entity?.summary && (
              <p className="mt-4 text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {entity.summary}
              </p>
            )}
          </div>

        {/* 关联实体 */}
        {((entity?.outgoing?.length ?? 0) > 0 || (entity?.incoming?.length ?? 0) > 0) && (
        <div className="wauto mt-8">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            关联关系
            </h2>
            <div className="flex flex-col gap-3">
            {entity?.outgoing?.map((rel, i) => (
                <div key={`out-${i}`} className="flex items-center gap-2 text-sm">
                <span className="text-neutral-400">使用 / 关联 →</span>
                <Link
                    href={`/entity/${rel.entity.slug}`}
                    className="text-theme hover:underline"
                >
                    {rel.entity.name_cn || rel.entity.name}
                </Link>
                <span className="text-xs text-neutral-400">({rel.type})</span>
                </div>
            ))}
            {entity?.incoming?.map((rel, i) => (
                <div key={`in-${i}`} className="flex items-center gap-2 text-sm">
                <Link
                    href={`/entity/${rel.entity.slug}`}
                    className="text-theme hover:underline"
                >
                    {rel.entity.name_cn || rel.entity.name}
                </Link>
                <span className="text-neutral-400">→ 关联到此 ({rel.type})</span>
                </div>
            ))}
            </div>
        </div>
        )}
        
        {/* 下属标签 */}
        {entity?.hashtags && entity.hashtags.length > 0 && (
        <div className="wauto mt-8">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            下属标签
            </h2>
            <div className="flex flex-wrap gap-2">
            {entity.hashtags.map((tag) => (
                <Link
                key={tag.id}
                href={`/hashtag/${encodeURIComponent(tag.name)}`}
                className="px-3 py-1.5 rounded-full text-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-theme hover:text-white transition-colors"
                >
                #{tag.name}
                </Link>
            ))}
            </div>
        </div>
        )}

          {/* 相关文章 */}
          {entity?.feeds && entity.feeds.length > 0 && (
            <div className="wauto mt-10">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                相关分析文章
              </h2>
              <div className="flex flex-col gap-3">
                {entity.feeds.map((feed: any) => (
                  <Link
                    key={feed.id}
                    href={feed.alias ? `/${feed.alias}` : `/feed/${feed.id}`}
                    className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-theme transition-colors"
                  >
                    <h3 className="font-medium text-black dark:text-white">
                        {feed.title || "无标题"}
                    </h3>
                    {feed.summary && (
                      <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                        {feed.summary}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </Waiting>
    </>
  );
}