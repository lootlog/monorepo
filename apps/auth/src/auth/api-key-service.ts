import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { hasServiceAuthorization } from "@lootlog/protocol/http/service-auth";
import { and, eq, inArray } from "drizzle-orm";
import { Context, Effect, Layer, Schema } from "effect";
import {
  type ApiKeyAccess,
  ApiKeyGrant,
  type ApiKeyStatus,
} from "@lootlog/schema/api-key-access";
import { AuthDatabase } from "#src/database/drizzle";
import { authApiKeys, authUsers } from "#src/database/drizzle.schema";
import { BetterAuthRuntime } from "#src/auth/provider/better-auth";
import { AppConfig } from "#src/config/env";
import { HttpResponseError } from "#src/auth/auth-service";

const Name = Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(80));
export const CreateApiKey = Schema.Struct({
  ...ApiKeyGrant.fields,
  name: Name,
  expiresIn: Schema.NullOr(Schema.Literals([2_592_000, 7_776_000, 31_536_000])),
});
export const RenameApiKey = Schema.Struct({ name: Name });
export const ApiKeyStatusRequest = Schema.Struct({
  keyIds: Schema.Array(Schema.NonEmptyString).check(Schema.isMaxLength(100)),
});
export const ApiKeySummary = Schema.Struct({
  ...ApiKeyGrant.fields,
  id: Schema.String,
  name: Schema.String,
  start: Schema.NullOr(Schema.String),
  createdAt: Schema.String,
  expiresAt: Schema.NullOr(Schema.String),
});

const failure = (status: number, message: string) =>
  new HttpResponseError({ status, body: { message } });
const decodeGrant = Schema.decodeUnknownOption(
  Schema.fromJsonString(ApiKeyGrant),
);
type StoredKey = typeof authApiKeys.$inferSelect;
const grantFor = (key: StoredKey) => {
  const grant = decodeGrant(key.metadata ?? "");
  return grant._tag === "Some" ? grant.value : null;
};
const active = (key: StoredKey, now: number) =>
  key.enabled === true &&
  (key.expiresAt === null || key.expiresAt.getTime() > now);
const summary = (key: StoredKey) => {
  const grant = grantFor(key);
  return grant
    ? {
        ...grant,
        id: key.id,
        name: key.name ?? "",
        start: key.start,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString() ?? null,
      }
    : null;
};

export class ApiKeyService extends Context.Service<
  ApiKeyService,
  {
    readonly session: (
      headers: Headers,
      requireOrigin?: boolean,
    ) => Effect.Effect<string, HttpResponseError>;
    readonly list: (
      userId: string,
    ) => Effect.Effect<
      { keys: ReadonlyArray<typeof ApiKeySummary.Type> },
      HttpResponseError
    >;
    readonly create: (
      userId: string,
      input: typeof CreateApiKey.Type,
    ) => Effect.Effect<
      typeof ApiKeySummary.Type & { key: string },
      HttpResponseError
    >;
    readonly rename: (
      userId: string,
      keyId: string,
      name: string,
    ) => Effect.Effect<typeof ApiKeySummary.Type, HttpResponseError>;
    readonly remove: (
      userId: string,
      keyId: string,
    ) => Effect.Effect<{ success: true }, HttpResponseError>;
    readonly verify: (
      key: string,
    ) => Effect.Effect<
      { userId: string; discordId: string; apiKeyAccess: ApiKeyAccess },
      HttpResponseError
    >;
    readonly statuses: (
      headers: Headers,
      keyIds: ReadonlyArray<string>,
    ) => Effect.Effect<
      { keys: ReadonlyArray<ApiKeyStatus> },
      HttpResponseError
    >;
  }
