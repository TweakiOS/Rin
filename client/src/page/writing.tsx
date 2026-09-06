import i18n from 'i18next';
import _ from 'lodash';
import { useCallback, useEffect, useMemo, useState } from "react";
import {Helmet} from "react-helmet";
import {useTranslation} from "react-i18next";
import Loading from 'react-loading';
import {ShowAlertType, useAlert} from '../components/dialog';
import {Checkbox, Input} from "../components/input";
import { DateTimeInput, FlatMetaRow, FlatPanel } from "@rin/ui";
import { client, endpoint } from "../app/runtime";
import {Cache} from '../utils/cache';
import {useSiteConfig} from "../hooks/useSiteConfig";
import {siteName} from "../utils/constants";
import mermaid from 'mermaid';
import { MarkdownEditor } from '../components/markdown_editor';

async function publish({
  title,
  alias,
  listed,
  content,
  summary,
  tags,
  draft,
  createdAt,
  onCompleted,
  showAlert
}: {
  title: string;
  listed: boolean;
  content: string;
  summary: string;
  tags: string[];
  draft: boolean;
  alias?: string;
  createdAt?: Date;
  onCompleted?: () => void;
  showAlert: ShowAlertType;
}) {
  const t = i18n.t
  const { data, error } = await client.feed.create(
    {
      title,
      alias,
      content,
      summary,
      tags,
      listed,
      draft,
      createdAt: createdAt?.toISOString(),
    }
  );
  if (onCompleted) {
    onCompleted();
  }
  if (error) {
    showAlert(error.value as string);
  }
  if (data) {
    showAlert(t("publish.success"), () => {
      Cache.with().clear();
      window.location.href = "/feed/" + data.insertedId;
    });
  }
}

async function update({
  id,
  title,
  alias,
  content,
  summary,
  tags,
  listed,
  draft,
  createdAt,
  onCompleted,
  showAlert
}: {
  id: number;
  listed: boolean;
  title?: string;
  alias?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  draft?: boolean;
  createdAt?: Date;
  onCompleted?: () => void;
  showAlert: ShowAlertType;
}) {
  const t = i18n.t
  const { error } = await client.feed.update(
    id,
    {
      title,
      alias,
      content,
      summary,
      tags,
      listed,
      draft,
      createdAt: createdAt?.toISOString(),
    }
  );
  if (onCompleted) {
    onCompleted();
  }
  if (error) {
    showAlert(error.value as string);
  } else {
    showAlert(t("update.success"), () => {
      Cache.with(id).clear();
      window.location.href = "/feed/" + id;
    });
  }
}

