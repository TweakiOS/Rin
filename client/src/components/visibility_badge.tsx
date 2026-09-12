import { useTranslation } from "react-i18next";

export function getFeedVisibility(feed: { draft?: number | boolean; listed?: number | boolean }) {
  if (feed.draft === 1 || feed.draft === true) return "draft" as const;
  if (feed.listed === 0 || feed.listed === false) return "unlisted" as const;
  if (feed.listed === 1 || feed.listed === true) return "listed" as const;
  return null;
}

export function VisibilityBadge(props: { draft?: number | boolean; listed?: number | boolean; className?: string }) {
  const { t } = useTranslation();
  const kind = getFeedVisibility(props);
  if (!kind) return null;
  const label = kind === "draft" ? t("draft") : kind === "unlisted" ? t("unlisted") : t("listed_badge");
  return (
    <span className={props.className ?? "rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"}>
      {label}
    </span>
  );
}