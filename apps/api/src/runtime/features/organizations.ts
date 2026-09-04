import { makeJsonCodec } from "#src/redis/redis.service";
import { ApiDatabase } from "#src/database/drizzle/database";
import { makeDiscordBotClient } from "#src/discord-bot-client/discord-bot-client";
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/member-discord-status";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer } from "effect";
import { HttpClient } from "effect/unstable/http";
import {
  GuildSummaryCacheSchema,
  makeAccessibleGuilds,
} from "#src/http-api/handlers/account-organization/accessible-guilds.data-layer";
import { makeCurrentUserGuilds } from "#src/http-api/handlers/account-organization/current-user-guilds.data-layer";
import { makeGuildDiscordSyncData } from "#src/http-api/handlers/account-organization/guild-discord-sync.data-layer";
import { makeManageableGuilds } from "#src/http-api/handlers/account-organization/manageable-guilds.data-layer";
import { makeUserAccountDeletion } from "#src/http-api/handlers/account-organization/user-account-deletion.data-layer";
import { makeUserGuildList } from "#src/http-api/handlers/account-organization/user-guild-list.data-layer";
import { makeUserGuildPermissions } from "#src/http-api/handlers/account-organization/user-guild-permissions.data-layer";
import { makeUserPreferencesData } from "#src/http-api/handlers/account-organization/user-preferences.data-layer";
import {
  AccountOrganizationData,
  AccountOrganizationOperationError,
  GuildConfigurationData,
} from "#src/http-api/handlers/account-organization/account-organization.operations";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import {
  OrganizationContextLookup,
  type OrganizationContextCache,
} from "#src/runtime/auth/organization-context";
import {
  InternalGuildsData,
  InternalGuildsOperationError,
  type InternalGuildsCache,
} from "#src/http-api/handlers/internal/internal.handlers";
import {
  OrganizationWorkspaceOperationError,
  RolesData,
} from "#src/http-api/handlers/organization-workspace/organization-workspace.operations";
import { MemberServices, membersData } from "#src/runtime/features/members";

type GuildDiscordSyncValue = ReturnType<typeof makeGuildDiscordSyncData>;
export class GuildDiscordSync extends Context.Service<
  GuildDiscordSync,
  GuildDiscordSyncValue
>()("@lootlog/api/http-api/GuildDiscordSync") {}
export const guildDiscordSyncLive = Layer.effect(
  GuildDiscordSync,
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const rabbit = yield* RabbitMessaging;
    const httpClient = yield* HttpClient.HttpClient;
    const config = yield* ApiRuntimeConfig;
    const discordBot = makeDiscordBotClient(
      httpClient,
      config.discordBotServiceUrl,
    );
    return makeGuildDiscordSyncData(database, {
      staleAfterMs: 900 * 1000,
      refresh: (guildId) => discordBot.refreshGuildChannels(guildId),
      publishChannelDeleted: (payload) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    });
  }),
);
export const organizationContextLookup = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const cache: OrganizationContextCache = {
      get: (key) => attempt(() => redis.get(key)),
      set: (key, value, ttl) => attempt(() => redis.set(key, value, ttl)),
      del: (key) => attempt(() => redis.del(key)),
    };
    return OrganizationContextLookup.layerDatabase(cache);
  }),
).pipe(Layer.provide(membersData));
type AccountOrganizationOperationsValue = AccountOrganizationData["Service"];
export class AccountOrganizationOperations extends Context.Service<
  AccountOrganizationOperations,
  AccountOrganizationOperationsValue
