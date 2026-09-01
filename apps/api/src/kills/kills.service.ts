import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../prisma/contract.js";
import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { createId } from "@paralleldrive/cuid2";
import { Injectable, Inject } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { getNpcTypeByWt } from "@lootlog/types";
import { PrismaService } from "#src/db/prisma.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import { isAdministrativeUser } from "#src/shared/permissions/is-administrative-user";
import { getStableNpcId } from "#src/shared/utils/get-stable-npc-id";
import { GuildsService } from "#src/guilds/guilds.service";
import type { CreateKillDto } from "./dto/create-kill.dto.js";
import type {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from "./dto/get-kill-stats.dto.js";
import type { GetUserNpcKillsDto } from "./dto/get-user-npc-kills.dto.js";
import type { GetMemberKillsDto } from "./dto/get-member-kills.dto.js";
import {
  buildGuildKillDedupKey,
  buildUserKillDedupKey,
} from "./utils/kill-dedup-key.js";
import {
  getKillStatsBucketStart,
  getKillStatsPeriodStart,
  type KillStatsPeriod,
} from "./utils/kill-stats-period.js";
import { dateToTemporal } from "#src/db/temporal";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];
type Role = FieldOutputTypes["public"]["Role"];

const KILL_DEDUP_TTL_SECONDS = 30;
const KILL_STATS_CACHE_TTL_SECONDS = 30;
const KILL_STATS_CACHE_PREFIX = "kill-stats";

