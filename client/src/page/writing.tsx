import i18n from "i18next";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import Loading from "react-loading";
import { ShowAlertType, useAlert } from "../components/dialog";
import { Checkbox, Input } from "../components/input";
import { DateTimeInput, FlatMetaRow, FlatPanel } from "@rin/ui";
import { client, endpoint } from "../app/runtime";
import { Cache } from "../utils/cache";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import mermaid from "mermaid";
import { MarkdownEditor } from "../components/markdown_editor";

type SubmitPayload = {
  title: string;
  listed: boolean;
  content: string;
  summary: string;
  tags: string[];
  draft: boolean;
  alias?: string;
  createdAt?: Date;
  encrypted?: boolean;
  password?: string;
  onCompleted?: () => void;
  showAlert: ShowAlertType;
};

async function publish(p: SubmitPayload) {
  const t = i18n.t;
  const { data, error } = await client.feed.create({
    title: p.title,
    alias: p.alias,
    content: p.content,
    summary: p.summary,
    tags: p.tags,
    listed: p.listed,
    draft: p.draft,
    createdAt: p.createdAt?.toISOString(),
    encrypted: p.encrypted,
    password: p.password,
  } as any);
  p.onCompleted?.();
  if (error) p.showAlert(error.value as string);
  if (data) {
    p.showAlert(t(p.draft ? "markdown_editor.draft.saved" : "publish.success"), () => {
      Cache.with().clear();
      window.location.href = "/feed/" + data.insertedId;
    });
  }
}

async function update(p: SubmitPayload & { id: number }) {
  const t = i18n.t;
  const { error } = await client.feed.update(p.id, {
    title: p.title,
    alias: p.alias,
    content: p.content,
    summary: p.summary,
    tags: p.tags,
    listed: p.listed,
    draft: p.draft,
    createdAt: p.createdAt?.toISOString(),
    encrypted: p.encrypted,
    password: p.password,
  } as any);
  p.onCompleted?.();
  if (error) p.showAlert(error.value as string);
  else {
    p.showAlert(t(p.draft ? "markdown_editor.draft.saved" : "update.success"), () => {
      Cache.with(p.id).clear();
      window.location.href = "/feed/" + p.id;
    });
  }
}

