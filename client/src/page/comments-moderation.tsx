import { SettingsBadge, SettingsCard, SettingsCardBody, SettingsCardHeader, Spinner } from "@rin/ui";
import { useCallback, useState } from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { client } from "../app/runtime";
import { Button } from "../components/button";
import { useAlert, useConfirm } from "../components/dialog";
import { useApiResource } from "../hooks/use-api-resource";
import { useSiteConfig } from "../hooks/useSiteConfig";
import { timeago } from "../utils/timeago";

export type PendingComment = {
  id: number;
  content: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  approved?: number;
  guestName?: string | null;
  guestEmail?: string | null;
  guestWebsite?: string | null;
  user?: {
    id: number;
    username: string;
    avatar: string | null;
    permission: number | null;
  } | null;
  feed?: {
    id: number;
    title: string | null;
    alias: string | null;
  } | null;
};

function feedHref(feed?: PendingComment["feed"]) {
  if (!feed) return "/";
  if (feed.alias) return `/${feed.alias}`;
  return `/feed/${feed.id}`;
}

function PendingCommentCard({
  item,
  loadingAction,
  onApprove,
  onDelete,
}: {
  item: PendingComment;
  loadingAction?: "approve" | "delete";
  onApprove: (item: PendingComment) => void;
  onDelete: (item: PendingComment) => void;
}) {
  const { t } = useTranslation();
  const name = item.user?.username || item.guestName || t("anonymous");
  const isGuest = !item.user;
  const title = item.feed?.title?.trim() || t("comment_moderation.no_title");

  return (
    <SettingsCard tone="warning">
      <SettingsCardHeader
        title={name}
        description={t("comment_moderation.article", { title })}
        badge={
          <SettingsBadge tone="warning">
            {isGuest ? t("comment_moderation.guest") : t("comment_moderation.user")}
          </SettingsBadge>
        }
      />
      <SettingsCardBody>
        <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
          <p className="whitespace-pre-wrap break-words t-primary [overflow-wrap:anywhere]">{item.content}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            {item.feed ? (
              <Link href={feedHref(item.feed)} className="text-theme hover:underline">
                {t("comment_moderation.feed_id", { id: item.feed.id })}
              </Link>
            ) : null}
            <span title={new Date(item.createdAt).toLocaleString()}>{timeago(item.createdAt)}</span>
            {item.guestEmail ? <span>{item.guestEmail}</span> : null}
            {item.guestWebsite ? (
              <a
                href={/^https?:\/\//i.test(item.guestWebsite) ? item.guestWebsite : `https://${item.guestWebsite}`}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="text-theme hover:underline"
              >
                {item.guestWebsite}
              </a>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              title={loadingAction === "approve" ? t("comment_moderation.approving") : t("comment_moderation.approve")}
              disabled={loadingAction !== undefined}
              onClick={() => onApprove(item)}
            />
            <Button
              secondary
              title={loadingAction === "delete" ? t("comment_moderation.deleting") : t("comment_moderation.delete")}
              disabled={loadingAction !== undefined}
              onClick={() => onDelete(item)}
            />
          </div>
        </div>
      </SettingsCardBody>
    </SettingsCard>
  );
}

export function CommentsModerationPage() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const loadPending = useCallback(() => client.comment.pending(), []);
  const { data, loading, error, reload } = useApiResource<PendingComment[]>(loadPending);
  const items = Array.isArray(data) ? data : [];
  const [actingId, setActingId] = useState<number | null>(null);
  const [actingType, setActingType] = useState<"approve" | "delete" | null>(null);
  const { showAlert, AlertUI } = useAlert();
  const { showConfirm, ConfirmUI } = useConfirm();

  return (
    <div className="flex w-full flex-col gap-4">
      <Helmet>
        <title>{`${t("comment_moderation.title")} - ${siteConfig.name}`}</title>
      </Helmet>

      <AlertUI />
      <ConfirmUI />

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard tone={items.length > 0 ? "warning" : "success"}>
          <SettingsCardHeader
            title={String(items.length)}
            description={t("comment_moderation.pending_count", { count: items.length })}
          />
        </SettingsCard>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8 text-sm text-neutral-500 dark:text-neutral-400">
          <Spinner label={t("comment_moderation.loading")} />
          <span>{t("comment_moderation.loading")}</span>
        </div>
      ) : null}

      {error ? (
        <SettingsCard tone="danger">
          <SettingsCardHeader title={t("comment_moderation.load_failed")} description={error} />
        </SettingsCard>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <SettingsCard>
          <SettingsCardHeader
            title={t("comment_moderation.empty_title")}
            description={t("comment_moderation.empty_description")}
          />
        </SettingsCard>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <PendingCommentCard
              key={item.id}
              item={item}
              loadingAction={actingId === item.id ? actingType ?? undefined : undefined}
              onApprove={(entry) => {
                setActingId(entry.id);
                setActingType("approve");
                client.comment
                  .approve(entry.id)
                  .then(({ error }) => {
                    if (error) {
                      showAlert(error.value as string);
                      return;
                    }
                    showAlert(t("comment_moderation.approve_success"));
                    void reload();
                  })
                  .finally(() => {
                    setActingId(null);
                    setActingType(null);
                  });
              }}
              onDelete={(entry) => {
                showConfirm(
                  t("comment_moderation.delete_confirm_title"),
                  t("comment_moderation.delete_confirm_description"),
                  async () => {
                    setActingId(entry.id);
                    setActingType("delete");
                    try {
                      const { error } = await client.comment.delete(entry.id);
                      if (error) {
                        showAlert(error.value as string);
                        return;
                      }
                      showAlert(t("comment_moderation.delete_success"));
                      void reload();
                    } finally {
                      setActingId(null);
                      setActingType(null);
                    }
                  },
                );
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}