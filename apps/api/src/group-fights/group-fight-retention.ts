import { sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { InvalidRequestError } from "#src/shared/http/http-errors";

export const GROUP_FIGHT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const getGroupFightRetentionCutoff = (now = new Date()): Date =>
  new Date(now.getTime() - GROUP_FIGHT_RETENTION_MS);

/** Expired submissions cannot recreate records removed by retention cleanup. */
export const requireRetainedGroupFight = Effect.fn(
  "group-fights.require-retained",
)(function* (endedAt: string) {
  const cutoff = (yield* Clock.currentTimeMillis) - GROUP_FIGHT_RETENTION_MS;
  if (Date.parse(endedAt) < cutoff)
    return yield* new InvalidRequestError("GROUP_FIGHT_EXPIRED");
});

/** Existing participant and submission foreign keys cascade each deleted fight. */
export const makeGroupFightCleanup = (database: typeof ApiDatabase.Service) =>
  Effect.fn("group-fights.cleanup")(function* () {
    const cutoff = getGroupFightRetentionCutoff(
      new Date(yield* Clock.currentTimeMillis),
    ).toISOString();
    let removed = 0;
    for (let batch = 0; batch < 100; batch++) {
      const result =
        yield* database.execute(sql`DELETE FROM "GroupFight" WHERE id IN (
        SELECT id FROM "GroupFight" WHERE "endedAt" < ${cutoff}::timestamptz AT TIME ZONE 'UTC'
        ORDER BY "endedAt",id LIMIT 1000 FOR UPDATE SKIP LOCKED
      ) RETURNING id`);
      const decoded = yield* Schema.decodeUnknownEffect(
        Schema.Struct({
          rows: Schema.Array(Schema.Struct({ id: Schema.Number })),
        }),
      )(result);
      removed += decoded.rows.length;
      if (decoded.rows.length < 1000) break;
    }
    yield* Effect.logInfo("Expired group fights deleted", { removed });
  });