@Injectable()
export class KillsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
    private readonly guildsService: GuildsService,
  ) {}

  private buildKillStatsCacheKey(
    scope: string,
    ownerId: string,
    params: Record<string, unknown>,
  ) {
    const encodedParams = Buffer.from(this.stableSerialize(params)).toString(
      "base64url",
    );
    return `${KILL_STATS_CACHE_PREFIX}:${scope}:${ownerId}:${encodedParams}`;
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }

    return JSON.stringify(value);
  }

  private buildVisibilityCacheScope(
    administrativeUser: boolean,
    roles: Role[],
  ) {
    if (administrativeUser) {
      return { administrativeUser: true };
    }

    return {
      administrativeUser: false,
      roles: roles
        .map((role) => ({
          id: role.id,
          lvlRangeFrom: role.lvlRangeFrom,
          lvlRangeTo: role.lvlRangeTo,
          permissions: [...role.permissions].sort(),
        }))
        .sort((leftRole, rightRole) => leftRole.id.localeCompare(rightRole.id)),
    };
  }

  private async deleteKillStatsCacheByPattern(pattern: string) {
    try {
      await this.redis.deleteByPattern(pattern);
    } catch (error) {
      this.logger.warn("Failed to invalidate kill stats cache", {
        error,
        pattern,
      });
    }
  }

  private async invalidateKillStatsCaches(options: {
    userId?: string;
    guildIds?: string[];
  }) {
    const patterns: string[] = [];

    if (options.userId) {
      patterns.push(`${KILL_STATS_CACHE_PREFIX}:user-*:${options.userId}:*`);
    }

    for (const guildId of new Set(options.guildIds ?? [])) {
      patterns.push(`${KILL_STATS_CACHE_PREFIX}:guild-*:${guildId}:*`);
      patterns.push(`${KILL_STATS_CACHE_PREFIX}:member-kills:${guildId}:*`);
    }

    await Promise.all(
      patterns.map((pattern) => this.deleteKillStatsCacheByPattern(pattern)),
    );
  }

  private async getCachedKillStats<T>(
    cacheKey: string,
    label: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.redis.getJson<T>(cacheKey);

    if (cached !== null) {
      this.logger.log({
        level: "debug",
        message: `Cache hit for ${label}`,
        cacheKey,
      });
      return cached;
    }

    this.logger.log({
      level: "debug",
      message: `Cache miss for ${label}`,
      cacheKey,
    });

    return this.redis.getOrSetJson({
      key: cacheKey,
      ttlSeconds: KILL_STATS_CACHE_TTL_SECONDS,
      factory,
    });
  }

  async createKill(discordId: string, data: CreateKillDto) {
    const npcType = getNpcTypeByWt(NpcType, data.npc.wt, data.npc.prof);
    const npcId = getStableNpcId(data.npc.id, data.npc.name, npcType);
    const killedAt = new Date();
    const periodStart = getKillStatsBucketStart(killedAt);
    let userStatsUpdated = false;

    // 1. User deduplication (30s window) - same user killing same NPC
    const userDedupKey = buildUserKillDedupKey(discordId, {
      world: data.world,
      npcId,
    });
    const isNewUserKill = await this.redis.setNX(
      userDedupKey,
      "1",
      KILL_DEDUP_TTL_SECONDS,
    );

    if (!isNewUserKill) {
      return { deduplicated: true, updated: 0 };
    }

    // 2. Save to UserKillStats for personal stats
    try {
      const userStats = await this.prisma.db.orm.public.UserKillStats.where(
        (row) =>
          and(
            row.userId.eq(discordId),
            row.world.eq(data.world),
            row.npcId.eq(npcId),
          ),
      ).first();
      await this.prisma.db.orm.public.UserKillStats.where((row) =>
        and(
          row.userId.eq(discordId),
          row.world.eq(data.world),
          row.npcId.eq(npcId),
        ),
      ).upsert({
        create: {
          id: createId(),
          userId: discordId,
          world: data.world,
          npcId,
          npcName: data.npc.name,
          npcType,
          npcLvl: data.npc.lvl,
          npcProf: data.npc.prof,
          npcIcon: data.npc.icon,
          totalKills: 1,
          lastKilledAt: dateToTemporal(killedAt),
          updatedAt: dateToTemporal(killedAt),
        },
        conflictOn: { userId: discordId, world: data.world, npcId },
        update: {
          totalKills: (userStats?.totalKills ?? 0) + 1,
          lastKilledAt: dateToTemporal(killedAt),
          npcName: data.npc.name,
          npcLvl: data.npc.lvl,
          npcProf: data.npc.prof,
          npcIcon: data.npc.icon,
          updatedAt: dateToTemporal(killedAt),
        },
      });
      userStatsUpdated = true;
      const userStatsBucket =
        await this.prisma.db.orm.public.UserKillStatsBucket.where((row) =>
          and(
            row.userId.eq(discordId),
            row.world.eq(data.world),
            row.npcId.eq(npcId),
            row.periodStart.eq(dateToTemporal(periodStart)),
          ),
        ).first();
      await this.prisma.db.orm.public.UserKillStatsBucket.where((row) =>
        and(
          row.userId.eq(discordId),
          row.world.eq(data.world),
          row.npcId.eq(npcId),
          row.periodStart.eq(dateToTemporal(periodStart)),
        ),
      ).upsert({
        create: {
          id: createId(),
          userId: discordId,
          world: data.world,
          npcId,
          npcName: data.npc.name,
          npcType,
          npcLvl: data.npc.lvl,
          npcProf: data.npc.prof,
          npcIcon: data.npc.icon,
          totalKills: 1,
          periodStart: dateToTemporal(periodStart),
          lastKilledAt: dateToTemporal(killedAt),
          updatedAt: dateToTemporal(killedAt),
        },
        conflictOn: {
          userId: discordId,
          world: data.world,
          npcId,
          periodStart: dateToTemporal(periodStart),
        },
        update: {
          totalKills: (userStatsBucket?.totalKills ?? 0) + 1,
          lastKilledAt: dateToTemporal(killedAt),
          npcName: data.npc.name,
          npcLvl: data.npc.lvl,
          npcProf: data.npc.prof,
          npcIcon: data.npc.icon,
          updatedAt: dateToTemporal(killedAt),
        },
      });
    } catch (error) {
      this.logger.error({
        message: "Failed to upsert user kill stats",
        error: error instanceof Error ? error.message : error,
      });
    }

    // 3. Get guild config for this character
    const guildContextPromise = Promise.all([
      this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        data.accountId,
        data.characterId,
      ),
      this.guildsService.getGuildsForRequiredPermissions(discordId, [
        Permission.LOOTLOG_LOOTS_WRITE,
      ]),
    ]);

    if (userStatsUpdated) {
      await Promise.all([
        this.invalidateKillStatsCaches({ userId: discordId }),
        guildContextPromise,
      ]);
    }

    const [config, writableGuilds] = await guildContextPromise;

    const writableGuildIds = new Set(writableGuilds.map((guild) => guild.id));
    const targetGuildIds = new Set(config?.catchingGuildIds ?? []);
    const guildIdArray = Array.from(targetGuildIds).filter((guildId) =>
      writableGuildIds.has(guildId),
    );

    if (guildIdArray.length === 0) {
      return { updated: 0 };
    }

    // 4. Batch-fetch members for all target guilds (single query)
    const members = (await this.prisma.db.orm.public.Member.where((row) =>
      and(row.userId.eq(discordId), row.guildId.in(guildIdArray)),
    ).all()) as Array<{ id: number; guildId: string }>;
    const membersByGuild = new Map(members.map((m) => [m.guildId, m]));

    // 5. Process each guild
    const results = await Promise.all(
      guildIdArray.map(async (guildId) => {
        const member = membersByGuild.get(guildId);
        let guildStatsUpdated = false;

        if (!member) {
          this.logger.log({
            level: "debug",
            message: `Member not found for guildId ${guildId}, skipping kill stats`,
          });
          return null;
        }

        try {
          // 4a. Always increment member participation (memberKills)
          const memberStats =
            await this.prisma.db.orm.public.NpcKillStats.where((row) =>
              and(
                row.guildId.eq(guildId),
                row.memberId.eq(member.id),
                row.world.eq(data.world),
                row.npcId.eq(npcId),
              ),
            ).first();
          await this.prisma.db.orm.public.NpcKillStats.where((row) =>
            and(
              row.guildId.eq(guildId),
              row.memberId.eq(member.id),
              row.world.eq(data.world),
              row.npcId.eq(npcId),
            ),
          ).upsert({
            create: {
              id: createId(),
              guildId,
              memberId: member.id,
              userId: discordId,
              world: data.world,
              npcId,
              npcName: data.npc.name,
              npcType,
              npcLvl: data.npc.lvl,
              npcProf: data.npc.prof,
              npcIcon: data.npc.icon,
              memberKills: 1,
              lastKilledAt: dateToTemporal(killedAt),
              updatedAt: dateToTemporal(killedAt),
            },
            conflictOn: {
              guildId,
              memberId: member.id,
              world: data.world,
              npcId,
            },
            update: {
              memberKills: (memberStats?.memberKills ?? 0) + 1,
              lastKilledAt: dateToTemporal(killedAt),
              npcName: data.npc.name,
              npcLvl: data.npc.lvl,
              npcProf: data.npc.prof,
              npcIcon: data.npc.icon,
              updatedAt: dateToTemporal(killedAt),
            },
          });
          guildStatsUpdated = true;
          const memberStatsBucket =
            await this.prisma.db.orm.public.NpcKillStatsBucket.where((row) =>
              and(
                row.guildId.eq(guildId),
                row.memberId.eq(member.id),
                row.world.eq(data.world),
                row.npcId.eq(npcId),
                row.periodStart.eq(dateToTemporal(periodStart)),
              ),
            ).first();
          await this.prisma.db.orm.public.NpcKillStatsBucket.where((row) =>
            and(
              row.guildId.eq(guildId),
              row.memberId.eq(member.id),
              row.world.eq(data.world),
              row.npcId.eq(npcId),
              row.periodStart.eq(dateToTemporal(periodStart)),
            ),
          ).upsert({
            create: {
              id: createId(),
              guildId,
              memberId: member.id,
              userId: discordId,
              world: data.world,
              npcId,
              npcName: data.npc.name,
              npcType,
              npcLvl: data.npc.lvl,
              npcProf: data.npc.prof,
              npcIcon: data.npc.icon,
              memberKills: 1,
              periodStart: dateToTemporal(periodStart),
              lastKilledAt: dateToTemporal(killedAt),
              updatedAt: dateToTemporal(killedAt),
            },
            conflictOn: {
              guildId,
              memberId: member.id,
              world: data.world,
              npcId,
              periodStart: dateToTemporal(periodStart),
            },
            update: {
              memberKills: (memberStatsBucket?.memberKills ?? 0) + 1,
              lastKilledAt: dateToTemporal(killedAt),
              npcName: data.npc.name,
              npcLvl: data.npc.lvl,
              npcProf: data.npc.prof,
              npcIcon: data.npc.icon,
              updatedAt: dateToTemporal(killedAt),
            },
          });

          // 4b. Guild unique kill deduplication (30s window)
          const guildDedupKey = buildGuildKillDedupKey(guildId, {
            world: data.world,
            npcId,
          });
          const isFirstGuildKill = await this.redis.setNX(
            guildDedupKey,
            "1",
            KILL_DEDUP_TTL_SECONDS,
          );

          if (isFirstGuildKill) {
            // First guild member to report this kill - increment unique kills
            const guildSummary =
              await this.prisma.db.orm.public.GuildKillSummary.where((row) =>
                and(
                  row.guildId.eq(guildId),
                  row.world.eq(data.world),
                  row.npcId.eq(npcId),
                ),
              ).first();
            await this.prisma.db.orm.public.GuildKillSummary.where((row) =>
              and(
                row.guildId.eq(guildId),
                row.world.eq(data.world),
                row.npcId.eq(npcId),
              ),
            ).upsert({
              create: {
                id: createId(),
                guildId,
                world: data.world,
                npcId,
                npcName: data.npc.name,
                npcType,
                npcLvl: data.npc.lvl,
                npcProf: data.npc.prof,
                npcIcon: data.npc.icon,
                uniqueKills: 1,
                lastKilledAt: dateToTemporal(killedAt),
                updatedAt: dateToTemporal(killedAt),
              },
              conflictOn: { guildId, world: data.world, npcId },
              update: {
                uniqueKills: (guildSummary?.uniqueKills ?? 0) + 1,
                lastKilledAt: dateToTemporal(killedAt),
                npcName: data.npc.name,
                npcLvl: data.npc.lvl,
                npcProf: data.npc.prof,
                npcIcon: data.npc.icon,
                updatedAt: dateToTemporal(killedAt),
              },
            });
            guildStatsUpdated = true;
            const guildSummaryBucket =
              await this.prisma.db.orm.public.GuildKillSummaryBucket.where(
                (row) =>
                  and(
                    row.guildId.eq(guildId),
                    row.world.eq(data.world),
                    row.npcId.eq(npcId),
                    row.periodStart.eq(dateToTemporal(periodStart)),
                  ),
              ).first();
            await this.prisma.db.orm.public.GuildKillSummaryBucket.where(
              (row) =>
                and(
                  row.guildId.eq(guildId),
                  row.world.eq(data.world),
                  row.npcId.eq(npcId),
                  row.periodStart.eq(dateToTemporal(periodStart)),
                ),
            ).upsert({
              create: {
                id: createId(),
                guildId,
                world: data.world,
                npcId,
                npcName: data.npc.name,
                npcType,
                npcLvl: data.npc.lvl,
                npcProf: data.npc.prof,
                npcIcon: data.npc.icon,
                uniqueKills: 1,
                periodStart: dateToTemporal(periodStart),
                lastKilledAt: dateToTemporal(killedAt),
                updatedAt: dateToTemporal(killedAt),
              },
              conflictOn: {
                guildId,
                world: data.world,
                npcId,
                periodStart: dateToTemporal(periodStart),
              },
              update: {
                uniqueKills: (guildSummaryBucket?.uniqueKills ?? 0) + 1,
                lastKilledAt: dateToTemporal(killedAt),
                npcName: data.npc.name,
                npcLvl: data.npc.lvl,
                npcProf: data.npc.prof,
                npcIcon: data.npc.icon,
                updatedAt: dateToTemporal(killedAt),
              },
            });
          }

          return { guildId, shouldInvalidate: true, succeeded: true };
        } catch (error) {
          this.logger.error({
            message: `Failed to upsert kill stats for guildId ${guildId}`,
            error: error instanceof Error ? error.message : error,
          });
          return guildStatsUpdated
            ? { guildId, shouldInvalidate: true, succeeded: false }
            : null;
        }
      }),
    );

    const updatedGuildIds = results
      .filter(
        (
          result,
        ): result is {
          guildId: string;
          shouldInvalidate: true;
          succeeded: boolean;
        } => result?.shouldInvalidate === true,
      )
      .map((result) => result.guildId);
    await this.invalidateKillStatsCaches({ guildIds: updatedGuildIds });

    const updated = results.filter((result) => result?.succeeded).length;

    return { updated };
  }

  getGuildKillStats(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    query: GetGuildKillStatsDto,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const periodStart = getKillStatsPeriodStart(query.period);

    const cacheKey = this.buildKillStatsCacheKey("guild-overview", guildId, {
      query,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
    });

    return this.getCachedKillStats(cacheKey, "guild kill stats", async () => {
      const [memberStats, guildSummary] = periodStart
        ? await Promise.all([
            this.applyKillStatsFilters(
              this.prisma.db.orm.public.NpcKillStatsBucket,
              guildId,
              query,
              filteredRoles,
              administrativeUser,
              periodStart,
            )
              .groupBy("memberId", "npcType")
              .aggregate((aggregate) => ({
                memberKills: aggregate.sum("memberKills"),
              })),
            this.applyKillStatsFilters(
              this.prisma.db.orm.public.GuildKillSummaryBucket,
              guildId,
              query,
              filteredRoles,
              administrativeUser,
              periodStart,
            )
              .groupBy("npcType")
              .aggregate((aggregate) => ({
                uniqueKills: aggregate.sum("uniqueKills"),
              })),
          ])
        : await Promise.all([
            this.applyKillStatsFilters(
              this.prisma.db.orm.public.NpcKillStats,
              guildId,
              query,
              filteredRoles,
              administrativeUser,
            )
              .groupBy("memberId", "npcType")
              .aggregate((aggregate) => ({
                memberKills: aggregate.sum("memberKills"),
              })),
            this.applyKillStatsFilters(
              this.prisma.db.orm.public.GuildKillSummary,
              guildId,
              query,
              filteredRoles,
              administrativeUser,
            )
              .groupBy("npcType")
              .aggregate((aggregate) => ({
                uniqueKills: aggregate.sum("uniqueKills"),
              })),
          ]);

      const memberIds = [...new Set(memberStats.map((stat) => stat.memberId))];
      const members: Array<{
        id: number;
        name: string;
        avatar: string | null;
        userId: string;
      }> =
        memberIds.length > 0
          ? await this.prisma.db.orm.public.Member.where((row) =>
              row.id.in(memberIds),
            )
              .select("id", "name", "avatar", "userId")
              .all()
          : [];
      const membersById = new Map(members.map((member) => [member.id, member]));

      const uniqueKillsByType: Record<string, number> = {};
      let guildUniqueKills = 0;

      for (const summary of guildSummary) {
        const uniqueKills = summary.uniqueKills ?? 0;
        uniqueKillsByType[summary.npcType] =
          (uniqueKillsByType[summary.npcType] ?? 0) + uniqueKills;
        guildUniqueKills += uniqueKills;
      }

      const participationsByType: Record<string, number> = {};
      let totalMemberParticipations = 0;

      const memberRankingMap = new Map<
        number,
        {
          memberId: number;
          memberName: string;
          memberAvatar: string | null;
          memberUserId: string;
          totalParticipations: number;
          participationsByType: Record<string, number>;
        }
      >();

      for (const stat of memberStats) {
        const memberKills = stat.memberKills ?? 0;
        participationsByType[stat.npcType] =
          (participationsByType[stat.npcType] ?? 0) + memberKills;
        totalMemberParticipations += memberKills;

        const existing = memberRankingMap.get(stat.memberId);
        if (existing) {
          existing.totalParticipations += memberKills;
          existing.participationsByType[stat.npcType] =
            (existing.participationsByType[stat.npcType] ?? 0) + memberKills;
        } else {
          const member = membersById.get(stat.memberId);
          if (!member) {
            continue;
          }

          memberRankingMap.set(stat.memberId, {
            memberId: stat.memberId,
            memberName: member.name,
            memberAvatar: member.avatar,
            memberUserId: member.userId,
            totalParticipations: memberKills,
            participationsByType: { [stat.npcType]: memberKills },
          });
        }
      }

      const memberRanking = Array.from(memberRankingMap.values()).sort(
        (a, b) => b.totalParticipations - a.totalParticipations,
      );

      return {
        overview: {
          guildUniqueKills,
          totalMemberParticipations,
          killsByType: uniqueKillsByType,
          participationsByType,
        },
        memberRanking,
      };
    });
  }

  private filterReadableRoles(roles: Role[]): Role[] {
    return roles.filter((role) =>
      role.permissions.includes(Permission.LOOTLOG_LOOTS_READ),
    );
  }

  private applyKillStatsFilters(
    collection: any,
    guildId: string | null,
    query: {
      npcTypes?: NpcType[];
      npcType?: NpcType;
      npcId?: number;
      memberId?: number;
      userId?: string;
      world?: string;
      search?: string;
      minLvl?: number;
      maxLvl?: number;
    },
    roles: Role[],
    administrativeUser: boolean,
    periodStart?: Date,
  ) {
    let filtered = collection;

    if (guildId) {
      filtered = filtered.where((row) => row.guildId.eq(guildId));
    }
    if (query.userId) {
      filtered = filtered.where((row) => row.userId.eq(query.userId));
    }
    if (query.memberId !== undefined) {
      filtered = filtered.where((row) => row.memberId.eq(query.memberId));
    }
    if (query.npcId !== undefined) {
      filtered = filtered.where((row) => row.npcId.eq(query.npcId));
    }
    if (query.npcType) {
      filtered = filtered.where((row) => row.npcType.eq(query.npcType));
    }

    if (query.npcTypes?.length) {
      filtered = filtered.where((row) => row.npcType.in(query.npcTypes));
    }
    if (query.world) {
      filtered = filtered.where((row) => row.world.eq(query.world));
    }
    if (query.search) {
      filtered = filtered.where((row) =>
        row.npcName.ilike(`%${query.search}%`),
      );
    }
    if (query.minLvl && query.minLvl > 0) {
      filtered = filtered.where((row) => row.npcLvl.gte(query.minLvl));
    }
    if (query.maxLvl && query.maxLvl > 0) {
      filtered = filtered.where((row) => row.npcLvl.lte(query.maxLvl));
    }
    if (periodStart) {
      filtered = filtered.where((row) =>
        row.periodStart.gte(dateToTemporal(periodStart)),
      );
    }

    if (!administrativeUser && roles.length > 0) {
      filtered = filtered.where((row) =>
        or(
          ...roles.map((role) => {
            const predicates = [
              row.npcLvl.gte(Number(role.lvlRangeFrom ?? 0)),
              row.npcLvl.lte(Number(role.lvlRangeTo ?? 500)),
            ];
            if (
              !role.permissions.includes(Permission.LOOTLOG_LOOTS_TITANS_READ)
            ) {
              predicates.push(row.npcType.neq(NpcType.TITAN));
            }
            if (
              !role.permissions.includes(Permission.LOOTLOG_LOOTS_HEROES_READ)
            ) {
              predicates.push(
                not(row.npcType.in([NpcType.HERO, NpcType.EVENT_HERO])),
              );
            }
            return and(...predicates);
          }),
        ),
      );
    }

    return filtered;
  }

  getUserKillStats(discordId: string, query: GetUserKillStatsDto) {
    const npcTypes = query.npcType
      ? [query.npcType, ...(query.npcTypes ?? [])]
      : query.npcTypes;
    const periodStart = getKillStatsPeriodStart(query.period);
    const cacheKey = this.buildKillStatsCacheKey("user-overview", discordId, {
      query: { ...query, npcTypes },
    });

    return this.getCachedKillStats(cacheKey, "user kill stats", async () => {
      const stats = await this.applyKillStatsFilters(
        periodStart
          ? this.prisma.db.orm.public.UserKillStatsBucket
          : this.prisma.db.orm.public.UserKillStats,
        null,
        { userId: discordId, world: query.world, npcTypes },
        [],
        true,
        periodStart ?? undefined,
      ).all();

      const killsByType: Record<string, number> = {};
      const killsByWorld: Record<string, number> = {};
      let totalKills = 0;

      for (const stat of stats) {
        killsByType[stat.npcType] =
          (killsByType[stat.npcType] ?? 0) + stat.totalKills;
        killsByWorld[stat.world] =
          (killsByWorld[stat.world] ?? 0) + stat.totalKills;
        totalKills += stat.totalKills;
      }

      const npcMap = new Map<
        string,
        {
          npcId: number;
          npcName: string;
          npcType: string;
          npcLvl: number;
          npcProf: string | null;
          npcIcon: string | null;
          totalKills: number;
        }
      >();

      for (const stat of stats) {
        const key = `${stat.world}:${stat.npcId}`;
        const existing = npcMap.get(key);
        if (existing) {
          existing.totalKills += stat.totalKills;
        } else {
          npcMap.set(key, {
            npcId: stat.npcId,
            npcName: stat.npcName,
            npcType: stat.npcType,
            npcLvl: stat.npcLvl,
            npcProf: stat.npcProf,
            npcIcon: stat.npcIcon,
            totalKills: stat.totalKills,
          });
        }
      }

      const topNpcs = Array.from(npcMap.values())
        .sort((a, b) => b.totalKills - a.totalKills)
        .slice(0, query.topNpcsLimit ?? 5);

      return {
        overview: {
          totalKills,
          killsByType,
          killsByWorld,
        },
        topNpcs,
      };
    });
  }

  getUserNpcKills(discordId: string, query: GetUserNpcKillsDto) {
    const npcTypes = query.npcTypes;
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;
    const periodStart = getKillStatsPeriodStart(query.period);

    const cacheKey = this.buildKillStatsCacheKey("user-npcs", discordId, {
      query,
    });

    return this.getCachedKillStats(cacheKey, "user npc kills", async () => {
      const stats = await this.applyKillStatsFilters(
        periodStart
          ? this.prisma.db.orm.public.UserKillStatsBucket
          : this.prisma.db.orm.public.UserKillStats,
        null,
        {
          userId: discordId,
          world: query.world,
          npcTypes,
          search: query.search,
          minLvl: query.minLvl,
          maxLvl: query.maxLvl,
        },
        [],
        true,
        periodStart ?? undefined,
      ).all();

      const npcMap = new Map<
        number,
        {
          npcId: number;
          npcName: string;
          npcType: string;
          npcLvl: number;
          npcProf: string | null;
          npcIcon: string | null;
          totalKills: number;
        }
      >();

      for (const stat of stats) {
        const existing = npcMap.get(stat.npcId);
        if (existing) {
          existing.totalKills += stat.totalKills;
          if (stat.npcLvl > existing.npcLvl) {
            existing.npcLvl = stat.npcLvl;
            existing.npcName = stat.npcName;
            existing.npcProf = stat.npcProf;
            existing.npcIcon = stat.npcIcon;
          }
        } else {
          npcMap.set(stat.npcId, {
            npcId: stat.npcId,
            npcName: stat.npcName,
            npcType: stat.npcType,
            npcLvl: stat.npcLvl,
            npcProf: stat.npcProf,
            npcIcon: stat.npcIcon,
            totalKills: stat.totalKills,
          });
        }
      }

      const sortBy = query.sortBy ?? "kills";
      const sortAsc = query.sortOrder === "asc";

      const allNpcs = Array.from(npcMap.values()).sort((a, b) => {
        if (sortBy === "level") {
          return sortAsc ? a.npcLvl - b.npcLvl : b.npcLvl - a.npcLvl;
        }
        return sortAsc
          ? a.totalKills - b.totalKills
          : b.totalKills - a.totalKills;
      });

      const total = allNpcs.length;
      const paginatedNpcs = allNpcs.slice(cursor, cursor + limit);
      const hasNext = cursor + limit < total;

      return {
        npcs: paginatedNpcs,
        pagination: {
          total,
          cursor,
          limit,
          hasNext,
        },
      };
    });
  }

  getGuildTopNpcs(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    limit: number = 10,
    npcType?: NpcType,
    world?: string,
    search?: string,
    minLvl?: number,
    maxLvl?: number,
    period?: KillStatsPeriod,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const periodStart = getKillStatsPeriodStart(period);

    const cacheKey = this.buildKillStatsCacheKey("guild-top-npcs", guildId, {
      limit,
      maxLvl,
      minLvl,
      npcType,
      period,
      search,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
      world,
    });

    return this.getCachedKillStats(cacheKey, "guild top npcs", async () => {
      const summaries = await this.applyKillStatsFilters(
        periodStart
          ? this.prisma.db.orm.public.GuildKillSummaryBucket
          : this.prisma.db.orm.public.GuildKillSummary,
        guildId,
        { npcType, world, search, minLvl, maxLvl },
        filteredRoles,
        administrativeUser,
        periodStart ?? undefined,
      ).all();

      const npcMap = new Map<
        number,
        {
          npcId: number;
          npcName: string;
          npcType: string;
          npcLvl: number;
          npcProf: string | null;
          npcIcon: string | null;
          uniqueKills: number;
        }
      >();

      for (const summary of summaries) {
        const existing = npcMap.get(summary.npcId);
        if (existing) {
          existing.uniqueKills += summary.uniqueKills;
          if (summary.npcLvl > existing.npcLvl) {
            existing.npcLvl = summary.npcLvl;
            existing.npcName = summary.npcName;
            existing.npcProf = summary.npcProf;
            existing.npcIcon = summary.npcIcon;
          }
        } else {
          npcMap.set(summary.npcId, {
            npcId: summary.npcId,
            npcName: summary.npcName,
            npcType: summary.npcType,
            npcLvl: summary.npcLvl,
            npcProf: summary.npcProf,
            npcIcon: summary.npcIcon,
            uniqueKills: summary.uniqueKills,
          });
        }
      }

      const topNpcs = Array.from(npcMap.values())
        .sort((a, b) => b.uniqueKills - a.uniqueKills)
        .slice(0, limit);

      return { topNpcs };
    });
  }

  getGuildTopKillersByType(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    npcTypes: NpcType[],
    limit: number = 5,
    period?: KillStatsPeriod,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const periodStart = getKillStatsPeriodStart(period);

    const cacheKey = this.buildKillStatsCacheKey("guild-top-killers", guildId, {
      limit,
      npcTypes,
      period,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
    });

    return this.getCachedKillStats(cacheKey, "guild top killers", async () => {
      const stats = await this.applyKillStatsFilters(
        periodStart
          ? this.prisma.db.orm.public.NpcKillStatsBucket
          : this.prisma.db.orm.public.NpcKillStats,
        guildId,
        { npcTypes },
        filteredRoles,
        administrativeUser,
        periodStart ?? undefined,
      )
        .include("member")
        .all();

      const resultByType: Record<
        string,
        Array<{
          memberId: number;
          memberName: string;
          memberAvatar: string | null;
          memberUserId: string;
          totalParticipations: number;
        }>
      > = {};

      for (const npcType of npcTypes) {
        const memberMap = new Map<
          number,
          {
            memberId: number;
            memberName: string;
            memberAvatar: string | null;
            memberUserId: string;
            totalParticipations: number;
          }
        >();

        for (const stat of stats) {
          if (stat.npcType !== npcType) continue;

          const existing = memberMap.get(stat.memberId);
          if (existing) {
            existing.totalParticipations += stat.memberKills;
          } else {
            memberMap.set(stat.memberId, {
              memberId: stat.memberId,
              memberName: stat.member.name,
              memberAvatar: stat.member.avatar,
              memberUserId: stat.member.userId,
              totalParticipations: stat.memberKills,
            });
          }
        }

        resultByType[npcType] = Array.from(memberMap.values())
          .sort((a, b) => b.totalParticipations - a.totalParticipations)
          .slice(0, limit);
      }

      return resultByType;
    });
  }

  getNpcKillers(
    guildId: string,
    permissions: Permission[],
    roles: Role[],
    npcId: number,
    limit: number = 50,
    world?: string,
    period?: KillStatsPeriod,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const periodStart = getKillStatsPeriodStart(period);

    const cacheKey = this.buildKillStatsCacheKey("guild-npc-killers", guildId, {
      limit,
      npcId,
      period,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
      world,
    });

    return this.getCachedKillStats(cacheKey, "npc killers", async () => {
      const stats = await this.applyKillStatsFilters(
        periodStart
          ? this.prisma.db.orm.public.NpcKillStatsBucket
          : this.prisma.db.orm.public.NpcKillStats,
        guildId,
        { npcId, world },
        filteredRoles,
        administrativeUser,
        periodStart ?? undefined,
      )
        .include("member")
        .all();

      const summaries = await this.applyKillStatsFilters(
        periodStart
          ? this.prisma.db.orm.public.GuildKillSummaryBucket
          : this.prisma.db.orm.public.GuildKillSummary,
        guildId,
        { npcId, world },
        filteredRoles,
        administrativeUser,
        periodStart ?? undefined,
      ).all();

      const metadataSummaries =
        stats.length === 0 && summaries.length === 0
          ? await this.applyKillStatsFilters(
              this.prisma.db.orm.public.GuildKillSummary,
              guildId,
              { npcId },
              filteredRoles,
              administrativeUser,
            ).all()
          : [];

      if (
        stats.length === 0 &&
        summaries.length === 0 &&
        metadataSummaries.length === 0
      ) {
        return null;
      }

      const memberMap = new Map<
        number,
        {
          memberId: number;
          memberName: string;
          memberAvatar: string | null;
          memberUserId: string;
          participationCount: number;
        }
      >();

      let totalMemberParticipations = 0;
      let npcInfo: {
        npcId: number;
        npcName: string;
        npcType: string;
        npcLvl: number;
        npcProf: string | null;
        npcIcon: string | null;
      } | null = null;

      for (const stat of stats) {
        totalMemberParticipations += stat.memberKills;

        if (!npcInfo || stat.npcLvl > npcInfo.npcLvl) {
          npcInfo = {
            npcId: stat.npcId,
            npcName: stat.npcName,
            npcType: stat.npcType,
            npcLvl: stat.npcLvl,
            npcProf: stat.npcProf,
            npcIcon: stat.npcIcon,
          };
        }

        const existing = memberMap.get(stat.memberId);
        if (existing) {
          existing.participationCount += stat.memberKills;
        } else {
          memberMap.set(stat.memberId, {
            memberId: stat.memberId,
            memberName: stat.member.name,
            memberAvatar: stat.member.avatar,
            memberUserId: stat.member.userId,
            participationCount: stat.memberKills,
          });
        }
      }

      const npcInfoSummaries =
        summaries.length > 0 ? summaries : metadataSummaries;
      if (!npcInfo && npcInfoSummaries.length > 0) {
        const summary = npcInfoSummaries.reduce((highest, current) =>
          current.npcLvl > highest.npcLvl ? current : highest,
        );
        npcInfo = {
          npcId: summary.npcId,
          npcName: summary.npcName,
          npcType: summary.npcType,
          npcLvl: summary.npcLvl,
          npcProf: summary.npcProf,
          npcIcon: summary.npcIcon,
        };
      }

      if (!npcInfo) {
        return null;
      }

      const killers = Array.from(memberMap.values())
        .sort((a, b) => b.participationCount - a.participationCount)
        .slice(0, limit);

      return {
        npc: {
          ...npcInfo,
          uniqueGuildKills: summaries.reduce(
            (total, summary) => total + summary.uniqueKills,
            0,
          ),
          totalMemberParticipations,
        },
        killers,
      };
    });
  }

  getMemberKills(
    guildId: string,
    memberId: number,
    permissions: Permission[],
    roles: Role[],
    query: GetMemberKillsDto,
  ) {
    const filteredRoles = this.filterReadableRoles(roles);
    const administrativeUser = isAdministrativeUser(permissions);

    const npcTypes = query.npcTypes;
    const limit = query.limit ?? 20;
    const cursor = query.cursor ?? 0;
    const periodStart = getKillStatsPeriodStart(query.period);

    const cacheKey = this.buildKillStatsCacheKey("member-kills", guildId, {
      memberId,
      query,
      visibility: this.buildVisibilityCacheScope(
        administrativeUser,
        filteredRoles,
      ),
    });

    return this.getCachedKillStats(cacheKey, "member kills", async () => {
      const member = await this.prisma.db.orm.public.Member.where((row) =>
        and(row.id.eq(memberId), row.guildId.eq(guildId)),
      ).first();

      if (!member) {
        return null;
      }

      const stats = await this.applyKillStatsFilters(
        periodStart
          ? this.prisma.db.orm.public.NpcKillStatsBucket
          : this.prisma.db.orm.public.NpcKillStats,
        guildId,
        {
          memberId,
          npcTypes,
          world: query.world,
          search: query.search,
          minLvl: query.minLvl,
          maxLvl: query.maxLvl,
        },
        filteredRoles,
        administrativeUser,
        periodStart ?? undefined,
      ).all();

      const participationsByType: Record<string, number> = {};
      let totalParticipations = 0;

      const npcMap = new Map<
        number,
        {
          npcId: number;
          npcName: string;
          npcType: string;
          npcLvl: number;
          npcProf: string | null;
          npcIcon: string | null;
          totalKills: number;
        }
      >();

      for (const stat of stats) {
        participationsByType[stat.npcType] =
          (participationsByType[stat.npcType] ?? 0) + stat.memberKills;
        totalParticipations += stat.memberKills;

        const existing = npcMap.get(stat.npcId);
        if (existing) {
          existing.totalKills += stat.memberKills;
          if (stat.npcLvl > existing.npcLvl) {
            existing.npcLvl = stat.npcLvl;
            existing.npcName = stat.npcName;
            existing.npcProf = stat.npcProf;
            existing.npcIcon = stat.npcIcon;
          }
        } else {
          npcMap.set(stat.npcId, {
            npcId: stat.npcId,
            npcName: stat.npcName,
            npcType: stat.npcType,
            npcLvl: stat.npcLvl,
            npcProf: stat.npcProf,
            npcIcon: stat.npcIcon,
            totalKills: stat.memberKills,
          });
        }
      }

      const allNpcs = Array.from(npcMap.values()).sort(
        (a, b) => b.totalKills - a.totalKills,
      );

      const total = allNpcs.length;
      const paginatedNpcs = allNpcs.slice(cursor, cursor + limit);
      const hasNext = cursor + limit < total;

      return {
        member: {
          memberId: member.id,
          memberName: member.name,
          memberAvatar: member.avatar,
          memberUserId: member.userId,
        },
        overview: {
          totalParticipations,
          participationsByType,
        },
        npcs: paginatedNpcs,
        pagination: {
          total,
          cursor,
          limit,
          hasNext,
        },
      };
    });
  }
}
