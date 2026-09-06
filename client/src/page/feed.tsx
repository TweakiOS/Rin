import type { Feed } from "@rin/api";
import { Modal } from "@rin/ui";
import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import Popup from "reactjs-popup";
import { Link, useLocation } from "wouter";
import { useAlert, useConfirm } from "../components/dialog";
import { HashTag } from "../components/hashtag";
import { ImageWithFallback } from "../components/image-with-fallback";
import { Waiting } from "../components/loading";
import { Markdown } from "../components/markdown";
import { client } from "../app/runtime";
import { ClientConfigContext } from "../state/config";
import { ProfileContext } from "../state/profile";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { siteName } from "../utils/constants";
import { timeago } from "../utils/timeago";
import { Button } from "../components/button";
import { Tips } from "../components/tips";
import { AdjacentSection } from "../components/adjacent_feed.tsx";
import { stripImageUrlMetadata } from "../utils/image-upload";

async function loadMermaid() {
  const module = await import("mermaid");
  return module.default;
}

function extractFirstMarkdownImageUrl(content: string) {
  const match = /!\[.*?\]\((\S+?)(?:\s+"[^"]*")?\)/.exec(content);
  if (!match) {
    return undefined;
  }

  return stripImageUrlMetadata(match[1]);
}

export function FeedPage({ id, TOC, clean }: { id: string; TOC: () => JSX.Element; clean: (id: string) => void }) {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const profile = useContext(ProfileContext);
  const [feed, setFeed] = useState<Feed>();
  const [error, setError] = useState<string>();
  const [headImage, setHeadImage] = useState<string>();
  const ref = useRef("");
  const [, setLocation] = useLocation();
  const { showAlert, AlertUI } = useAlert();
  const { showConfirm, ConfirmUI } = useConfirm();
  const [top, setTop] = useState<number>(0);
  const config = useContext(ClientConfigContext);
  const counterEnabled = config.getBoolean("counter.enabled");
  const hasAISummary = Boolean(feed?.ai_summary?.trim());
  const showAISummaryState =
    feed?.ai_summary_status === "pending" ||
    feed?.ai_summary_status === "processing" ||
    feed?.ai_summary_status === "failed";
  const hashtags = Array.isArray(feed?.hashtags) ? feed.hashtags : [];

  function deleteFeed() {
    showConfirm(t("article.delete.title"), t("article.delete.confirm"), () => {
      if (!feed) return;
      client.feed.delete(feed.id).then(({ error }) => {
        if (error) {
          showAlert(error.value as string);
        } else {
          showAlert(t("delete.success"));
          setLocation("/");
        }
      });
    });
  }

  function topFeed() {
    const isUnTop = !(top > 0);
    const topNew = isUnTop ? 1 : 0;
    showConfirm(
      isUnTop ? t("article.top.title") : t("article.untop.title"),
      isUnTop ? t("article.top.confirm") : t("article.untop.confirm"),
      () => {
        if (!feed) return;
        client.feed.setTop(feed.id, topNew).then(({ error }) => {
          if (error) {
            showAlert(error.value as string);
          } else {
            showAlert(isUnTop ? t("article.top.success") : t("article.untop.success"));
            setTop(topNew);
          }
        });
      },
    );
  }

  useEffect(() => {
    if (ref.current == id) return;
    setFeed(undefined);
    setError(undefined);
    setHeadImage(undefined);
    client.feed.get(id).then(({ data, error }) => {
      if (error) {
        setError(error.value as string);
      } else if (data && typeof data !== "string") {
        setTimeout(() => {
          setFeed(data as any);
          setTop(data.top || 0);
          const headImageUrl = extractFirstMarkdownImageUrl(data.content);
          if (headImageUrl) {
            setHeadImage(headImageUrl);
          }
          clean(id);
        }, 0);
      }
    });
    ref.current = id;
  }, [id]);

  useEffect(() => {
    const hasMermaid = document.querySelector("pre.mermaid_default, pre.mermaid_dark");
    if (!hasMermaid) return;
    let cancelled = false;
    loadMermaid().then((mermaid) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
      });
      mermaid
        .run({
          suppressErrors: true,
          nodes: document.querySelectorAll("pre.mermaid_default"),
        })
        .then(() => {
          if (cancelled) return;
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
          });
          mermaid.run({
            suppressErrors: true,
            nodes: document.querySelectorAll("pre.mermaid_dark"),
          });
        });
    });
    return () => {
      cancelled = true;
    };
  }, [feed]);

  return (
    <Waiting for={feed || error}>
      {feed && (
        <Helmet>
          <title>{`${feed.title ?? "Unnamed"} - ${siteConfig.name}`}</title>
          <meta property="og:site_name" content={siteName} />
          <meta property="og:title" content={feed.title ?? ""} />
          <meta property="og:image" content={headImage ?? siteConfig.avatar} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={document.URL} />
          <meta
            name="og:description"
            content={feed.content.length > 200 ? feed.content.substring(0, 200) : feed.content}
          />
          <meta name="author" content={feed.user.username} />
          <meta name="keywords" content={hashtags.map(({ name }) => name).join(", ")} />
          <meta
            name="description"
            content={feed.content.length > 200 ? feed.content.substring(0, 200) : feed.content}
          />
        </Helmet>
      )}
      <div className="flex w-full flex-row justify-center ani-show">
        {error && (
          <div className="mx-0 my-2 flex wauto flex-col items-center justify-center space-y-2 rounded-2xl bg-w px-3 py-3 sm:p-6">
            <h1 className="text-xl font-bold t-primary">{error}</h1>
            {error === "Not found" && id === "about" && <Tips value={t("about.notfound")} />}
            <Button title={t("index.back")} onClick={() => (window.location.href = "/")} />
          </div>
        )}
        {feed && !error && (
          <>
            <div className="xl:w-64" />
            <main className="wauto min-w-0">
              <article
                className="mx-0 my-2 rounded-2xl bg-w px-3 py-3 sm:px-6 sm:py-4"
                aria-label={feed.title ?? "Unnamed"}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="mb-1 mt-1 flex gap-1">
                      <p className="text-[12px] text-gray-400" title={new Date(feed.createdAt).toLocaleString()}>
                        {t("feed_card.published$time", {
                          time: timeago(feed.createdAt),
                        })}
                      </p>
                      {feed.createdAt !== feed.updatedAt && (
                        <p className="text-[12px] text-gray-400" title={new Date(feed.updatedAt).toLocaleString()}>
                          {t("feed_card.updated$time", {
                            time: timeago(feed.updatedAt),
                          })}
                        </p>
                      )}
                    </div>
                    {counterEnabled && (
                      <p className="text-[12px] font-normal text-gray-400 link-line">
                        <span> {t("count.pv")} </span>
                        <span>{feed.pv}</span>
                        <span> |</span>
                        <span> {t("count.uv")} </span>
                        <span>{feed.uv}</span>
                      </p>
                    )}
                    <div className="flex flex-row items-center">
                      <h1 className="break-all text-2xl font-bold t-primary">{feed.title}</h1>
                      <div className="h-0 w-0 flex-1" />
                    </div>
                  </div>
                  <div className="pt-2">
                    {profile?.permission && (
                      <div className="flex gap-2">
                        <button
                          aria-label={top > 0 ? t("untop.title") : t("top.title")}
                          onClick={topFeed}
                          className={`flex flex-1 flex-col items-end justify-center rounded-full px-2 py transition ${
                            top > 0
                              ? "bg-theme text-white hover:bg-theme-hover active:bg-theme-active"
                              : "bg-secondary bg-button dark:text-neutral-400"
                          }`}
                        >
                          <i className="ri-skip-up-line" />
                        </button>
                        <Link
                          aria-label={t("edit")}
                          href={`/admin/writing/${feed.id}`}
                          className="flex flex-1 flex-col items-end justify-center rounded-full bg-secondary bg-button px-2 py transition"
                        >
                          <i className="ri-edit-2-line dark:text-neutral-400" />
                        </Link>
                        <button
                          aria-label={t("delete.title")}
                          onClick={deleteFeed}
                          className="flex flex-1 flex-col items-end justify-center rounded-full bg-secondary bg-button px-2 py transition"
                        >
                          <i className="ri-delete-bin-7-line text-red-500" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {(hasAISummary || showAISummaryState) && (
                  <div className="my-4 rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 p-4 dark:border-purple-800/30 dark:from-purple-900/20 dark:to-blue-900/20">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <i className="ri-sparkling-2-fill text-purple-500" />
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          {t("ai_summary.title")}
                        </span>
                      </div>
                      {showAISummaryState ? (
                        <span className="rounded-full bg-white/70 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-white/10 dark:text-purple-300">
                          {t(`ai_summary.status.${feed.ai_summary_status}`)}
                        </span>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed t-secondary [overflow-wrap:anywhere]">
                      {hasAISummary ? feed.ai_summary : t(`ai_summary.message.${feed.ai_summary_status}`)}
                    </p>
                    {feed.ai_summary_status === "failed" && feed.ai_summary_error ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs text-rose-600 dark:text-rose-300 [overflow-wrap:anywhere]">
                        {feed.ai_summary_error}
                      </p>
                    ) : null}
                  </div>
                )}
                <Markdown content={feed.content} />
                <div className="mt-6 flex flex-col gap-2">
                  {hashtags.length > 0 && (
                    <div className="flex flex-row flex-wrap gap-x-2">
                      {hashtags.map(({ name }, index) => (
                        <HashTag key={index} name={name} />
                      ))}
                    </div>
                  )}
                  <div className="flex min-w-0 flex-row items-center">
                    <ImageWithFallback
                      src={feed.user.avatar || "/avatar.png"}
                      alt={feed.user.username}
                      className="h-8 w-8 rounded-full"
                    />
                    <div className="ml-2 min-w-0">
                      <span className="block cursor-default truncate text-sm text-gray-400">{feed.user.username}</span>
                    </div>
                  </div>
                </div>
              </article>
              {id !== "about" && <AdjacentSection id={id} setError={setError} />}
              {feed && <Comments id={`${feed.id}`} />}
              <div className="h-16" />
            </main>
            <div className="relative hidden w-80 lg:block">
              <div className="sticky start-0 end-0 top-[5.5rem]">
                <TOC />
              </div>
            </div>
          </>
        )}
      </div>
      <AlertUI />
      <ConfirmUI />
    </Waiting>
  );
}

export function TOCHeader({ TOC }: { TOC: () => JSX.Element }) {
  const [isOpened, setIsOpened] = useState(false);

  return (
    <div className="shrink-0 lg:hidden">
      <button
        onClick={() => setIsOpened(true)}
        className="flex h-10 w-10 flex-row items-center justify-center rounded-full"
      >
        <i className="ri-menu-2-line ri-lg text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 md:ri-sm md:t-secondary"></i>
      </button>
      <Modal
        isOpen={isOpened}
        onRequestClose={() => setIsOpened(false)}
        contentLabel="Table of contents"
        size="lg"
        panelClassName="p-4"
      >
        <div className="relative max-h-[75vh] overflow-auto t-primary">
          <TOC />
        </div>
      </Modal>
    </div>
  );
}

function CommentInput({ id, onRefresh }: { id: string; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestWebsite, setGuestWebsite] = useState("");
  const [error, setError] = useState("");
  const { showAlert, AlertUI } = useAlert();
  const profile = useContext(ProfileContext);
  const [, setLocation] = useLocation();
  const config = useContext(ClientConfigContext);
  const rawGuest = config.get("comment.guest.enabled");
  const guestEnabled = rawGuest !== false && rawGuest !== "false";

  function errorHumanize(error: string) {
    if (error === "Unauthorized") return t("login.required");
    else if (error === "Content is required") return t("comment.empty");
    else if (error === "Guest name is required") return t("comment.guest_name_required");
    return error;
  }

  function submit() {
    if (profile) {
      client.comment.create(parseInt(id), { content }).then(({ error }) => {
        if (error) {
          setError(errorHumanize(error.value as string));
        } else {
          setContent("");
          setError("");
          showAlert(t("comment.success"), () => {
            onRefresh();
          });
        }
      });
    } else if (guestEnabled) {
      if (!guestName.trim()) {
        setError(t("comment.guest_name_required"));
        return;
      }
      client.comment
        .create(parseInt(id), {
          content,
          guestName: guestName.trim(),
          guestEmail: guestEmail.trim() || undefined,
          guestWebsite: guestWebsite.trim() || undefined,
        })
        .then(({ error }) => {
          if (error) {
            setError(errorHumanize(error.value as string));
          } else {
            setContent("");
            setGuestName("");
            setGuestEmail("");
            setGuestWebsite("");
            setError("");
            showAlert(t("comment.success_pending"), () => {
              onRefresh();
            });
          }
        });
    } else {
      setLocation("/login");
    }
  }

  return (
    <div className="mx-0 my-2 flex w-full flex-col items-end rounded-2xl bg-w px-3 py-3 t-primary sm:p-6">
      <div className="mb-4 flex w-full flex-col items-start">
        <label htmlFor="comment">{t("comment.title")}</label>
      </div>
      {profile ? (
        <>
          <textarea
            id="comment"
            placeholder={t("comment.placeholder.title")}
            className="h-24 w-full rounded-lg bg-w"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button className="mt-4 rounded-full bg-theme px-4 py-2 text-white" onClick={submit}>
            {t("comment.submit")}
          </button>
        </>
      ) : guestEnabled ? (
        <>
          <input
            type="text"
            placeholder={t("comment.guest_name_placeholder")}
            className="mb-2 w-full rounded-lg border border-gray-200 bg-w px-3 py-2 dark:border-gray-700"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
          <input
            type="email"
            placeholder={t("comment.guest_email_placeholder")}
            className="mb-2 w-full rounded-lg border border-gray-200 bg-w px-3 py-2 dark:border-gray-700"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
          />
          <input
            type="url"
            placeholder={t("comment.guest_website_placeholder")}
            className="mb-2 w-full rounded-lg border border-gray-200 bg-w px-3 py-2 dark:border-gray-700"
            value={guestWebsite}
            onChange={(e) => setGuestWebsite(e.target.value)}
          />
          <textarea
            id="comment"
            placeholder={t("comment.placeholder.title")}
            className="h-24 w-full rounded-lg bg-w"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button className="mt-4 rounded-full bg-theme px-4 py-2 text-white" onClick={submit}>
            {t("comment.submit")}
          </button>
        </>
      ) : (
        <div className="flex w-full flex-row items-center justify-center space-x-2 py-12">
          <button className="mt-2 rounded-full bg-theme px-4 py-2 text-white" onClick={() => setLocation("/login")}>
            {t("login.required")}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <AlertUI />
    </div>
  );
}

type Comment = {
  id: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  approved?: number;
  user?: {
    id: number;
    username: string;
    avatar: string | null;
    permission: number | null;
  } | null;
  guestName?: string;
  guestEmail?: string;
  guestWebsite?: string;
};

function Comments({ id }: { id: string }) {
  const config = useContext(ClientConfigContext);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>();
  const ref = useRef("");
  const { t } = useTranslation();

  function loadComments() {
    client.comment.list(parseInt(id)).then(({ data, error }) => {
      if (error) {
        setError(error.value as string);
      } else if (data && Array.isArray(data)) {
        setComments(data as any);
      }
    });
  }

  useEffect(() => {
    if (ref.current == id) return;
    loadComments();
    ref.current = id;
  }, [id]);

  return (
    <>
      {config.getBoolean("comment.enabled") && (
        <div className="flex w-full flex-col">
          <CommentInput id={id} onRefresh={loadComments} />
          {error && (
            <div className="mx-0 my-2 flex w-full flex-col items-center justify-center rounded-2xl bg-w px-3 py-3 t-primary sm:p-6">
              <h1 className="text-xl font-bold t-primary">{error}</h1>
              <button className="mt-2 rounded-full bg-theme px-4 py-2 text-white" onClick={loadComments}>
                {t("reload")}
              </button>
            </div>
          )}
          {comments.length > 0 && (
            <div className="w-full">
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} onRefresh={loadComments} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CommentItem({ comment, onRefresh }: { comment: Comment; onRefresh: () => void }) {
  const { showConfirm, ConfirmUI } = useConfirm();
  const { showAlert, AlertUI } = useAlert();
  const { t } = useTranslation();
  const profile = useContext(ProfileContext);
  const commenterName = comment.user?.username || comment.guestName || t("anonymous");
  const commenterAvatar = comment.user?.avatar || "/avatar.png";
  const isPending = comment.approved === 0;
  const canModerate = !!profile?.permission;

  function deleteComment() {
    showConfirm(t("delete.comment.title"), t("delete.comment.confirm"), async () => {
      client.comment.delete(comment.id).then(({ error }) => {
        if (error) {
          showAlert(error.value as string);
        } else {
          showAlert(t("delete.success"), () => {
            onRefresh();
          });
        }
      });
    });
  }

  function approveComment() {
    client.comment.approve(comment.id).then(({ error }) => {
      if (error) {
        showAlert(error.value as string);
      } else {
        showAlert(t("comment_moderation.approve_success") || "评论已通过", () => {
          onRefresh();
        });
      }
    });
  }

  const websiteHref = comment.guestWebsite
    ? /^https?:\/\//i.test(comment.guestWebsite)
      ? comment.guestWebsite
      : `https://${comment.guestWebsite}`
    : null;

  return (
    <div className="mt-2 flex flex-row items-start">
      <ImageWithFallback src={commenterAvatar} alt={commenterName} className="mt-3 h-8 w-8 rounded-full" />
      <div className="ml-2 flex w-0 flex-1 flex-col rounded-xl bg-w p-3 sm:p-4">
        <div className="flex min-w-0 flex-row items-center gap-2">
          <span className="min-w-0 truncate text-base font-bold t-primary">{commenterName}</span>
          {canModerate && isPending && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {t("comment_moderation.guest") || "待审核"}
            </span>
          )}
          {websiteHref && (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="shrink-0 text-gray-400 transition-colors hover:text-theme"
              title={comment.guestWebsite}
            >
              <i className="ri-external-link-line"></i>
            </a>
          )}
          {canModerate && comment.guestEmail && (
            <a
              href={`mailto:${comment.guestEmail}`}
              className="shrink-0 text-gray-400 transition-colors hover:text-theme"
              title={`发邮件给 ${comment.guestEmail}`}
            >
              <i className="ri-mail-line"></i>
            </a>
          )}
          <div className="h-0 w-0 flex-1" />
          <span title={new Date(comment.createdAt).toLocaleString()} className="shrink-0 text-sm text-gray-400">
            {timeago(comment.createdAt)}
          </span>
        </div>
        <p className="break-words t-primary [overflow-wrap:anywhere]">{comment.content}</p>
        <div className="flex flex-row justify-end">
          {(canModerate || (comment.user && profile?.id == comment.user.id)) && (
            <Popup
              arrow={false}
              trigger={
                <button className="rounded-full bg-secondary px-2 py">
                  <i className="ri-more-fill t-secondary"></i>
                </button>
              }
              position="left center"
            >
              <div className="mr-2 flex flex-row gap-1 self-end">
                {canModerate && isPending && (
                  <button
                    onClick={approveComment}
                    aria-label={t("comment_moderation.approve") || "通过"}
                    title={t("comment_moderation.approve") || "通过"}
                    className="rounded-full bg-secondary px-2 py hover:bg-green-100 dark:hover:bg-green-900/30"
                  >
                    <i className="ri-check-line text-green-600 dark:text-green-400"></i>
                  </button>
                )}
                <button
                  onClick={deleteComment}
                  aria-label={t("delete.comment.title")}
                  className="rounded-full bg-secondary px-2 py"
                >
                  <i className="ri-delete-bin-2-line t-secondary"></i>
                </button>
              </div>
            </Popup>
          )}
        </div>
      </div>
      <ConfirmUI />
      <AlertUI />
    </div>
  );
}