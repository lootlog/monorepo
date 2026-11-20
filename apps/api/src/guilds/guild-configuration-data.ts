import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { AccountOrganizationOperationError } from "#src/guilds/account-organization-data";
import {
  getGuildCacheKey,
  readGuildConfigurationCache,
  writeGuildConfigurationCache,
  type GuildConfigurationCache,
} from "./guild-configuration-cache.js";
import { Context, Effect, Layer } from "effect";
import { eq } from "drizzle-orm";
import { compact } from "es-toolkit";
import { ApiDatabase } from "#src/database/drizzle/database";
import { guildTable } from "#src/database/drizzle/organization.schema";
import { timerTable } from "#src/database/drizzle/timer.schema";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { findActiveGuild } from "./active-guild-lookup.js";
import { parseVanityUrl } from "./vanity-url.js";
import { ErrorKey } from "./error-key.js";
import type { UpdateOrganizationConfigRequest } from "#src/contracts/guilds/schemas";

type DataEffect<A> = Effect.Effect<A, AccountOrganizationOperationError>;

const invalidReservationRange = () =>
  new InvalidRequestError({
    code: ErrorKey.GUILDS_RESERVATION_DURATION_RANGE_INVALID,
  });

const validateGuildConfiguration = (
  payload: UpdateOrganizationConfigRequest,
) => {
  if (
    payload.reservationMinDurationMinutes !== undefined &&
    payload.reservationMaxDurationMinutes !== undefined &&
    payload.reservationMinDurationMinutes >
      payload.reservationMaxDurationMinutes
  ) {
    return invalidReservationRange();
  }
};

const validateGuildConfigurationAgainstStored = (
  payload: UpdateOrganizationConfigRequest,
  stored: typeof guildTable.$inferSelect | undefined,
) => {
  if (!stored) return;

  if (
    (payload.reservationMinDurationMinutes !== undefined &&
      payload.reservationMaxDurationMinutes === undefined &&
      payload.reservationMinDurationMinutes >
        stored.reservationMaxDurationMinutes) ||
    (payload.reservationMaxDurationMinutes !== undefined &&
      payload.reservationMinDurationMinutes === undefined &&
      stored.reservationMinDurationMinutes >
        payload.reservationMaxDurationMinutes)
  ) {
    return invalidReservationRange();
  }
};

const buildGuildConfigurationUpdate = (
  payload: UpdateOrganizationConfigRequest,
  vanityUrl: string | null,
) => {
  const update: Partial<typeof guildTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (Object.hasOwn(payload, "vanityUrl")) update.vanityUrl = vanityUrl;

  if (payload.publicStatsCardEnabled !== undefined)
    update.publicStatsCardEnabled = payload.publicStatsCardEnabled;

  if (payload.reservationMaxDurationMinutes !== undefined)
    update.reservationMaxDurationMinutes =
      payload.reservationMaxDurationMinutes;

  if (payload.reservationMinDurationMinutes !== undefined)
    update.reservationMinDurationMinutes =
      payload.reservationMinDurationMinutes;

  if (payload.reservationTimeGranularityMinutes !== undefined)
    update.reservationTimeGranularityMinutes =
      payload.reservationTimeGranularityMinutes;

  if (payload.reservationMaxAdvanceDays !== undefined)
    update.reservationMaxAdvanceDays = payload.reservationMaxAdvanceDays;

  if (payload.reservationActiveLimitPerSpot !== undefined)
    update.reservationActiveLimitPerSpot =
      payload.reservationActiveLimitPerSpot;

  return update;
};

export class GuildConfigurationData extends Context.Service<
  GuildConfigurationData,
  {
    readonly getGuildById: (
      guildId: string,
    ) => DataEffect<
      | NonNullable<
          Effect.Success<ReturnType<typeof readGuildConfigurationCache>>
        >
      | typeof guildTable.$inferSelect
    >;
    readonly updateGuildConfig: (
      guildId: string,
      payload: UpdateOrganizationConfigRequest,
    ) => DataEffect<typeof guildTable.$inferSelect>;
    readonly getWorldsByGuildId: (
      guildId: string,
    ) => DataEffect<ReadonlyArray<string>>;
  }
>()("@lootlog/api/http-api/guild-configuration/data") {
  static layerDatabase(cache: GuildConfigurationCache) {
    return Layer.effect(
      GuildConfigurationData,
      Effect.map(ApiDatabase, (database) => {
        const operation = <A, E>(effect: Effect.Effect<A, E>) =>
          effect.pipe(
            Effect.mapError(
              (cause) => new AccountOrganizationOperationError({ cause }),
            ),
          );

        return GuildConfigurationData.of({
          getGuildById: (idOrVanityUrl) =>
            operation(
              Effect.gen(function* () {
                const cached = yield* readGuildConfigurationCache(
                  cache,
                  idOrVanityUrl,
                );

                if (cached) return cached;

                const guild = yield* findActiveGuild(database, idOrVanityUrl);

                if (!guild) {
                  return yield* Effect.fail(
                    new ResourceNotFoundError({
                      code: ErrorKey.GUILD_NOT_FOUND,
                    }),
                  );
                }

                yield* writeGuildConfigurationCache(
                  cache,
                  idOrVanityUrl,
                  guild,
                );

                return guild;
              }),
            ),
          updateGuildConfig: (guildId, payload) =>
            operation(
              Effect.gen(function* () {
                const validationError = validateGuildConfiguration(payload);

                if (validationError) return yield* Effect.fail(validationError);

                const vanityUrl = payload.vanityUrl
                  ? parseVanityUrl(payload.vanityUrl)
                  : null;

                if (vanityUrl?.error) {
                  return yield* Effect.fail(
                    new InvalidRequestError({ code: vanityUrl.error }),
                  );
                }

                const oldRows = yield* database
                  .select()
                  .from(guildTable)
                  .where(eq(guildTable.id, guildId))
                  .limit(1);

                const oldGuild = oldRows[0];

                const storedValidationError =
                  validateGuildConfigurationAgainstStored(payload, oldGuild);

                if (storedValidationError) {
                  return yield* Effect.fail(storedValidationError);
                }

                const updatedRows = yield* database
                  .update(guildTable)
                  .set(
                    buildGuildConfigurationUpdate(
                      payload,
                      vanityUrl?.slug ?? null,
                    ),
                  )
                  .where(eq(guildTable.id, guildId))
                  .returning();

                const guild = updatedRows[0];

                if (!guild) {
                  return yield* Effect.fail(
                    new ResourceNotFoundError({
                      code: ErrorKey.GUILD_NOT_FOUND,
                    }),
                  );
                }

                // The row is cached under every key it was looked up by, so a
                // change must evict the id entry and both vanity entries.
                yield* Effect.forEach(
                  [
                    ...new Set(
                      compact([guildId, oldGuild?.vanityUrl, guild.vanityUrl]),
                    ),
                  ],
                  (key) => cache.del(getGuildCacheKey(key)),
                  { concurrency: "unbounded" },
                );

                return guild;
              }).pipe(
                withAdapterSpan(
                  "guild-configuration.update.persistence",
                  "ApiDatabase",
                ),
              ),
            ),
          getWorldsByGuildId: (guildId) =>
            operation(
              database
                .selectDistinct({ world: timerTable.world })
                .from(timerTable)
                .where(eq(timerTable.guildId, guildId))
                .pipe(Effect.map((rows) => rows.map(({ world }) => world))),
            ),
        });
      }),
    );
  }
}
