import { Effect, Layer, Predicate } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  OrganizationOperatorData,
  makeOrganizationOperatorData,
} from "#src/guilds/organization-operator.data-layer";
import {
  OrganizationOperatorError,
  OrganizationSyncCooldown,
} from "#src/guilds/organization-operator.shared";
import { GuildDiscordSync } from "#src/runtime/features/organizations";
import { MemberServices } from "#src/runtime/features/members";
import { NotificationsServices } from "#src/runtime/features/notifications";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { getUserGuildPermissionsCacheScope } from "#src/shared/cache";

export const organizationOperatorData = Layer.effect(
  OrganizationOperatorData,
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const redis = yield* ApiRedis;
    const discordSync = yield* GuildDiscordSync;
    const { memberDelivery } = yield* MemberServices;
    const { rebuild } = yield* NotificationsServices;

    return makeOrganizationOperatorData(database, {
      refreshDiscordSync: (guildId) =>
        discordSync
          .refreshGuildDiscordSync(guildId)
          .pipe(
            Effect.mapError((error) =>
              Predicate.isTagged(error.cause, "RateLimitedError")
                ? new OrganizationSyncCooldown()
                : new OrganizationOperatorError({ cause: error }),
            ),
          ),
      deliverMemberChanges: memberDelivery.deliverAll,
      invalidateUserGuildPermissions: (discordId) =>
        redis.invalidateScopes(getUserGuildPermissionsCacheScope(discordId)),
      clearCachePattern: (pattern) => redis.deleteByPattern(pattern),
      clearCacheKey: (key) => redis.del(key),
      rebuildNotificationRule: rebuild.rebuildRule,
    });
  }),
);
