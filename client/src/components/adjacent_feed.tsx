import type { AdjacentFeed, AdjacentFeedResponse } from "@rin/api";
import { useEffect, useState } from "react";
import { client } from "../app/runtime";
import { timeago } from "../utils/timeago.ts";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export function AdjacentSection({ id, setError }: { id: string; setError: (error: string) => void }) {
  const [adjacentFeeds, setAdjacentFeeds] = useState<AdjacentFeedResponse>();

  useEffect(() => {
    client.feed.adjacent(id).then(({ data, error }) => {
      if (error) {
        setError(error.value as string);
      } else if (data && typeof data !== "string") {
        setAdjacentFeeds(data);
      }
    });
  }, [id, setError]);

  return (
    <div className="mx-0 my-2 grid grid-cols-1 rounded-2xl bg-w sm:grid-cols-2">
      <AdjacentCard data={adjacentFeeds?.previousFeed} type="previous" />
      <AdjacentCard data={adjacentFeeds?.nextFeed} type="next" />
    </div>
  );
}

export function AdjacentCard({
  data,
  type,
}: {
  data: AdjacentFeed | null | undefined;
  type: "previous" | "next";
}) {
  const direction = type === "previous" ? "text-start" : "text-end";
  const radius =
    type === "previous"
      ? "rounded-t-2xl sm:rounded-none sm:rounded-l-2xl"
      : "rounded-b-2xl sm:rounded-none sm:rounded-r-2xl";
  const { t } = useTranslation();

  if (!data) {
    return (
      <div className="w-full px-3 py-3 duration-300 sm:p-6">
        <p className={`t-secondary w-full ${direction}`}>{t(type === "previous" ? "previous" : "next")}</p>
        <h1 className={`truncate text-pretty text-xl text-gray-700 dark:text-white ${direction}`}>{t("no_more")}</h1>
      </div>
    );
  }

  return (
    <Link
      href={`/feed/${data.id}`}
      target="_blank"
      className={`w-full bg-button px-3 py-3 duration-300 sm:p-6 ${radius}`}
    >
      <p className={`t-secondary w-full ${direction}`}>{t(type === "previous" ? "previous" : "next")}</p>
      <h1 className={`truncate text-pretty text-xl font-bold text-gray-700 dark:text-white ${direction}`}>
        {data.title}
      </h1>
      <p className={`space-x-2 ${direction}`}>
        <span className="text-sm text-gray-400" title={new Date(data.createdAt).toLocaleString()}>
          {data.createdAt === data.updatedAt
            ? timeago(data.createdAt)
            : t("feed_card.published$time", { time: timeago(data.createdAt) })}
        </span>
        {data.createdAt !== data.updatedAt && (
          <span className="text-sm text-gray-400" title={new Date(data.updatedAt).toLocaleString()}>
            {t("feed_card.updated$time", { time: timeago(data.updatedAt) })}
          </span>
        )}
      </p>
    </Link>
  );
}