export function WritingPage({ id }: { id?: number }) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const cache = Cache.with(id);
  const [title, setTitle] = cache.useCache("title", "");
  const [summary, setSummary] = cache.useCache("summary", "");
  const [tags, setTags] = cache.useCache("tags", "");
  const [allTags, setAllTags] = useState<{ id: number; name: string }[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [alias, setAlias] = cache.useCache("alias", "");
  const [listed, setListed] = useState(true);
  const [encrypted, setEncrypted] = useState(false);
  const [password, setPassword] = useState("");
  const [content, setContent] = cache.useCache("content", "");
  const [createdAt, setCreatedAt] = useState<Date | undefined>(new Date());
  const [publishing, setPublishing] = useState(false);
  const { showAlert, AlertUI } = useAlert();

  function submitArticle(asDraft: boolean) {
    if (publishing) return;
    if (encrypted && !password.trim() && id === undefined) {
      showAlert(t("feed.password_required"));
      return;
    }
    const tagsplit = tags.split("#").filter((tag) => tag !== "").map((tag) => tag.trim()) || [];
    const payload: SubmitPayload = {
      title,
      content,
      summary,
      alias,
      tags: tagsplit,
      draft: asDraft,
      listed: asDraft ? false : listed,
      createdAt,
      encrypted,
      password: password.trim() ? password : undefined,
      onCompleted: () => setPublishing(false),
      showAlert,
    };
    if (id !== undefined) {
      setPublishing(true);
      update({ id, ...payload });
      return;
    }
    if (!title) {
      showAlert(t("title_empty"));
      return;
    }
    if (!content) {
      showAlert(t("content.empty"));
      return;
    }
    setPublishing(true);
    publish(payload);
  }

  useEffect(() => {
    if (!id) return;
    client.feed.get(id).then(({ data }) => {
      if (!data) return;
      if (title == "" && data.title) setTitle(data.title);
      if (tags == "" && Array.isArray(data.hashtags)) {
        setTags(data.hashtags.map(({ name }: { name: string }) => `#${name}`).join(" "));
      }
      if (alias == "" && (data as any).alias) setAlias((data as any).alias);
      if (content == "") setContent(data.content);
      if (summary == "") setSummary((data as any).summary || "");
      setListed((data as any).listed === 1);
      setEncrypted(Boolean((data as any).encrypted));
      setCreatedAt(new Date(data.createdAt));
    });
  }, []);

  useEffect(() => {
    fetch(`${endpoint}/api/tag`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAllTags(data.map((item: any) => ({ id: item.id, name: item.name })));
      })
      .catch(console.error);
  }, []);

  const debouncedUpdate = useCallback(
    _.debounce(() => {
      mermaid.initialize({ startOnLoad: false, theme: "default" });
      mermaid.run({ suppressErrors: true, nodes: document.querySelectorAll("pre.mermaid_default") }).then(() => {
        mermaid.initialize({ startOnLoad: false, theme: "dark" });
        mermaid.run({ suppressErrors: true, nodes: document.querySelectorAll("pre.mermaid_dark") });
      });
    }, 100),
    [],
  );
  useEffect(() => {
    debouncedUpdate();
  }, [content, debouncedUpdate]);

  const selectedTagNames = useMemo(
    () => tags.split("#").map((item) => item.trim()).filter(Boolean),
    [tags],
  );

  function toggleTag(name: string) {
    const set = new Set(selectedTagNames);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    setTags([...set].map((n) => `#${n}`).join(" "));
  }

  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((item) => item.name.toLowerCase().includes(q));
  }, [allTags, tagQuery]);

  function clearDraft() {
    cache.clear();
    setTitle("");
    setSummary("");
    setTags("");
    setAlias("");
    setContent("");
    setTagQuery("");
    setListed(true);
    setEncrypted(false);
    setPassword("");
    setCreatedAt(new Date());
  }

  return (
    <>
      <Helmet>
        <title>{`${t("writing")} - ${siteConfig.name}`}</title>
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content={t("writing")} />
        <meta property="og:image" content={siteConfig.avatar} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={document.URL} />
      </Helmet>
      <div className="flex flex-col gap-2 t-primary sm:gap-6">
        <FlatPanel className="rounded-xl border border-black/10 p-2 sm:rounded-2xl sm:p-5 dark:border-white/10">
          <div className="flex flex-row items-start justify-between gap-4 border-b border-black/5 pb-5 dark:border-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-theme/70">{t("writing")}</p>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {id !== undefined ? t("update.title") : t("publish.title")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => showAlert(t("markdown_editor.draft.clear_confirm"), clearDraft)}
                className="inline-flex items-center justify-center rounded-xl border border-black/10 px-5 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {t("markdown_editor.draft.clear")}
              </button>
              <button
                type="button"
                onClick={() => submitArticle(true)}
                disabled={publishing}
                className="inline-flex items-center justify-center rounded-xl border border-black/10 px-5 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-60 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {t("markdown_editor.draft.save")}
              </button>
              <button
                type="button"
                onClick={() => submitArticle(false)}
                disabled={publishing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-theme px-5 py-3 text-sm font-medium text-white hover:bg-theme-hover disabled:opacity-60"
              >
                {publishing && <Loading type="spin" height={16} width={16} />}
                <span>{t("publish.title")}</span>
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Input id={id} value={title} setValue={setTitle} placeholder={t("title")} variant="flat" className="text-base" />
            </div>
            <Input id={id} value={summary} setValue={setSummary} placeholder={t("summary")} variant="flat" />
            <Input id={id} value={alias} setValue={setAlias} placeholder={t("alias")} variant="flat" />
            <div className="lg:col-span-2 space-y-3">
              <Input id={id} value={tags} setValue={setTags} placeholder={t("tags") || "#NVIDIA #H200"} variant="flat" />
              {selectedTagNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTagNames.map((name) => (
                    <button key={name} type="button" onClick={() => toggleTag(name)} className="rounded-full bg-theme px-3 py-1 text-sm text-white">
                      #{name} ×
                    </button>
                  ))}
                </div>
              )}
              <input
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="搜索已有标签…"
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-theme dark:border-neutral-700"
              />
              <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.name)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      selectedTagNames.includes(tag.name)
                        ? "bg-theme text-white"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                  >
                    #{tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:gap-3 xl:grid-cols-3">
            <FlatMetaRow
              className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3"
              onClick={() => setListed(!listed)}
            >
              <p>{t("listed")}</p>
              <Checkbox id="listed" value={listed} setValue={setListed} placeholder={t("listed")} />
            </FlatMetaRow>
            <FlatMetaRow
              className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3"
              onClick={() => setEncrypted(!encrypted)}
            >
              <p>{t("encrypted")}</p>
              <Checkbox id="encrypted" value={encrypted} setValue={setEncrypted} placeholder={t("encrypted")} />
            </FlatMetaRow>
            <FlatMetaRow className="gap-3 rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3">
              <p className="mr-2 whitespace-nowrap">{t("created_at")}</p>
              <DateTimeInput value={createdAt} onChange={setCreatedAt} className="w-full max-w-[16rem]" />
            </FlatMetaRow>
          </div>
          {encrypted && (
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={id ? t("feed.password_keep") : t("feed.password")}
              className="mt-4 w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            />
          )}
        </FlatPanel>
        <FlatPanel className="overflow-x-hidden rounded-xl border border-black/10 p-0 sm:rounded-2xl dark:border-white/10">
          <MarkdownEditor content={content} setContent={setContent} height="min(680px, calc(100dvh - 13rem))" />
        </FlatPanel>
      </div>
      <AlertUI />
    </>
  );
}