// 写作页面
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
  const [draft, setDraft] = useState(false);
  const [listed, setListed] = useState(true);
  const [content, setContent] = cache.useCache("content", "");
  const [createdAt, setCreatedAt] = useState<Date | undefined>(new Date());
  const [publishing, setPublishing] = useState(false)
  const { showAlert, AlertUI } = useAlert()
  function publishButton() {
    if (publishing) return;
    const tagsplit =
      tags
        .split("#")
        .filter((tag) => tag !== "")
        .map((tag) => tag.trim()) || [];
    if (id !== undefined) {
      setPublishing(true)
      update({
        id,
        title,
        content,
        summary,
        alias,
        tags: tagsplit,
        draft,
        listed,
        createdAt,
        onCompleted: () => {
          setPublishing(false)
        },
        showAlert
      });
    } else {
      if (!title) {
        showAlert(t("title_empty"))
        return;
      }
      if (!content) {
        showAlert(t("content.empty"))
        return;
      }
      setPublishing(true)
      publish({
        title,
        content,
        summary,
        tags: tagsplit,
        draft,
        alias,
        listed,
        createdAt,
        onCompleted: () => {
          setPublishing(false)
        },
        showAlert
      });
    }
  }

  // 已有：编辑时回填文章
  useEffect(() => {
    if (id) {
      client.feed
        .get(id)
        .then(({ data }) => {
          if (data) {
            if (title == "" && data.title) setTitle(data.title);
            if (tags == "" && Array.isArray(data.hashtags))
              setTags(data.hashtags.map(({ name }: { name: string }) => `#${name}`).join(" "));
            if (alias == "" && (data as any).alias) setAlias((data as any).alias);
            if (content == "") setContent(data.content);
            if (summary == "") setSummary((data as any).summary || "");
            setListed((data as any).listed === 1);
            setDraft((data as any).draft === 1);
            setCreatedAt(new Date(data.createdAt));
          }
        });
    }
  }, []);

  // 新增：加载全部标签供多选
  useEffect(() => {
    fetch(`${endpoint}/api/tag`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllTags(
            data.map((t: any) => ({
              id: t.id,
              name: t.name,
            })),
          );
        }
      })
      .catch(console.error);
  }, []);
  
  const debouncedUpdate = useCallback(
    _.debounce(() => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
      });
      mermaid.run({
        suppressErrors: true,
        nodes: document.querySelectorAll("pre.mermaid_default")
      }).then(()=>{
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
        });
        mermaid.run({
          suppressErrors: true,
          nodes: document.querySelectorAll("pre.mermaid_dark")
        });
      })
    }, 100),
    []
  );
  useEffect(() => {
    debouncedUpdate();
  }, [content, debouncedUpdate]);
  const selectedTagNames = useMemo(() => {
    return tags
      .split("#")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [tags]);

  function toggleTag(name: string) {
    const set = new Set(selectedTagNames);
    if (set.has(name)) {
      set.delete(name);
    } else {
      set.add(name);
    }
    const next = [...set].map((n) => `#${n}`).join(" ");
    setTags(next);
  }

  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return allTags;
    return allTags.filter((t) => t.name.toLowerCase().includes(q));
  }, [allTags, tagQuery]);
  function PublishButton({ className }: { className?: string }) {
    return (
      <button
        onClick={publishButton}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-theme px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-theme-hover active:bg-theme-active disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`}
        disabled={publishing}
      >
        {publishing && <Loading type="spin" height={16} width={16} />}
        <span>{t('publish.title')}</span>
      </button>
    );
  }

  function clearDraft() {
    cache.clear();
    setTitle("");
    setSummary("");
    setTags("");
    setAlias("");
    setContent("");
    setTagQuery("");
    setDraft(false);
    setListed(true);
    setCreatedAt(new Date());
  }
  
  function ClearDraftButton({ className }: { className?: string }) {
    return (
      <button
        type="button"
        onClick={() => {
          showAlert(t("markdown_editor.draft.clear_confirm"), clearDraft);
        }}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-transparent px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800 ${className ?? ""}`}
      >
        {t("markdown_editor.draft.clear")}
      </button>
    );
  }

  function MetaInput({ className }: { className?: string }) {
    return (
        <FlatPanel className={className}>
          <div className="flex flex-row gap-4 border-b border-black/5 pb-5 dark:border-white/5 items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-theme/70">{t('writing')}</p>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {id !== undefined ? t("update.title") : t("publish.title")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ClearDraftButton />
              <PublishButton className="w-auto" />
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Input
                id={id}
                value={title}
                setValue={setTitle}
                placeholder={t("title")}
                variant="flat"
                className="text-base"
              />
            </div>
            <Input
              id={id}
              value={summary}
              setValue={setSummary}
              placeholder={t("summary")}
              variant="flat"
            />
            <Input
              id={id}
              value={alias}
              setValue={setAlias}
              placeholder={t("alias")}
              variant="flat"
            />
            <div className="lg:col-span-2 space-y-3">
              <Input
                id={id}
                value={tags}
                setValue={setTags}
                placeholder={t("tags") || "#NVIDIA #H200"}
                variant="flat"
              />

              {/* 已选 chip */}
              {selectedTagNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTagNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleTag(name)}
                      className="px-3 py-1 rounded-full text-sm bg-theme text-white hover:opacity-90"
                    >
                      #{name} ×
                    </button>
                  ))}
                </div>
              )}

              {/* 搜索 + 候选 */}
              <input
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="搜索已有标签…"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-theme"
              />
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                {filteredTags.map((tag) => {
                  const active = selectedTagNames.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        active
                          ? "bg-theme text-white"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-theme/20"
                      }`}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
                {filteredTags.length === 0 && (
                  <span className="text-sm text-neutral-400">无匹配标签，可在上方输入框用 #新标签 添加</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(18rem,2fr)]">
            <FlatMetaRow
              className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3"
              onClick={() => setDraft(!draft)}
            >
              <p>{t('visible.self_only')}</p>
              <Checkbox
                id="draft"
                value={draft}
                setValue={setDraft}
                placeholder={t('draft')}
              />
            </FlatMetaRow>
            <FlatMetaRow
              className="cursor-pointer rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3"
              onClick={() => setListed(!listed)}
            >
              <p>{t('listed')}</p>
              <Checkbox
                id="listed"
                value={listed}
                setValue={setListed}
                placeholder={t('listed')}
              />
            </FlatMetaRow>
            <FlatMetaRow className="gap-3 rounded-none border-0 bg-transparent px-0 py-2 sm:rounded-2xl sm:border sm:bg-secondary sm:px-4 sm:py-3 xl:col-span-1">
              <p className="mr-2 whitespace-nowrap">
                {t('created_at')}
              </p>
              <DateTimeInput value={createdAt} onChange={setCreatedAt} className="w-full max-w-[16rem]" />
            </FlatMetaRow>
          </div>
        </FlatPanel>
    )
  }

  return (
    <>
      <Helmet>
        <title>{`${t('writing')} - ${siteConfig.name}`}</title>
        <meta property="og:site_name" content={siteName} />
        <meta property="og:title" content={t('writing')} />
        <meta property="og:image" content={siteConfig.avatar} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={document.URL} />
      </Helmet>
      <div className="flex flex-col gap-2 t-primary sm:gap-6">
        {MetaInput({
          className: "rounded-xl border border-black/10 p-2 sm:rounded-2xl sm:p-5 dark:border-white/10",
        })}
        <FlatPanel className="overflow-x-hidden rounded-xl border border-black/10 p-0 sm:rounded-2xl dark:border-white/10">
          <MarkdownEditor
            content={content}
            setContent={setContent}
            height="min(680px, calc(100dvh - 13rem))"
          />
        </FlatPanel>
      </div>
      <AlertUI />
    </>
  );
}
