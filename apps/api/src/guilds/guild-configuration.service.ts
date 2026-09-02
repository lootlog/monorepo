import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import {
  resolveReservationSettings,
  type ReservationSettings,
} from "@lootlog/domain/reservations";
import { RedisService } from "#src/redis/redis.service";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import {
  getGuildCacheKey,
  GUILD_CACHE_TTL_SECONDS,
} from "#src/shared/constants/cache.constant";
import { generateSlug } from "#src/shared/utils/generate-slug";
import { hasOwnField } from "#src/shared/utils/has-own-field";
import { RESTRICTED_VANITY_URLS } from "./constants/restricted-vanity-urls.js";
import type { UpdateGuildConfigDto } from "./dto/update-guild-config.dto.js";
import { ErrorKey } from "./enum/error-key.enum.js";
import { GuildsRepository } from "./guilds.repository.js";

export class GuildConfigurationService {
  constructor(
    private readonly guildsRepository: GuildsRepository,
    private readonly redis: RedisService,
    private readonly logger: Pick<Logger, "warn">,
  ) {}

  async getGuildById(idOrVanityUrl: string) {
    const cacheKey = getGuildCacheKey(idOrVanityUrl);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      try {
        return this.withReservationSettingsDefaults(JSON.parse(cached));
      } catch (error) {
        this.logger.warn({
          message: `Failed to parse cached guild data for key ${cacheKey}`,
          error,
        });
        await this.redis.del(cacheKey);
      }
    }

    const guild = await this.guildsRepository.findActive(idOrVanityUrl);
    if (!guild) {
      throw new NotFoundException({ message: ErrorKey.GUILD_NOT_FOUND });
    }

    const serialized = JSON.stringify(guild);
    const writes = [
      this.redis.set(
        getGuildCacheKey(guild.id),
        serialized,
        GUILD_CACHE_TTL_SECONDS,
      ),
    ];
    if (guild.vanityUrl) {
      writes.push(
        this.redis.set(
          getGuildCacheKey(guild.vanityUrl),
          serialized,
          GUILD_CACHE_TTL_SECONDS,
        ),
      );
    }
    await Promise.all(writes);
    return guild;
  }

  async updateGuildConfig(guildId: string, data: UpdateGuildConfigDto) {
    this.validateReservationSettings(data);
    if (data.vanityUrl && RESTRICTED_VANITY_URLS.includes(data.vanityUrl)) {
      throw new BadRequestException({
        message: ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
      });
    }

    const oldGuild = await this.guildsRepository.findById(guildId);
    this.validateReservationSettingsAgainstStored(data, oldGuild);

    const guild = await this.guildsRepository.update(
      guildId,
      this.buildUpdate(data),
    );
    if (!guild) {
      throw new NotFoundException({ message: ErrorKey.GUILD_NOT_FOUND });
    }

    const invalidations = [this.redis.del(getGuildCacheKey(guildId))];
    if (oldGuild?.vanityUrl && oldGuild.vanityUrl !== guild.vanityUrl) {
      invalidations.push(this.redis.del(getGuildCacheKey(oldGuild.vanityUrl)));
    }
    await Promise.all(invalidations);
    return guild;
  }

  async getWorldsByGuildId(guildId: string) {
    return (await this.guildsRepository.getWorlds(guildId)).map(
      ({ world }) => world,
    );
  }

  private validateReservationSettings(data: UpdateGuildConfigDto) {
    if (
      data.reservationMinDurationMinutes !== undefined &&
      data.reservationMaxDurationMinutes !== undefined &&
      data.reservationMinDurationMinutes > data.reservationMaxDurationMinutes
    ) {
      this.throwInvalidReservationRange();
    }
  }

  private validateReservationSettingsAgainstStored(
    data: UpdateGuildConfigDto,
    stored: Awaited<ReturnType<GuildsRepository["findById"]>>,
  ) {
    if (!stored) return;
    if (
      data.reservationMinDurationMinutes !== undefined &&
      data.reservationMaxDurationMinutes === undefined &&
      data.reservationMinDurationMinutes > stored.reservationMaxDurationMinutes
    ) {
      this.throwInvalidReservationRange();
    }
    if (
      data.reservationMaxDurationMinutes !== undefined &&
      data.reservationMinDurationMinutes === undefined &&
      stored.reservationMinDurationMinutes > data.reservationMaxDurationMinutes
    ) {
      this.throwInvalidReservationRange();
    }
  }

  private throwInvalidReservationRange(): never {
    throw new BadRequestException({
      message: ErrorKey.GUILDS_RESERVATION_DURATION_RANGE_INVALID,
    });
  }

  private buildUpdate(data: UpdateGuildConfigDto) {
    return {
      ...(hasOwnField(data, "vanityUrl")
        ? { vanityUrl: generateSlug(data.vanityUrl ?? undefined) }
        : {}),
      ...(data.publicStatsCardEnabled === undefined
        ? {}
        : { publicStatsCardEnabled: data.publicStatsCardEnabled }),
      ...(data.reservationMaxDurationMinutes === undefined
        ? {}
        : {
            reservationMaxDurationMinutes: data.reservationMaxDurationMinutes,
          }),
      ...(data.reservationMinDurationMinutes === undefined
        ? {}
        : {
            reservationMinDurationMinutes: data.reservationMinDurationMinutes,
          }),
      ...(data.reservationTimeGranularityMinutes === undefined
        ? {}
        : {
            reservationTimeGranularityMinutes:
              data.reservationTimeGranularityMinutes,
          }),
      ...(data.reservationMaxAdvanceDays === undefined
        ? {}
        : { reservationMaxAdvanceDays: data.reservationMaxAdvanceDays }),
      ...(data.reservationActiveLimitPerSpot === undefined
        ? {}
        : {
            reservationActiveLimitPerSpot: data.reservationActiveLimitPerSpot,
          }),
    };
  }

  private withReservationSettingsDefaults<
    T extends Record<string, unknown> & Partial<ReservationSettings>,
  >(guild: T) {
    return { ...guild, ...resolveReservationSettings(guild) };
  }
}
