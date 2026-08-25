import { useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Waiting } from "../components/loading";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import { endpoint } from "../app/runtime";

type Entity = {
  id: number;
  slug: string;
  name: string;
  name_cn?: string | null;
  type: string;
  description: string;
  sort_order: number;
};

const typeLabels: Record<string, string> = {
  concept: "概念",
  component: "组件",
  company: "公司",
  product: "产品",
};

export function EntitiesPage() {
  const siteConfig = useSiteConfig();
  const [entities, setEntities] = useState<Entity[]>();
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${endpoint}/api/entity`)
      .then((res) => res.json())
      .then((data) => setEntities(data))
      .catch(console.error);
  }, []);

  const filtered =
    filter === "all"
      ? entities
      : entities?.filter((e) => e.type === filter);

  return (
    <>
      <Helmet>
        <title>{`知识树 - ${siteConfig.name}`}</title>
        <meta property="og:title" content="知识树" />
        <meta property="og:site_name" content={siteName} />
      </Helmet>
      <Waiting for={entities}>
        <main className="w-full flex flex-col justify-center items-center mb-8 ani-show">
          <div className="wauto text-start py-4 text-4xl font-bold">
            <p className="text-black dark:text-white">知识树</p>
            <p className="text-sm mt-4 text-neutral-500 font-normal">
              共 {filtered?.length || 0} 个实体
            </p>
          </div>

          {/* 类型筛选 */}
          <div className="wauto flex flex-wrap gap-3 mb-6">
            {["all", "concept", "component", "company", "product"].map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  filter === t
                    ? "bg-theme text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-theme/20"
                }`}
              >
                {t === "all" ? "全部" : typeLabels[t] || t}
              </button>
            ))}
          </div>

          <div className="wauto grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered?.map((entity) => (
              <Link
                key={entity.id}
                href={`/entity/${entity.slug}`}
                className="block p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 hover:border-theme hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-black dark:text-white">
                    {entity.name_cn || entity.name}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {typeLabels[entity.type] || entity.type}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 line-clamp-2">
                  {entity.description || "暂无描述"}
                </p>
              </Link>
            ))}
          </div>
        </main>
      </Waiting>
    </>
  );
}