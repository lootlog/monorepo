import { Clock, Effect, Redacted, Schema } from "effect";
import type { HttpClient as HttpClientValue } from "effect/http/HttpClient";
import { eq, sql } from "drizzle-orm";
import { FACTION_WARS, type FactionWar } from "@lootlog/domain/faction-war";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { factionWarCursorTable } from "#src/database/drizzle/schema";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import type { FactionWarPoints } from "./faction-war-points.js";

const PAGE_SIZE = 500;

// One API replica syncs at a time; the key is arbitrary but fixed.
const PVP_SYNC_LOCK = 7_316_205;

const LockResult = Schema.Struct({
  rows: Schema.Array(Schema.Struct({ acquired: Schema.Boolean })),
});

/** Battles commit after their ID is drawn; reading only older ones skips none. */
const SETTLE_MS = 60_000;

/** A war keeps syncing this long after it ends to collect its last battles. */
const TAIL_MS = 10 * 60_000;

const PvpWinsPage = Schema.Struct({
  wins: Schema.Array(
    Schema.Struct({
      battleId: Schema.String,
      userId: Schema.String,
      wonAt: Schema.String,
    }),
  ),
});

/**
 * Reads PvP wins from the battlelog in battle ID order and awards them. The
 * award ledger makes a page that is read twice harmless.
 */
export const makeFactionWarPvpSync = (options: {
  readonly database: typeof ApiDatabase.Service;
  readonly httpClient: HttpClientValue;
  readonly battlelogServiceUrl: URL;
  readonly serviceSecret: Redacted.Redacted<string>;
  readonly points: FactionWarPoints;
}) => {
  const { database, points } = options;

  const fetchPage = (
    war: FactionWar,
    afterBattleId: string | undefined,
    before: Date,
  ) => {
    const url = new URL("/internal/pvp-wins", options.battlelogServiceUrl);

    if (afterBattleId) url.searchParams.set("afterBattleId", afterBattleId);
    url.searchParams.set("since", war.startsAt);
    url.searchParams.set("before", before.toISOString());
    url.searchParams.set("limit", String(PAGE_SIZE));

    return outboundHttpRequest(options.httpClient, {
      adapter: "battlelog-pvp-wins",
      headers: {
        authorization: `Bearer ${Redacted.value(options.serviceSecret)}`,
      },
      method: "GET",
      responseLimitBytes: 1024 * 1024,
      retryTimes: 1,
      timeout: "10 seconds",
      url,
    }).pipe(
      Effect.flatMap((response) =>
        response.status === 200
          ? Schema.decodeUnknownEffect(Schema.fromJsonString(PvpWinsPage))(
              new TextDecoder().decode(response.body),
            )
          : Effect.fail(
              new Error(`Battlelog PvP wins failed with ${response.status}`),
            ),
      ),
    );
  };

  const syncWar = Effect.fn("FactionWarPvpSync.syncWar")(function* (
    war: FactionWar,
    at: number,
  ) {
    const before = new Date(Math.min(at - SETTLE_MS, Date.parse(war.endsAt)));

    const [cursor] = yield* database
      .select({ pvpBattleId: factionWarCursorTable.pvpBattleId })
      .from(factionWarCursorTable)
      .where(eq(factionWarCursorTable.warId, war.id))
      .limit(1);

    let afterBattleId = cursor?.pvpBattleId;

    while (true) {
      const page = yield* fetchPage(war, afterBattleId, before);

      for (const win of page.wins) {
        yield* points.awardPvpWin(
          win.userId,
          win.battleId,
          new Date(win.wonAt),
        );
      }

      const last = page.wins.at(-1);

      if (!last) return;
      afterBattleId = last.battleId;

      yield* database
        .insert(factionWarCursorTable)
        .values({
          warId: war.id,
          pvpBattleId: last.battleId,
          updatedAt: new Date(at),
        })
        .onConflictDoUpdate({
          target: factionWarCursorTable.warId,
          set: { pvpBattleId: last.battleId, updatedAt: new Date(at) },
        });

      if (page.wins.length < PAGE_SIZE) return;
    }
  });

  return Effect.gen(function* () {
    const at = yield* Clock.currentTimeMillis;

    const wars = FACTION_WARS.filter(
      (war) =>
        Date.parse(war.startsAt) <= at && at < Date.parse(war.endsAt) + TAIL_MS,
    );

    if (wars.length === 0) return;

    // Every replica runs this cron; the lock lives until the transaction ends,
    // which also works through the transaction-mode pooler.
    yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const { rows } = yield* transaction
          .execute(
            sql`SELECT pg_try_advisory_xact_lock(${PVP_SYNC_LOCK}) AS acquired`,
          )
          .pipe(Effect.flatMap(Schema.decodeUnknownEffect(LockResult)));

        if (!rows[0]?.acquired) return;

        yield* Effect.forEach(wars, (war) => syncWar(war, at), {
          discard: true,
        });
      }),
    );
  });
};