>()("@lootlog/api/http-api/AccountOrganizationOperations") {}
export const accountOrganizationOperationsLive = Layer.effect(
  AccountOrganizationOperations,
  Effect.gen(function* () {
    const { discord, refresh, removal } = yield* MemberServices;
    const discordSync = yield* GuildDiscordSync;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const httpClient = yield* HttpClient.HttpClient;
    const database = yield* ApiDatabase;
    const config = yield* ApiRuntimeConfig;
    const cacheAttempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });
    const deleteAccount = makeUserAccountDeletion(database, {
      cleanupBattlelog: (userId) =>
        outboundHttpRequest(httpClient, {
          adapter: "battlelog-account-cleanup",
          body: JSON.stringify({ userId }),
          headers: { "content-type": "application/json" },
          method: "POST",
          responseLimitBytes: 1024 * 1024,
          retryTimes: 0,
          timeout: "5 seconds",
          url: new URL(
            "/internal/delete-user-data",
            config.battlelogServiceUrl,
          ).toString(),
        }).pipe(
          Effect.flatMap((response) => {
            if (response.status < 200 || response.status >= 300) {
              return Effect.fail(
                new Error(`Request failed with status ${response.status}`),
              );
            }
            return Effect.try(() =>
              JSON.parse(new TextDecoder().decode(response.body)),
            );
          }),
          Effect.flatMap((body) =>
            typeof body === "object" &&
            body !== null &&
            "status" in body &&
            body.status === "ACCEPTED"
              ? Effect.void
              : Effect.fail(new Error("Unexpected Battlelog cleanup response")),
          ),
        ),
      deleteCacheKey: (key) => cacheAttempt(() => redis.del(key)),
      deleteCachePattern: (pattern) =>
        cacheAttempt(() => redis.deleteByPattern(pattern)),
      publishMemberRemoved: (payload) =>
        rabbit.publish({
          exchange: "default",
          routingKey: RabbitRoutingKey.GUILDS_MEMBERS_REMOVE,
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    });
    const preferences = makeUserPreferencesData(database);
    const getManageableUserGuilds = makeManageableGuilds(
      ({ userId, discordId }) => discord.getUserGuilds(userId, discordId),
    );
    const getUserGuildsWithPermissions = makeUserGuildPermissions(database, {
      getJson: (key, schema) =>
        Effect.tryPromise({
          try: () => redis.getJson(key, makeJsonCodec(schema)),
          catch: (error) => error,
        }),
      setJson: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.setJson(key, value, ttl),
          catch: (error) => error,
        }),
    });
    const getCurrentUserAccessibleGuilds = makeAccessibleGuilds(
      database,
      {
        getCached: (key) =>
          Effect.tryPromise({
            try: () =>
              redis.getJson(key, makeJsonCodec(GuildSummaryCacheSchema)),
            catch: (error) => error,
          }),
        setCached: (key, value, ttl) =>
          Effect.tryPromise({
            try: () => redis.setJson(key, value, ttl),
            catch: (error) => error,
          }),
        queueRefresh: refresh.queueMemberRefresh,
      },
      config.environment,
    );
    const getUserGuilds = makeUserGuildList(
      database,
      {
        accessible: getCurrentUserAccessibleGuilds,
        deactivateMissing: (options) =>
          removal.deactivateMembersMissingFromDiscordGuilds({
            ...options,
            activeDiscordGuildIds: [...options.activeDiscordGuildIds],
            status: MEMBER_LAST_DISCORD_STATUS.GUILD_NOT_IN_DISCORD_LIST,
          }),
        freshDiscordGuilds: ({ userId, discordId }) =>
          discord
            .getFreshCompleteUserGuilds(userId, discordId)
            .pipe(Effect.map(({ guilds }) => guilds)),
        getCache: (key) =>
          Effect.tryPromise({
            try: () => redis.get(key),
            catch: (error) => error,
          }),
        setCache: (key, value, ttl) =>
          Effect.tryPromise({
            try: () => redis.set(key, value, ttl),
            catch: (error) => error,
          }),
        queueRefresh: refresh.queueMemberRefresh,
      },
      config.environment,
    );
    const getCurrentUserGuilds = makeCurrentUserGuilds(
      database,
      {
        accessibleFallback: getCurrentUserAccessibleGuilds,
        deactivateMissing: (options) =>
          removal.deactivateMembersMissingFromDiscordGuilds({
            ...options,
            activeDiscordGuildIds: [...options.activeDiscordGuildIds],
            status: MEMBER_LAST_DISCORD_STATUS.GUILD_NOT_IN_DISCORD_LIST,
          }),
        freshDiscordGuilds: ({ userId, discordId }) =>
          discord
            .getFreshCompleteUserGuilds(userId, discordId)
            .pipe(Effect.map(({ guilds }) => guilds)),
        queueMember: refresh.queueMemberRefresh,
        refreshMember: refresh.refreshGuildMemberWithinBudget,
      },
      config.environment,
    );
    return AccountOrganizationOperations.of({
      deleteAccount,
      ...discordSync,
      getManageableUserGuilds,
      getCurrentUserAccessibleGuilds,
      getCurrentUserGuilds,
      getUserGuilds,
      getUserGuildsWithPermissions,
      ...preferences,
    });
  }),
);
export const accountOrganizationData = Layer.effect(
  AccountOrganizationData,
  Effect.map(AccountOrganizationOperations, (operations) =>
    AccountOrganizationData.of(operations),
  ),
);
export const internalGuildsData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => {
    const cacheOperation = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({
        try: operation,
        catch: (cause) => new InternalGuildsOperationError({ cause }),
      });
    const cache: InternalGuildsCache = {
      get: (key) => cacheOperation(() => redis.get(key)),
      getJson: (key, schema) =>
        cacheOperation(() => redis.getJson(key, makeJsonCodec(schema))),
      set: (key, value, ttl) =>
        cacheOperation(() => redis.set(key, value, ttl)),
      setJson: (key, value, ttl) =>
        cacheOperation(() => redis.setJson(key, value, ttl)),
      del: (key) => cacheOperation(() => redis.del(key)).pipe(Effect.asVoid),
    };
    return InternalGuildsData.layerDatabase(cache);
  }),
);
export const rolesData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    RolesData.layerDatabase({
      deleteByPattern: (pattern) =>
        Effect.tryPromise({
          try: () => redis.deleteByPattern(pattern),
          catch: (cause) => new OrganizationWorkspaceOperationError({ cause }),
        }).pipe(Effect.asVoid),
    }),
  ),
);
export const guildConfigurationData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    GuildConfigurationData.layerDatabase({
      get: (key) =>
        Effect.tryPromise({
          try: () => redis.get(key),
          catch: (cause) => new AccountOrganizationOperationError({ cause }),
        }),
      set: (key, value, ttl) =>
        Effect.tryPromise({
          try: () => redis.set(key, value, ttl),
          catch: (cause) => new AccountOrganizationOperationError({ cause }),
        }),
      del: (key) =>
        Effect.tryPromise({
          try: () => redis.del(key),
          catch: (cause) => new AccountOrganizationOperationError({ cause }),
        }).pipe(Effect.asVoid),
    }),
  ),
);
