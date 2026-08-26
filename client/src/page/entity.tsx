import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { Waiting } from "../components/loading";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import { client, endpoint } from "../app/runtime";
import { ProfileContext } from "../state/profile";
import { Button } from "../components/button";
import { useAlert } from "../components/dialog";
import { EntityPicker } from "../components/entity-picker";

type RelEntity = {
  id: number;
  slug: string;
  name: string;
  name_cn?: string | null;
  type?: string;
  enabled?: number;
};

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
  parent?: RelEntity | null;
  children?: RelEntity[];
  outgoing?: { id: number; type: string; entity: RelEntity }[];
  incoming?: { id: number; type: string; entity: RelEntity }[];
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

const relationLabels: Record<string, string> = {
  uses: "使用",
  supplier: "供应商",
  product_of: "所属公司",
  competitor: "竞品",
  related: "相关",
};

export function EntityPage({ slug }: { slug: string }) {
  const siteConfig = useSiteConfig();
  const profile = useContext(ProfileContext);
  const isAdmin = !!profile?.permission;
  const [, setLocation] = useLocation();
  const [entity, setEntity] = useState<EntityDetail>();
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [relType, setRelType] = useState("related");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"reparent" | "orphan">("reparent");
  const [impact, setImpact] = useState<{
    children: RelEntity[];
    relations: number;
    hashtags: number;
    feeds: number;
  } | null>(null);
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
    const { data, error } = await client.entity.toggle(slug);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    if (data) {
      setEntity((prev) => (prev ? { ...prev, ...data } : prev));
      setForm((f) => ({ ...f, enabled: data.enabled === 0 ? 0 : 1 }));
      showAlert(data.enabled === 1 ? "已启用" : "已禁用");
    }
  };

  const setParent = async (parentSlug: string | null) => {
    const { error } = await client.entity.setParent(slug, parentSlug);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    load();
  };

  const addRelation = async (toSlug: string) => {
    const { error } = await client.entity.addRelation(slug, {
      to_slug: toSlug,
      relation_type: relType,
    });
    if (error) {
      showAlert(error.value as string);
      return;
    }
    load();
  };

  const removeRelation = async (id: number) => {
    const { error } = await client.entity.removeRelation(slug, id);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    load();
  };

  const addHashtag = async () => {
    const name = tagInput.trim().replace(/^#/, "");
    if (!name) return;
    const { error } = await client.entity.addHashtag(slug, name);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    setTagInput("");
    load();
  };

  const removeHashtag = async (name: string) => {
    const { error } = await client.entity.removeHashtag(slug, name);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    load();
  };

  const openDelete = async () => {
    const { data, error } = await client.entity.impact(slug);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    if (data) {
      setImpact(data);
      setDeleteMode(data.children.length ? "reparent" : "reparent");
      setDeleteOpen(true);
    }
  };

  const confirmDelete = async () => {
    const mode = (impact?.children.length || 0) > 0 ? deleteMode : "forbid";
    const { error } = await client.entity.remove(slug, mode);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    setLocation("/entities");
  };

  const mergeFrom = async (sourceSlug: string) => {
    const { error } = await client.entity.merge(slug, sourceSlug);
    if (error) {
      showAlert(error.value as string);
      return;
    }
    showAlert("已合并");
    load();
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
                <div className="flex flex-wrap gap-2 ml-auto">
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
                  <Button secondary title="删除" onClick={openDelete} />
                </div>
              )}
            </div>

            <div className="text-sm text-neutral-500 mb-4">
              父节点：
              {entity?.parent ? (
                <Link href={`/entity/${entity.parent.slug}`} className="text-theme hover:underline">
                  {entity.parent.name_cn || entity.parent.name}
                </Link>
              ) : (
                <span>无（根节点）</span>
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

          {isAdmin && (
            <div className="wauto mt-6 space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <h2 className="text-xl font-semibold text-black dark:text-white">树结构</h2>
              <div className="text-sm">
                <span className="text-neutral-500">设置父节点</span>
                <div className="mt-2">
                  {entity?.parent ? (
                    <div className="mb-2 flex items-center gap-2">
                      <Link href={`/entity/${entity.parent.slug}`} className="text-theme hover:underline">
                        {entity.parent.name_cn || entity.parent.name}
                      </Link>
                      <button
                        type="button"
                        className="text-xs text-neutral-400 hover:text-red-500"
                        onClick={() => setParent(null)}
                      >
                        变为根节点
                      </button>
                    </div>
                  ) : null}
                  <EntityPicker excludeId={entity?.id} onSelect={(e) => setParent(e.slug)} />
                </div>
              </div>
              {!!entity?.children?.length && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {entity.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/entity/${child.slug}`}
                      className="rounded-full bg-neutral-100 px-3 py-1 text-sm dark:bg-neutral-800"
                    >
                      {child.name_cn || child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="wauto mt-8">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">关联关系</h2>
            <div className="flex flex-col gap-3">
              {entity?.outgoing?.map((rel) => (
                <div key={`out-${rel.id}`} className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-400">
                    {relationLabels[rel.type] || rel.type} →
                  </span>
                  <Link href={`/entity/${rel.entity.slug}`} className="text-theme hover:underline">
                    {rel.entity.name_cn || rel.entity.name}
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      className="text-xs text-neutral-400 hover:text-red-500"
                      onClick={() => removeRelation(rel.id)}
                    >
                      解除
                    </button>
                  )}
                </div>
              ))}
              {entity?.incoming?.map((rel) => (
                <div key={`in-${rel.id}`} className="flex items-center gap-2 text-sm">
                  <Link href={`/entity/${rel.entity.slug}`} className="text-theme hover:underline">
                    {rel.entity.name_cn || rel.entity.name}
                  </Link>
                  <span className="text-neutral-400">
                    → {relationLabels[rel.type] || rel.type}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="text-xs text-neutral-400 hover:text-red-500"
                      onClick={() => removeRelation(rel.id)}
                    >
                      解除
                    </button>
                  )}
                </div>
              ))}
              {!entity?.outgoing?.length && !entity?.incoming?.length && (
                <p className="text-sm text-neutral-400">暂无关联</p>
              )}
            </div>
            {isAdmin && (
              <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
                <select
                  className="rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                >
                  <option value="related">相关</option>
                  <option value="uses">使用</option>
                  <option value="supplier">供应商</option>
                  <option value="product_of">所属公司</option>
                  <option value="competitor">竞品</option>
                </select>
                <EntityPicker
                  excludeId={entity?.id}
                  placeholder="搜索并添加关联目标"
                  onSelect={(e) => addRelation(e.slug)}
                />
              </div>
            )}
          </div>

          <div className="wauto mt-8">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">下属标签</h2>
            <div className="flex flex-wrap gap-2">
              {entity?.hashtags?.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-sm dark:bg-neutral-800"
                >
                  <Link href={`/hashtag/${encodeURIComponent(tag.name)}`}>#{tag.name}</Link>
                  {isAdmin && (
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-red-500"
                      onClick={() => removeHashtag(tag.name)}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {isAdmin && (
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                  placeholder="输入标签后回车，如 gpu"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHashtag();
                    }
                  }}
                />
                <Button secondary title="添加" onClick={addHashtag} />
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="wauto mt-8 space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <h2 className="text-xl font-semibold text-black dark:text-white">合并重复实体</h2>
              <p className="text-sm text-neutral-500">
                选择一个将被删除的源实体，它的关系、标签、文章和子节点会迁到当前实体。
              </p>
              <EntityPicker excludeId={entity?.id} placeholder="搜索要合并进来的实体" onSelect={(e) => mergeFrom(e.slug)} />
            </div>
          )}

          {isAdmin && deleteOpen && impact && (
            <div className="wauto mt-8 space-y-3 rounded-xl border border-red-200 p-4 dark:border-red-900">
              <h2 className="text-xl font-semibold text-red-600">确认删除</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                将删除「{entity?.name_cn || entity?.name}」。关系 {impact.relations} 条、标签{" "}
                {impact.hashtags} 个、文章关联 {impact.feeds} 条会随外键一并清除。
              </p>
              {impact.children.length > 0 && (
                <>
                  <p className="text-sm text-neutral-500">
                    还有 {impact.children.length} 个子节点：
                    {impact.children.map((x) => x.name_cn || x.name).join("、")}
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={deleteMode === "reparent"}
                      onChange={() => setDeleteMode("reparent")}
                    />
                    子节点提升到当前父节点
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={deleteMode === "orphan"}
                      onChange={() => setDeleteMode("orphan")}
                    />
                    子节点变为根节点
                  </label>
                </>
              )}
              <div className="flex gap-2">
                <Button title="确认删除" onClick={confirmDelete} />
                <Button secondary title="取消" onClick={() => setDeleteOpen(false)} />
              </div>
            </div>
          )}

          {entity?.feeds && entity.feeds.length > 0 && (
            <div className="wauto mt-10">
              <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">相关分析文章</h2>
              <div className="flex flex-col gap-3">
                {entity.feeds.map((feed) => (
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