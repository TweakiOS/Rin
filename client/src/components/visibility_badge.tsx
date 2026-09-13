import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { ProfileContext } from "../state/profile";

export function VisibilityBadge({
  draft,
  listed,
  encrypted,
  className,
}: {
  draft?: number | boolean;
  listed?: number | boolean;
  encrypted?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const profile = useContext(ProfileContext);
  const isStaff = Boolean(profile?.permission || profile?.id);
  const pill =
    className ??
    "rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800";

  const tags: string[] = [];
  if (isStaff && (draft === 1 || draft === true)) tags.push(t("draft"));
  if (isStaff && (listed === 0 || listed === false) && !(draft === 1 || draft === true)) {
    tags.push(t("unlisted"));
  }
  if (encrypted) tags.push(t("encrypted"));
  if (tags.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1">
      {tags.map((label) => (
        <span key={label} className={pill}>
          {label}
        </span>
      ))}
    </span>
  );
}