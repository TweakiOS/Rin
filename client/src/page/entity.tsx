import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Waiting } from "../components/loading";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import { client, endpoint } from "../app/runtime";
import { ProfileContext } from "../state/profile";
import { Button } from "../components/button";
import { useAlert } from "../components/dialog";

type EntityDetail = {
  id: number;
  slug: string;
  name: string;
  name_cn?: string | null;
  type: string;
  description: string;
  summary: string;
  parent_id?: number | null;
  sort_order?: number;
  enabled?: number;
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
  const profile = useContext(ProfileContext);
  const isAdmin = !!profile?.permission;
  const [entity, setEntity] = useState<EntityDetail>();
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    name_cn: "",
    type: "concept",
    description: "",
    summary: "",
    sort_order: 0,
    enabled: 1,
  });
  const { showAlert, AlertUI } = useAlert();

  const load = () => {
    setStatus("loading");
    // 优先走带鉴权的 client；失败再 fallback
    const req = client.entity?.get
      ? client.entity.get(slug)
      : fetch(`${endpoint}/api/entity/${slug}`).then(async (res) => {
          if (!res.ok) return { error: { value: "not found" } };
          return { data: await res.json() };
        });

    Promise.resolve(req)
      .then((res: any) => {
        if (res.error || !res.data) {
          setStatus("error");
          return;
        }
        const data = res.data as EntityDetail;
        setEntity(data);
        setForm({
          name: data.name || "",
          name_cn: data.name_cn || "",
          type: data.type || "concept",
          description: data.description || "",
          summary: data.summary || "",
          sort_order: data.sort_order ?? 0,
          enabled: data.enabled === 0 ? 0 : 1,
        });
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    load();
  }, [slug]);

  const save = async () => {
    if (!client.entity?.update) {
      showAlert("Entity API 未配置 update 方法");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await client.entity.update(slug, {
        name: form.name,
        name_cn: form.name_cn || null,
        type: form.type,
        description: form.description,
        summary: form.summary,
        sort_order: form.sort_order,
        enabled: form.enabled,
      });
      if (error) {
        showAlert(error.value as string);
        return;
      }
      if (data) {
        setEntity((prev) => (prev ? { ...prev, ...data } : data));
        setEditing(false);
        showAlert("已保存");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    if (!client.entity?.toggle) {
      // fallback: 用 update
      const next = form.enabled === 1 ? 0 : 1;
      setForm((f) => ({ ...f, enabled: next }));
      const { error } = await client.entity.update(slug, { enabled: next });
      if (error) showAlert(error.value as string);
      else {
        setEntity((prev) => (prev ? { ...prev, enabled: next } : prev));
        showAlert(next === 1 ? "已启用" : "已禁用");
      }
      return;
    }
    const { data, error } = await client.entity.toggle(slug);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    if (data) {
      setEntity((prev) => (prev ? { ...prev, ...data } : data));
      setForm((f) => ({ ...f, enabled: data.enabled === 0 ? 0 : 1 }));
      showAlert(data.enabled === 1 ? "已启用" : "已禁用");
    }
  };

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
      <AlertUI />
      <Waiting for={entity || status === "idle"}>
        <main className="w-full flex flex-col justify-center items-center mb-8 ani-show">
          <div className="wauto text-start py-4">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-black dark:text-white">
                {entity?.name_cn || entity?.name}
              </h1>
              <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                {typeLabels[entity?.type || ""] || entity?.type}
              </span>
              {isAdmin && entity?.enabled === 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  已禁用
                </span>
              )}
              {isAdmin && (
                <div className="flex gap-2 ml-auto">
                  <Button
                    secondary
                    title={editing ? "取消" : "编辑"}
                    onClick={() => setEditing((v) => !v)}
                  />
                  <Button
                    secondary
                    title={entity?.enabled === 0 ? "启用" : "禁用"}
                    onClick={toggleEnabled}
                  />
                </div>
              )}
            </div>

            {!editing ? (
              <>
                <p className="text-neutral-500 mt-2">{entity?.description}</p>
                {entity?.summary && (
                  <p className="mt-4 text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {entity.summary}
                  </p>
                )}
              </>
            ) : (
              <div className="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="text-neutral-500">名称</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-neutral-500">中文名</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                      value={form.name_cn}
                      onChange={(e) => setForm({ ...form, name_cn: e.target.value })}
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-neutral-500">类型</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="concept">概念</option>
                      <option value="component">组件</option>
                      <option value="company">公司</option>
                      <option value="product">产品</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="text-neutral-500">排序</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                      value={form.sort_order}
                      onChange={(e) =>
                        setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                      }
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="text-neutral-500">描述</span>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-neutral-500">摘要</span>
                  <textarea
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.enabled === 1}
                    onChange={(e) =>
                      setForm({ ...form, enabled: e.target.checked ? 1 : 0 })
                    }
                  />
                  启用（取消勾选 = 禁用，前台不可见）
                </label>
                <div className="flex gap-2">
                  <Button title={saving ? "保存中..." : "保存"} disabled={saving} onClick={save} />
                  <Button secondary title="取消" onClick={() => setEditing(false)} />
                </div>
              </div>
            )}
          </div>

          {((entity?.outgoing?.length ?? 0) > 0 || (entity?.incoming?.length ?? 0) > 0) && (
            <div className="wauto mt-8">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">关联关系</h2>
              <div className="flex flex-col gap-3">
                {entity?.outgoing?.map((rel, i) => (
                  <div key={`out-${i}`} className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-400">使用 / 关联 →</span>
                    <Link href={`/entity/${rel.entity.slug}`} className="text-theme hover:underline">
                      {rel.entity.name_cn || rel.entity.name}
                    </Link>
                    <span className="text-xs text-neutral-400">({rel.type})</span>
                  </div>
                ))}
                {entity?.incoming?.map((rel, i) => (
                  <div key={`in-${i}`} className="flex items-center gap-2 text-sm">
                    <Link href={`/entity/${rel.entity.slug}`} className="text-theme hover:underline">
                      {rel.entity.name_cn || rel.entity.name}
                    </Link>
                    <span className="text-neutral-400">→ 关联到此 ({rel.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {entity?.hashtags && entity.hashtags.length > 0 && (
            <div className="wauto mt-8">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">下属标签</h2>
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

          {entity?.feeds && entity.feeds.length > 0 && (
            <div className="wauto mt-10">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">相关分析文章</h2>
              <div className="flex flex-col gap-3">
                {entity.feeds.map((feed: any) => (
                  <Link
                    key={feed.id}
                    href={feed.alias ? `/${feed.alias}` : `/feed/${feed.id}`}
                    className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-theme transition-colors"
                  >
                    <h3 className="font-medium text-black dark:text-white">{feed.title || "无标题"}</h3>
                    {feed.summary && (
                      <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{feed.summary}</p>
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