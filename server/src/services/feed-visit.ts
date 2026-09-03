import { eq } from "drizzle-orm";
import type { DB } from "../core/hono-types";
import { visitStats, visits } from "../db/schema";
import { HyperLogLog } from "../utils/hyperloglog";
import type { FeedVisitTaskPayload } from "../queue";

/**
 * Records a single feed view off the request hot path.
 *
 * The detail endpoint only does an atomic `pv = pv + 1` upsert; the heavier
 * HyperLogLog (UV) maintenance and the per-view `visits` history row are
 * deferred here so a view never blocks on HLL (de)serialization or a second
 * write. Running in the queue also serializes the HLL read-modify-write per
 * feed, which avoids the lost-update race the synchronous path had.
 */
export async function processFeedVisitTask(
  db: DB,
  payload: FeedVisitTaskPayload,
): Promise<void> {
  const { feedId, ip } = payload;

  const stats = await db.query.visitStats.findFirst({
    where: eq(visitStats.feedId, feedId),
  });

  if (stats) {
    const hll = new HyperLogLog(stats.hllData);
    hll.add(ip);
    await db.update(visitStats)
      .set({ hllData: hll.serialize(), updatedAt: new Date() })
      .where(eq(visitStats.feedId, feedId));
  } else {
    await db.insert(visitStats)
      .values({ feedId, pv: 1, hllData: new HyperLogLog().serialize() })
      .onConflictDoNothing();
  }

  await db.insert(visits).values({ feedId, ip }).onConflictDoNothing();
}
