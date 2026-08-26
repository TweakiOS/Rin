import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useLocation } from "wouter";
import { Waiting } from "../components/loading";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import { client } from "../app/runtime";
import { ProfileContext } from "../state/profile";
import { Button } from "../components/button";
import { useAlert } from "../components/dialog";
import { EntityPicker } from "../components/entity-picker";

type Entity = {
  id: number;
  slug: string;
  name: string;
  name_cn?: string | null;
  type: string;
  description: string;
  sort_order: number;
  enabled?: number;
  parent_id?: number | null;
  children?: Entity[];
};

const typeLabels: Record<string, string> = {
  concept: "概念",
  component: "组件",
  company: "公司",
  product: "产品",
};

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, "");
}

function TreeNode({ node, depth }: { node: Entity; depth: number }) {
  return (
    <div>
      <Link
        href={`/entity/${node.slug}`}
        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        style={{ paddingLeft: 12 + depth * 16 }}
      >
        <span className="text-black dark:text-white">
          {node.name_cn || node.name}
        </span>
        <span className="text-xs text-neutral-400">
          {typeLabels[node.type] || node.type}
        </span>
        {node.enabled === 0 && (
          <span className="text-xs text-amber-600">已禁用</span>
        )}
      </Link>
      {node.children?.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function EntitiesPage() {
  const siteConfig = useSiteConfig();
  const profile = useContext(ProfileContext);
  const isAdmin = !!profile?.permission;
  const [, setLocation] = useLocation();
  const { showAlert, AlertUI } = useAlert();

  const [entities, setEntities] = useState<Entity[]>();
  const [tree, setTree] = useState<Entity[]>();
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"cards" | "tree">("cards");
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    name_cn: "",
    type: "concept",
    description: "",
    parent_slug: "" as string | null,
  });

  const load = async () => {
    const listReq = client.entity.list({
      include_disabled: isAdmin && includeDisabled,
    });
    const treeReq = client.entity.tree(isAdmin && includeDisabled);
    const [listRes, treeRes] = await Promise.all([listReq, treeReq]);
    if (listRes.data) setEntities(listRes.data);
    if (treeRes.data) setTree(treeRes.data);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [isAdmin, includeDisabled]);

  const filtered =
    filter === "all" ? entities : entities?.filter((e) => e.type === filter);

  const create = async () => {
    const slug = form.slug.trim() || toSlug(form.name_cn || form.name);
    if (!slug || !form.name.trim()) {
      showAlert("名称和 slug 必填");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await client.entity.create({
        slug,
        name: form.name.trim(),
        name_cn: form.name_cn.trim() || null,
        type: form.type,
        description: form.description,
        parent_slug: form.parent_slug || null,
      });
      if (error) {
        showAlert(error.value as string);
        return;
      }
      if (data?.slug) setLocation(`/entity/${data.slug}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{`知识树 - ${siteConfig.name}`}</title>
        <meta property="og:title" content="知识树" />
        <meta property="og:site_name" content={siteName} />
      </Helmet>
      <AlertUI />
      <Waiting for={entities}>
        <main className="w-full flex flex-col justify-center items-center mb-8 ani-show">
          <div className="wauto text-start py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-bold text-black dark:text-white">知识树</p>
                <p className="text-sm mt-4 text-neutral-500 font-normal">
                  共 {filtered?.length || 0} 个实体
                </p>
              </div>
              {isAdmin && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    secondary
                    title={view === "cards" ? "树视图" : "卡片视图"}
                    onClick={() => setView(view === "cards" ? "tree" : "cards")}
                  />
                  <Button
                    secondary
                    title={includeDisabled ? "隐藏已禁用" : "显示已禁用"}
                    onClick={() => setIncludeDisabled((v) => !v)}
                  />
                  <Button
                    title={creating ? "取消新建" : "新建实体"}
                    secondary={creating}
                    onClick={() => setCreating((v) => !v)}
                  />
                </div>
              )}
            </div>
          </div>

          {isAdmin && creating && (
            <div className="wauto mb-6 space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm">
                  <span className="text-neutral-500">名称</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((f) => ({
                        ...f,
                        name,
                        slug: f.slug || toSlug(name),
                      }));
                    }}
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
                  <span className="text-neutral-500">Slug</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
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
              </div>
              <label className="block text-sm">
                <span className="text-neutral-500">父节点（可选）</span>
                <div className="mt-1">
                  {form.parent_slug ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span>{form.parent_slug}</span>
                      <button
                        type="button"
                        className="text-neutral-400 hover:text-red-500"
                        onClick={() => setForm({ ...form, parent_slug: "" })}
                      >
                        清除
                      </button>
                    </div>
                  ) : (
                    <EntityPicker
                      onSelect={(e) => setForm({ ...form, parent_slug: e.slug })}
                    />
                  )}
                </div>
              </label>
              <label className="block text-sm">
                <span className="text-neutral-500">描述</span>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 dark:border-neutral-700"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <Button title={saving ? "创建中..." : "创建"} disabled={saving} onClick={create} />
            </div>
          )}

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

          {view === "tree" ? (
            <div className="wauto rounded-2xl border border-neutral-200 dark:border-neutral-700 py-2">
              {tree?.length ? (
                tree.map((node) => <TreeNode key={node.id} node={node} depth={0} />)
              ) : (
                <p className="px-4 py-6 text-sm text-neutral-500">暂无树数据</p>
              )}
            </div>
          ) : (
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
                    <div className="flex items-center gap-2">
                      {entity.enabled === 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          已禁用
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {typeLabels[entity.type] || entity.type}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 line-clamp-2">
                    {entity.description || "暂无描述"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </main>
      </Waiting>
    </>
  );
}