>()("@lootlog/auth/ApiKeyService") {
  static readonly layer = Layer.effect(
    ApiKeyService,
    Effect.gen(function* () {
      const database = yield* AuthDatabase;
      const auth = yield* BetterAuthRuntime;
      const config = yield* AppConfig;
      const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);
      const query = <A, E>(effect: Effect.Effect<A, E>) =>
        effect.pipe(
          Effect.mapError(() => failure(503, "API key service unavailable")),
        );
      const readStatuses = Effect.fn("ApiKeyService.readStatuses")(function* (
        ids: ReadonlyArray<string>,
      ) {
        if (ids.length === 0) return [];
        const rows = yield* query(
          database
            .select({ key: authApiKeys, user: authUsers })
            .from(authApiKeys)
            .innerJoin(authUsers, eq(authUsers.id, authApiKeys.referenceId))
            .where(inArray(authApiKeys.id, [...ids])),
        );
        const now = Date.now();
        return ids.map((keyId): ApiKeyStatus => {
          const row = rows.find(({ key }) => key.id === keyId);
          const grant = row ? grantFor(row.key) : null;
          if (
            !row ||
            !grant ||
            !active(row.key, now) ||
            (row.user.banned &&
              (row.user.banExpires === null ||
                row.user.banExpires.getTime() > now))
          )
            return { keyId, valid: false };
          return {
            keyId,
            valid: true,
            userId: row.user.id,
            discordId: row.user.discordId,
            access: {
              ...grant,
              keyId,
              expiresAt: row.key.expiresAt?.toISOString() ?? null,
            },
          };
        });
      });
      const owned = Effect.fn("ApiKeyService.owned")(function* (
        userId: string,
        id: string,
      ) {
        const rows = yield* query(
          database
            .select()
            .from(authApiKeys)
            .where(
              and(eq(authApiKeys.id, id), eq(authApiKeys.referenceId, userId)),
            )
            .limit(1),
        );
        const key = rows[0];
        if (!key) return yield* failure(404, "API key not found");
        return key;
      });
      return ApiKeyService.of({
        session: Effect.fn("ApiKeyService.session")(function* (
          headers,
          requireOrigin = true,
        ) {
          if (headers.has("x-api-key") || headers.has("authorization"))
            return yield* failure(401, "Session required");
          const origin = headers.get("origin");
          if (
            (requireOrigin && !origin) ||
            (origin !== null && !config.trustedOrigins.includes(origin))
          )
            return yield* failure(403, "Origin not allowed");
          const session = yield* Effect.tryPromise({
            try: () => auth.api.getSession({ headers }),
            catch: () => failure(503, "Session unavailable"),
          });
          if (!session) return yield* failure(401, "Session required");
          const users = yield* query(
            database
              .select()
              .from(authUsers)
              .where(eq(authUsers.id, session.user.id))
              .limit(1),
          );
          const user = users[0];
          if (
            !user ||
            (user.banned &&
              (user.banExpires === null ||
                user.banExpires.getTime() > Date.now()))
          )
            return yield* failure(401, "Session required");
          return user.id;
        }),
        list: Effect.fn("ApiKeyService.list")(function* (userId) {
          const rows = yield* query(
            database
              .select()
              .from(authApiKeys)
              .where(eq(authApiKeys.referenceId, userId))
              .orderBy(authApiKeys.createdAt),
          );
          return {
            keys: rows.flatMap((row) => {
              const value = summary(row);
              return value ? [value] : [];
            }),
          };
        }),
        create: Effect.fn("ApiKeyService.create")(function* (userId, input) {
          if (config.apiKeysEnabled !== true)
            return yield* failure(403, "API keys are disabled");
          if (input.organizationIds.length === 0 && !input.personalData)
            return yield* failure(
              400,
              "Select an organization or personal data",
            );
          if (input.organizationIds.length > 0) {
            if (!config.apiUrl)
              return yield* failure(503, "Organization service unavailable");
            const users = yield* query(
              database
                .select()
                .from(authUsers)
                .where(eq(authUsers.id, userId))
                .limit(1),
            );
            const user = users[0];
            if (!user) return yield* failure(401, "Session required");
            const organizations = yield* client
              .get(`${config.apiUrl.replace(/\/$/, "")}/users/@me/guilds`, {
                headers: {
                  "x-auth-user-id": user.id,
                  "x-auth-discord-id": user.discordId,
                },
              })
              .pipe(
                Effect.flatMap(
                  HttpClientResponse.schemaBodyJson(
                    Schema.Array(
                      Schema.Struct({
                        id: Schema.String,
                        hasLootlogAccess: Schema.Boolean,
                        isAccessDataStale: Schema.Boolean,
                      }),
                    ),
                  ),
                ),
                Effect.timeout("5 seconds"),
                Effect.mapError(() =>
                  failure(503, "Organization service unavailable"),
                ),
              );
            const allowed = new Set(
              organizations
                .filter(
                  (organization) =>
                    organization.hasLootlogAccess &&
                    !organization.isAccessDataStale,
                )
                .map(({ id }) => id),
            );
            if (input.organizationIds.some((id) => !allowed.has(id)))
              return yield* failure(403, "Organization access required");
          }
          const rows = yield* query(
            database
              .select()
              .from(authApiKeys)
              .where(eq(authApiKeys.referenceId, userId)),
          );
          if (rows.filter((row) => active(row, Date.now())).length >= 10)
            return yield* failure(409, "Maximum active API keys reached");
          const api = auth.apiKeys;
          if (!api) return yield* failure(503, "API keys unavailable");
          const body: NonNullable<
            Parameters<typeof api.createApiKey>[0]
          >["body"] = {
            userId,
            name: input.name,
            metadata: {
              organizationIds: [...new Set(input.organizationIds)],
              mode: input.mode,
              personalData: input.personalData,
            },
          };
          if (input.expiresIn !== null) body.expiresIn = input.expiresIn;
          const created = yield* Effect.tryPromise({
            try: () => api.createApiKey({ body }),
            catch: () => failure(503, "API key creation failed"),
          });
          const row = yield* owned(userId, created.id);
          const value = summary(row);
          if (!value)
            return yield* failure(503, "API key metadata unavailable");
          return { ...value, key: created.key };
        }),
        rename: Effect.fn("ApiKeyService.rename")(function* (userId, id, name) {
          yield* owned(userId, id);
          const rows = yield* query(
            database
              .update(authApiKeys)
              .set({ name, updatedAt: new Date() })
              .where(
                and(
                  eq(authApiKeys.id, id),
                  eq(authApiKeys.referenceId, userId),
                ),
              )
              .returning(),
          );
          const value = rows[0] ? summary(rows[0]) : null;
          if (!value) return yield* failure(404, "API key not found");
          return value;
        }),
        remove: Effect.fn("ApiKeyService.remove")(function* (userId, id) {
          yield* owned(userId, id);
          yield* query(
            database
              .delete(authApiKeys)
              .where(
                and(
                  eq(authApiKeys.id, id),
                  eq(authApiKeys.referenceId, userId),
                ),
              ),
          );
          return { success: true };
        }),
        verify: Effect.fn("ApiKeyService.verify")(function* (key) {
          if (config.apiKeysEnabled !== true)
            return yield* failure(401, "API keys are disabled");
          const api = auth.apiKeys;
          if (!api) return yield* failure(503, "API keys unavailable");
          const result = yield* Effect.tryPromise({
            try: () => api.verifyApiKey({ body: { key } }),
            catch: () => failure(503, "API key verification unavailable"),
          });
          if (!result.valid || !result.key)
            return yield* failure(
              result.error?.code === "RATE_LIMITED" ? 429 : 401,
              "API key rejected",
            );
          const status = (yield* readStatuses([result.key.id]))[0];
          if (!status?.valid) return yield* failure(401, "API key rejected");
          return {
            userId: status.userId,
            discordId: status.discordId,
            apiKeyAccess: status.access,
          };
        }),
        statuses: Effect.fn("ApiKeyService.statuses")(function* (headers, ids) {
          if (
            !hasServiceAuthorization(
              headers.get("authorization") ?? undefined,
              config.apiKeyStatusSecret,
            )
          )
            return yield* failure(401, "Unauthorized");
          if (config.apiKeysEnabled !== true)
            return {
              keys: ids.map((keyId) => ({ keyId, valid: false as const })),
            };
          return { keys: yield* readStatuses(ids) };
        }),
      });
    }),
  );
}
