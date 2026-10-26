import { SingleFlight } from "@lootlog/protocol/effect/single-flight";
import { Clock, Effect } from "effect";
import type { HttpClient } from "effect/http";
import { DependencyUnavailableError } from "#src/infrastructure/http-error";

// Characters rarely change accounts, so a profile is read again only for a
// character it did not list, at most this often, to see newly created ones.
const PROFILE_TTL_MS = 6 * 60 * 60_000;

const MISS_REFRESH_AFTER_MS = 10 * 60_000;

// An unreachable profile is not asked for again sooner than this.
const FAILED_READ_RETRY_MS = 60_000;

const MAX_CACHED_ACCOUNTS = 5_000;

const MAX_PROFILE_BYTES = 2 * 1024 * 1024;

const CHARACTER_ROW = /<li\b[^>]*\bclass="char-row\b[^>]*>/g;

const attribute = (tag: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

type AccountProfile = {
  // Null until a read succeeds.
  readonly characters: ReadonlySet<string> | null;
  readonly readAt: number;
  // The earliest next read: after a miss, or a failed read.
  readonly nextReadAt: number;
};

const characterKey = (world: string, characterId: string) =>
  `${world}:${characterId}`;

/**
 * The public profile lists an account's characters as
 * `<li data-world="#aether" class="char-row" data-id="244601">`. Characters on
 * hidden worlds are not listed.
 */
export const parseProfileCharacters = (html: string): Set<string> => {
  const characters = new Set<string>();

  for (const [tag] of html.matchAll(CHARACTER_ROW)) {
    const id = attribute(tag, "data-id");
    const world = attribute(tag, "data-world")?.replace(/^#/, "");

    if (id && world) characters.add(characterKey(world, id));
  }

  return characters;
};

export interface MargonemAccountProfiles {
  /**
   * Whether the account's public Margonem profile lists the character on the
   * world. Margonem's account proof signs only the account; this ties a
   * character to it.
   */
  readonly listsCharacter: (options: {
    readonly world: string;
    readonly accountId: string;
    readonly characterId: string;
  }) => Effect.Effect<boolean, DependencyUnavailableError>;
}

export const makeMargonemAccountProfiles = (
  config: { readonly profileUrl: string },
  httpClient: HttpClient.HttpClient,
): MargonemAccountProfiles => {
  const profiles = new Map<string, AccountProfile>();

  const pendingProfiles = new SingleFlight<string, AccountProfile, never>();

  const remember = (accountId: string, profile: AccountProfile) => {
    profiles.delete(accountId);
    profiles.set(accountId, profile);

    if (profiles.size > MAX_CACHED_ACCOUNTS) {
      const oldest = profiles.keys().next().value;

      if (oldest !== undefined) profiles.delete(oldest);
    }

    return profile;
  };

  const fetchCharacters = (accountId: string) =>
    Effect.gen(function* () {
      const response = yield* httpClient.get(
        `${config.profileUrl},${accountId}`,
      );

      // An account without a profile has no characters.
      if (response.status === 404) return new Set<string>();

      if (response.status < 200 || response.status >= 300) {
        return yield* Effect.fail(
          new Error(`Margonem profile responded ${response.status}`),
        );
      }

      const body = yield* response.arrayBuffer;

      if (body.byteLength > MAX_PROFILE_BYTES) {
        return yield* Effect.fail(new Error("Margonem profile is too large"));
      }

      return parseProfileCharacters(new TextDecoder().decode(body));
    }).pipe(Effect.timeout("5 seconds"));

  // A failed read keeps the characters read before.
  const readProfile = (accountId: string) =>
    pendingProfiles.run(
      accountId,
      fetchCharacters(accountId).pipe(
        Effect.matchEffect({
          onSuccess: (characters) =>
            Effect.map(Clock.currentTimeMillis, (now) =>
              remember(accountId, {
                characters,
                readAt: now,
                nextReadAt: now + MISS_REFRESH_AFTER_MS,
              }),
            ),
          onFailure: (cause) =>
            Effect.logWarning("Margonem profile read failed", cause).pipe(
              Effect.andThen(Clock.currentTimeMillis),
              Effect.map((now) =>
                remember(accountId, {
                  characters: profiles.get(accountId)?.characters ?? null,
                  readAt: profiles.get(accountId)?.readAt ?? 0,
                  nextReadAt: now + FAILED_READ_RETRY_MS,
                }),
              ),
            ),
        }),
        Effect.withSpan("MargonemAccountProfiles_readProfile", {
          attributes: { adapter: "margonem-profile", retryCount: 0 },
        }),
      ),
    );

  return {
    listsCharacter: ({ world, accountId, characterId }) =>
      Effect.gen(function* () {
        const key = characterKey(world, characterId);
        const now = yield* Clock.currentTimeMillis;
        let profile = profiles.get(accountId);

        const stale =
          !profile ||
          (now - profile.readAt >= PROFILE_TTL_MS && now >= profile.nextReadAt);

        if (!profile || stale) profile = yield* readProfile(accountId);

        if (!profile.characters?.has(key) && now >= profile.nextReadAt) {
          profile = yield* readProfile(accountId);
        }

        if (!profile.characters) {
          return yield* Effect.fail(
            new DependencyUnavailableError(
              "Margonem account profiles are unavailable",
            ),
          );
        }

        return profile.characters.has(key);
      }),
  };
};
