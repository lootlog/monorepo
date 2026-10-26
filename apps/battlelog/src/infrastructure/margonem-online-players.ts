import { SingleFlight } from "@lootlog/protocol/effect/single-flight";
import { Clock, Effect, Schema } from "effect";
import type { HttpClient } from "effect/http";
import { DependencyUnavailableError } from "#src/infrastructure/http-error";

// Margonem rewrites each world's file every minute.
const ONLINE_PLAYERS_TTL_MS = 30_000;

// A character that went online since the cached copy may be missing from it,
// so a miss reads the file again once the copy is this old.
const MISS_REFRESH_AFTER_MS = 10_000;

const OnlinePlayers = Schema.Array(
  Schema.Struct({ a: Schema.String, c: Schema.String }),
);

const decodeOnlinePlayers = Schema.decodeUnknownEffect(OnlinePlayers);

type OnlineWorld = {
  readonly characters: ReadonlyMap<string, string>;
  readonly fetchedAt: number;
};

export interface MargonemOnlinePlayers {
  /**
   * Whether Margonem lists the character online on the world under the
   * account. Only the account is signed by Margonem's account proof; this
   * ties a character to it.
   */
  readonly isOnlineUnderAccount: (options: {
    readonly world: string;
    readonly accountId: string;
    readonly characterId: string;
  }) => Effect.Effect<boolean, DependencyUnavailableError>;
}

export const makeMargonemOnlinePlayers = (
  config: { readonly onlinePlayersUrl: string },
  httpClient: HttpClient.HttpClient,
): MargonemOnlinePlayers => {
  const worlds = new Map<string, OnlineWorld>();

  const pendingWorlds = new SingleFlight<
    string,
    OnlineWorld,
    DependencyUnavailableError
  >();

  const fetchWorld = (world: string) =>
    pendingWorlds.run(
      world,
      Effect.gen(function* () {
        const response = yield* httpClient.get(
          `${config.onlinePlayersUrl}/${encodeURIComponent(world)}.json`,
        );

        if (response.status < 200 || response.status >= 300) {
          return yield* Effect.fail(
            new Error(`Online players responded ${response.status}`),
          );
        }

        const players = yield* decodeOnlinePlayers(yield* response.json);

        const entry: OnlineWorld = {
          characters: new Map(players.map(({ a, c }) => [c, a])),
          fetchedAt: yield* Clock.currentTimeMillis,
        };

        worlds.set(world, entry);

        return entry;
      }).pipe(
        Effect.timeout("5 seconds"),
        Effect.mapError(
          (cause) =>
            new DependencyUnavailableError(
              "Margonem online players are unavailable",
              { cause },
            ),
        ),
        Effect.withSpan("MargonemOnlinePlayers_fetchWorld", {
          attributes: { adapter: "margonem-staticinfo", retryCount: 0 },
        }),
      ),
    );

  return {
    isOnlineUnderAccount: ({ world, accountId, characterId }) =>
      Effect.gen(function* () {
        const now = yield* Clock.currentTimeMillis;
        const cached = worlds.get(world);

        const current =
          cached && now - cached.fetchedAt < ONLINE_PLAYERS_TTL_MS
            ? cached
            : yield* fetchWorld(world);

        if (current.characters.get(characterId) === accountId) return true;

        if (now - current.fetchedAt < MISS_REFRESH_AFTER_MS) return false;

        const refreshed = yield* fetchWorld(world);

        return refreshed.characters.get(characterId) === accountId;
      }),
  };
};
