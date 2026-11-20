import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import { isObjectRecord } from "@lootlog/schema/records";
import {
  DISCORD_GUILD_SYNC_STALE_AFTER_SECONDS,
  getUserGuildPermissionsCacheScope,
} from "#src/shared/cache";
import { ApiDatabase } from "#src/database/drizzle/database";
import { makeDiscordBotClient } from "#src/discord-bot-client/discord-bot-client";
import { MEMBER_LAST_DISCORD_STATUS } from "#src/members/member-discord-status";
import { outboundHttpRequest } from "#src/shared/http/outbound-http";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer, Redacted } from "effect";
import { HttpClient } from "effect/http";
import {
  GuildSummaryCacheSchema,
  makeAccessibleGuilds,
} from "#src/guilds/accessible-guilds.data-layer";
import { makeCurrentUserGuilds } from "#src/guilds/current-user-guilds.data-layer";
import { makeGuildChannelDeletedDispatcher } from "#src/guilds/guild-channel-deleted-outbox";
import { makeGuildDiscordSyncData } from "#src/guilds/guild-discord-sync.data-layer";
import { makeOutboxWorker } from "#src/shared/outbox-worker";
import { makeManageableGuilds } from "#src/guilds/manageable-guilds.data-layer";
import { makeUserAccountDeletion } from "#src/users/user-account-deletion.data-layer";
import { makeUserPreferencesData } from "#src/users/user-preferences.data-layer";
import { SettingsDocumentsRepository } from "#src/settings-documents/settings-documents.repository";
import { makeSettingsDocuments } from "#src/settings-documents/settings-documents.service";
import { AccountOrganizationData } from "#src/guilds/account-organization-data";
import { GuildConfigurationData } from "#src/guilds/guild-configuration-data";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { OrganizationContextLookup } from "#src/runtime/auth/organization-context";
import { InternalGuildsData } from "#src/guilds/internal-guilds-data";
import { OrganizationWorkspaceOperationError } from "#src/guilds/organization-workspace-access";
import { RolesData } from "#src/guilds/roles-data";
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

    const channelDeletions = yield* makeOutboxWorker(
      "Discord channel deletion",
      makeGuildChannelDeletedDispatcher(database, (payload, messageId) =>
        rabbit.publish(
          eventMessage(
            RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
            payload,
            {
              messageId,
            },
          ),
        ),
      )(),
    );

    yield* channelDeletions.run.pipe(Effect.forkScoped);

    return makeGuildDiscordSyncData(database, {
      staleAfterMs: DISCORD_GUILD_SYNC_STALE_AFTER_SECONDS * 1000,
      refresh: (guildId) => discordBot.refreshGuildChannels(guildId),
      signalChannelDeletions: channelDeletions.signal,
    });
  }),
);

export const organizationContextLookup = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const { refresh } = yield* MemberServices;

    return OrganizationContextLookup.layerDatabase(
      redis,
      refresh.queueMemberRefresh,
    );
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
    const settingsRepository = yield* SettingsDocumentsRepository;

    const deleteAccount = makeUserAccountDeletion(database, {
      cleanupBattlelog: (userId) =>
        outboundHttpRequest(httpClient, {
          adapter: "battlelog-account-cleanup",
          body: JSON.stringify({ userId }),
          headers: {
            "content-type": "application/json",
            authorization: config.battlelogCleanupSecret
              ? `Bearer ${Redacted.value(config.battlelogCleanupSecret)}`
              : "",
          },
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
            isObjectRecord(body) &&
            "status" in body &&
            body.status === "ACCEPTED"
              ? Effect.void
              : Effect.fail(new Error("Unexpected Battlelog cleanup response")),
          ),
        ),
      invalidateCacheScopes: redis.invalidateScopes,
      deleteCacheKey: redis.del,
      deleteCachePattern: (pattern) => redis.deleteByPattern(pattern),
      publishMemberRemoved: (payload) =>
        rabbit.publish(
          eventMessage(RabbitRoutingKey.GUILDS_MEMBERS_REMOVE, payload),
        ),
    });

    const preferences = makeUserPreferencesData(
      database,
      makeSettingsDocuments(settingsRepository),
    );

    const getManageableUserGuilds = makeManageableGuilds(
      ({ userId, discordId }) => discord.getUserGuilds(userId, discordId),
    );

    const getCurrentUserAccessibleGuilds = makeAccessibleGuilds(
      database,
      {
        getCached: (key) =>
          redis.getJson(key, makeJsonCodec(GuildSummaryCacheSchema)),
        setCached: (key, value, ttl) => redis.setJson(key, value, ttl),
        setIfAbsent: redis.setNX,
        deleteCached: redis.del,
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
        discordGuilds: ({ userId, discordId }, { refresh }) =>
          refresh
            ? discord.getFreshCompleteUserGuilds(userId, discordId)
            : discord.getCachedCompleteUserGuilds(userId, discordId),
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
      ...preferences,
    });
  }),
).pipe(Layer.provide(SettingsDocumentsRepository.layerDatabase));

export const accountOrganizationData = Layer.effect(
  AccountOrganizationData,
  Effect.map(AccountOrganizationOperations, (operations) =>
    AccountOrganizationData.of(operations),
  ),
);

export const internalGuildsData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) =>
    InternalGuildsData.layerDatabase({
      ...redis,
      getOrSetJsonEffect: redis.getOrSetJson,
    }),
  ),
);

export const rolesData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;

    return RolesData.layerDatabase(
      {
        invalidateUserGuildPermissions: (discordId) =>
          redis
            .invalidateScopes(getUserGuildPermissionsCacheScope(discordId))
            .pipe(
              Effect.mapError(
                (cause) => new OrganizationWorkspaceOperationError({ cause }),
              ),
            ),
        deleteByPattern: (pattern) =>
          redis.deleteByPattern(pattern).pipe(
            Effect.asVoid,
            Effect.mapError(
              (cause) => new OrganizationWorkspaceOperationError({ cause }),
            ),
          ),
      },
      {
        memberPolicyChanged: (member) =>
          rabbit
            .publish(
              eventMessage(RabbitRoutingKey.GUILDS_MEMBERS_UPDATE, member),
            )
            .pipe(Effect.asVoid),
      },
    );
  }),
);

export const guildConfigurationData = Layer.unwrap(
  Effect.map(ApiRedis, (redis) => GuildConfigurationData.layerDatabase(redis)),
);
