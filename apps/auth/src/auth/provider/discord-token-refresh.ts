import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import type { refreshAccessToken } from "better-auth/oauth2";
import { Option, Schema } from "effect";

type RefreshedTokens = Awaited<ReturnType<typeof refreshAccessToken>>;

export interface RefreshCoordination {
  readonly claim: (key: string, ttlMs: number) => Promise<boolean>;
  readonly release: (key: string) => Promise<void>;
  readonly read: (key: string) => Promise<string | null>;
  readonly publish: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Promise<void>;
}

const CLAIM_TTL_MS = 15_000;

const WAIT_STEP_MS = 100;

const REFRESHED_TTL_SECONDS = 60;

const REFUSED_TTL_SECONDS = 600;

const PERMANENT_REFUSAL = "invalid_grant";

const StoredOutcome = Schema.Union([
  Schema.Struct({
    outcome: Schema.Literal("refreshed"),
    tokenType: Schema.optional(Schema.String),
    accessToken: Schema.optional(Schema.String),
    refreshToken: Schema.optional(Schema.String),
    accessTokenExpiresAt: Schema.optional(Schema.Finite),
    refreshTokenExpiresAt: Schema.optional(Schema.Finite),
    scopes: Schema.optional(Schema.Array(Schema.String)),
    idToken: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    outcome: Schema.Literal("refused"),
    status: Schema.optional(Schema.Finite),
    error: Schema.String,
  }),
]);

type StoredOutcome = typeof StoredOutcome.Type;

const decodeStoredOutcome = Schema.decodeUnknownOption(
  Schema.fromJsonString(StoredOutcome),
);

const decodeRefusal = Schema.decodeUnknownOption(
  Schema.Struct({
    status: Schema.optional(Schema.Finite),
    error: Schema.String,
  }),
);

const toStoredOutcome = (tokens: RefreshedTokens): StoredOutcome => ({
  outcome: "refreshed",
  ...(tokens.tokenType !== undefined && { tokenType: tokens.tokenType }),
  ...(tokens.accessToken !== undefined && { accessToken: tokens.accessToken }),
  ...(tokens.refreshToken !== undefined && {
    refreshToken: tokens.refreshToken,
  }),
  ...(tokens.accessTokenExpiresAt !== undefined && {
    accessTokenExpiresAt: tokens.accessTokenExpiresAt.getTime(),
  }),
  ...(tokens.refreshTokenExpiresAt !== undefined && {
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt.getTime(),
  }),
  ...(tokens.scopes !== undefined && { scopes: [...tokens.scopes] }),
  ...(tokens.idToken !== undefined && { idToken: tokens.idToken }),
});

const replayOutcome = (outcome: StoredOutcome): RefreshedTokens => {
  if (outcome.outcome === "refused")
    throw Object.assign(
      new Error("Discord already refused this refresh token"),
      { status: outcome.status, error: outcome.error },
    );

  const {
    outcome: _,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    scopes,
    ...tokens
  } = outcome;

  return {
    ...tokens,
    ...(accessTokenExpiresAt !== undefined && {
      accessTokenExpiresAt: new Date(accessTokenExpiresAt),
    }),
    ...(refreshTokenExpiresAt !== undefined && {
      refreshTokenExpiresAt: new Date(refreshTokenExpiresAt),
    }),
    ...(scopes !== undefined && { scopes: [...scopes] }),
  };
};

const refreshKey = (refreshToken: string) =>
  `discord-token-refresh:${new Bun.CryptoHasher("sha256").update(refreshToken).digest("hex")}`;

export const createSingleFlightRefresh =
  (
    coordination: RefreshCoordination,
    refresh: (refreshToken: string) => Promise<RefreshedTokens>,
  ) =>
  async (refreshToken: string): Promise<RefreshedTokens> => {
    const key = refreshKey(refreshToken);
    const outcomeKey = `${key}:outcome`;
    const claimKey = `${key}:claim`;

    const readOutcome = async () => {
      const sealed = await coordination.read(outcomeKey);

      if (sealed === null) return Option.none<StoredOutcome>();

      return decodeStoredOutcome(
        await symmetricDecrypt({ key: refreshToken, data: sealed }),
      );
    };

    const publishOutcome = async (outcome: StoredOutcome, ttlSeconds: number) =>
      coordination.publish(
        outcomeKey,
        await symmetricEncrypt({
          key: refreshToken,
          data: JSON.stringify(outcome),
        }),
        ttlSeconds,
      );

    const coordinated = <A>(operation: () => Promise<A>, fallback: A) =>
      operation().catch(() => fallback);

    const refreshAsClaimHolder = async () => {
      try {
        const tokens = await refresh(refreshToken);
        await coordinated(
          () => publishOutcome(toStoredOutcome(tokens), REFRESHED_TTL_SECONDS),
          undefined,
        );

        return tokens;
      } catch (cause) {
        const refusal = decodeRefusal(cause);

        if (Option.isSome(refusal) && refusal.value.error === PERMANENT_REFUSAL)
          await coordinated(
            () =>
              publishOutcome(
                { outcome: "refused", ...refusal.value },
                REFUSED_TTL_SECONDS,
              ),
            undefined,
          );

        throw cause;
      } finally {
        await coordinated(() => coordination.release(claimKey), undefined);
      }
    };

    for (let waited = 0; waited < CLAIM_TTL_MS; waited += WAIT_STEP_MS) {
      const outcome = await coordinated(readOutcome, Option.none());

      if (Option.isSome(outcome)) return replayOutcome(outcome.value);

      if (
        await coordinated(
          () => coordination.claim(claimKey, CLAIM_TTL_MS),
          true,
        )
      )
        return refreshAsClaimHolder();

      await Bun.sleep(WAIT_STEP_MS);
    }

    return refresh(refreshToken);
  };
