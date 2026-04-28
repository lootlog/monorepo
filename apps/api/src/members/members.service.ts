import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { PrismaService } from "src/db/prisma.service";
import {
  getAdminBulkRefreshRateLimit,
  getMemberCacheSoftTtl,
  getRefreshPermissionsTtl,
} from "src/members/constants/member-cache.constant";
import type { APIGuildMember } from "discord-api-types/v10";
import { ErrorKey } from "src/members/enum/error-key.enum";
import { ErrorKey as GuildErrorKey } from "src/guilds/enum/error-key.enum";
import {
  Permission,
  type Member,
  type MemberRefreshJob,
  type PlayerSnapshot,
  type Prisma,
  type Role,
} from "src/generated/prisma/client";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { serviceConfig } from "src/config/service.config";
import { RuntimeEnvironment } from "src/types/runtime.types";
import { DiscordService } from "src/discord/discord.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  getPermissionsCacheKey,
  getUserLootlogConfigCachePattern,
} from "src/shared/constants/cache.constant";
import { DiscordRateLimiterService } from "src/discord/discord-rate-limiter.service";
import { MEMBER_REFRESH_PRIORITY } from "./constants/member-refresh-queue.constant";
import {
  MemberRefreshSchedulerService,
  type MemberRefreshScheduleResult,
} from "./member-refresh-scheduler.service";

type MemberWithRoles = Member & {
  roles: Role[];
  isStale?: boolean;
  staleWarning?: string;
  refreshQueued?: boolean;
  nextRefreshAt?: Date | null;
};

type MemberSyncStatus =
  | "SUCCESS"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "AUTH_SERVICE_UNAVAILABLE"
  | "DISCORD_SERVICE_UNAVAILABLE"
  | `DISCORD_HTTP_${number}`
  | "ERROR";

type MemberSyncResult = {
  member: MemberWithRoles | null;
  status: MemberSyncStatus;
  error?: unknown;
  nextRefreshAt: Date | null;
};

type MemberRefreshAttempt = {
  member: MemberWithRoles | null;
  status: MemberSyncStatus | "QUEUED";
  error?: unknown;
  refreshQueued: boolean;
  nextRefreshAt: Date | null;
};

type StoredMemberWithRoles = Member & {
  roles: Role[];
};

type MemberSummary = {
  id: number;
  userId: string;
  name: string;
  avatar: string | null;
  color: number | null;
};

type MemberLootlogConfigCharacterSummary = {
  accountId: string;
  characterId: string;
  enabledForGuild: boolean;
  characterName: string | null;
  world: string | null;
  icon: string | null;
  metadataStatus: "resolved" | "missing_snapshot" | "invalid_character_ref";
};

type MemberLootlogConfigSummary = {
  memberUserId: string;
  guildId: string;
  isActive: boolean;
  configuredCharacterCount: number;
  enabledCharacterCount: number;
  characters: MemberLootlogConfigCharacterSummary[];
};

type MemberRemovalNotificationTarget = {
  discordId: string;
  guildId: string;
  globalUserId: string | null;
};

type RefreshJobWithCooldown = MemberRefreshJob & {
  nextAvailableAt: Date;
};

type DeleteMembersByGuildIdResult = {
  count: number;
  affectedMembers: MemberRemovalNotificationTarget[];
};

@Injectable()
export class MembersService {
  private readonly env: RuntimeEnvironment;
  private readonly MEMBER_RATE_LIMIT_ENDPOINT = "guild-member";
  private readonly staleAccessGraceMs = 6 * 60 * 60 * 1000;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly memberRefreshScheduler: MemberRefreshSchedulerService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
  ) {
    this.env = serviceConfig.env;
  }

  async getGuildMemberById(options: {
    discordId: string;
    guildId: string;
    userId: string;
    refresh?: boolean;
    standalone?: boolean;
    skipTtlCheck?: boolean;
    returnDeactivatedMember?: boolean;
    throwOnMemberUnauthorized?: boolean;
  }): Promise<MemberWithRoles | null> {
    const {
      discordId,
      guildId,
      userId,
      refresh = false,
      standalone = false,
      skipTtlCheck = false,
      returnDeactivatedMember = false,
      throwOnMemberUnauthorized = true,
    } = options;

    let desiredGuildId = guildId;
    if (refresh || standalone) {
      const guild = await this.prisma.guild.findFirst({
        where: {
          active: true,
          OR: [{ id: guildId }, { vanityUrl: guildId }],
        },
        select: {
          id: true,
        },
      });
      if (!guild) {
        throw new NotFoundException({
          message: GuildErrorKey.GUILD_NOT_FOUND,
        });
      }
      desiredGuildId = guild.id;
    }

    const now = new Date();
    const cacheTtl = refresh
      ? getRefreshPermissionsTtl(this.env)
      : getMemberCacheSoftTtl(this.env);
    const cacheExpiry = new Date(now.getTime() - cacheTtl);

    const storedMember = await this.getStoredMember(discordId, desiredGuildId);
    const hasFreshMember =
      storedMember !== null &&
      !skipTtlCheck &&
      this.isMemberFresh(storedMember, cacheExpiry);

    if (storedMember && refresh && hasFreshMember) {
      throw new BadRequestException(ErrorKey.MEMBER_TTL_ACTIVE);
    }

    if (hasFreshMember) {
      return this.decorateMember(storedMember);
    }

    const refreshAttempt = await this.refreshGuildMemberWithinBudget({
      discordId,
      guildId: desiredGuildId,
      userId,
      priority: refresh
        ? MEMBER_REFRESH_PRIORITY.MANUAL
        : MEMBER_REFRESH_PRIORITY.BACKGROUND,
      reason: refresh ? "manual-refresh" : "member-read",
      throwOnUnexpectedError: refresh,
    });

    if (refreshAttempt.status === "UNAUTHORIZED" && throwOnMemberUnauthorized) {
      this.throwMemberSyncError(refreshAttempt);
    }

    if (refreshAttempt.member) {
      return refreshAttempt.member.active || returnDeactivatedMember
        ? refreshAttempt.member
        : null;
    }

    if (refreshAttempt.status === "NOT_FOUND") {
      return null;
    }

    // Rate limits and transient Discord errors are not proof that access was
    // removed. The grace window prevents those failures from preserving access
    // indefinitely.
    if (storedMember?.active && this.canUseStaleMember(storedMember, now)) {
      return this.decorateMember(storedMember, {
        isStale: true,
        staleWarning: refreshAttempt.refreshQueued
          ? "Using cached data while a Discord refresh is queued"
          : "Using cached data due to Discord API rate limiting or errors",
        refreshQueued: refreshAttempt.refreshQueued,
        nextRefreshAt: refreshAttempt.nextRefreshAt,
      });
    }

    return null;
  }

  async refreshGuildMemberWithinBudget(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberRefreshAttempt> {
    const {
      discordId,
      guildId,
      userId,
      priority,
      reason,
      throwOnUnexpectedError = false,
    } = options;

    const lockOwner = `request:${guildId}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2)}`;

    const nextRefreshAt = await this.rateLimiter.getNextAvailableAtForUser(
      userId,
      this.MEMBER_RATE_LIMIT_ENDPOINT,
    );

    if (
      (nextRefreshAt && nextRefreshAt.getTime() > Date.now()) ||
      (await this.memberRefreshScheduler.isUserRefreshLocked(userId))
    ) {
      const scheduledRefresh = await this.queueMemberRefresh({
        discordId,
        guildId,
        userId,
        priority,
        reason,
      });
      return {
        member: null,
        status: nextRefreshAt ? "RATE_LIMITED" : "QUEUED",
        refreshQueued: scheduledRefresh.queued,
        nextRefreshAt:
          scheduledRefresh.nextRefreshAt ?? nextRefreshAt ?? new Date(),
      };
    }

    const acquiredLock =
      await this.memberRefreshScheduler.acquireUserRefreshLock(
        userId,
        lockOwner,
      );

    if (!acquiredLock) {
      const scheduledRefresh = await this.queueMemberRefresh({
        discordId,
        guildId,
        userId,
        priority,
        reason,
      });
      return {
        member: null,
        status: "QUEUED",
        refreshQueued: scheduledRefresh.queued,
        nextRefreshAt: scheduledRefresh.nextRefreshAt,
      };
    }

    try {
      const blockedUntil = await this.rateLimiter.getNextAvailableAtForUser(
        userId,
        this.MEMBER_RATE_LIMIT_ENDPOINT,
      );
      if (blockedUntil && blockedUntil.getTime() > Date.now()) {
        const scheduledRefresh = await this.queueMemberRefresh({
          discordId,
          guildId,
          userId,
          priority,
          reason,
        });
        return {
          member: null,
          status: "RATE_LIMITED",
          refreshQueued: scheduledRefresh.queued,
          nextRefreshAt: scheduledRefresh.nextRefreshAt ?? blockedUntil,
        };
      }

      const syncResult = await this.syncMemberFromDiscord({
        discordId,
        guildId,
        userId,
        throwOnUnexpectedError,
      });

      if (syncResult.status === "RATE_LIMITED") {
        const scheduledRefresh = await this.queueMemberRefresh({
          discordId,
          guildId,
          userId,
          priority,
          reason,
        });

        return {
          ...syncResult,
          refreshQueued: scheduledRefresh.queued,
          nextRefreshAt:
            scheduledRefresh.nextRefreshAt ?? syncResult.nextRefreshAt,
        };
      }

      return {
        ...syncResult,
        refreshQueued: false,
      };
    } finally {
      await this.memberRefreshScheduler.releaseUserRefreshLock(
        userId,
        lockOwner,
      );
    }
  }

  queueMemberRefresh(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
  }): Promise<MemberRefreshScheduleResult> {
    return this.memberRefreshScheduler.enqueueRefresh(options);
  }

  private queueMemberRefreshInBackground(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
  }) {
    void this.queueMemberRefresh(options).catch((error) => {
      this.logger.log({
        level: "warn",
        message: "Failed to queue background member refresh",
        guildId: options.guildId,
        userId: options.userId,
        error,
      });
    });
  }

  async syncMemberFromDiscord(options: {
    discordId: string;
    guildId: string;
    userId: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberSyncResult> {
    const {
      discordId,
      guildId,
      userId,
      throwOnUnexpectedError = false,
    } = options;

    try {
      const discordMember = await this.discordService.getGuildMember({
        guildId,
        userId,
        discordId,
      });

      if (!discordMember) {
        await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: "ERROR",
        });

        this.logger.log({
          level: "warn",
          message:
            "Discord API returned null while refreshing member, keeping cached state",
          guildId,
          userId: discordId,
        });

        return {
          member: null,
          status: "ERROR",
          nextRefreshAt: null,
        };
      }

      const member = await this.createOrUpdateMember({
        ...discordMember,
        guildId,
        globalUserId: userId,
      });

      return {
        member,
        status: "SUCCESS",
        nextRefreshAt: null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        const member = await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: "NOT_FOUND",
          deactivate: true,
          markSynced: true,
        });
        return {
          member,
          status: "NOT_FOUND",
          error,
          nextRefreshAt: null,
        };
      }

      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.UNAUTHORIZED
      ) {
        this.logger.log({
          level: "warn",
          message:
            "User authentication failed (token expired/invalid), deactivating member",
          guildId,
          userId: discordId,
        });

        const member = await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: "UNAUTHORIZED",
          deactivate: true,
        });
        return {
          member,
          status: "UNAUTHORIZED",
          error,
          nextRefreshAt: null,
        };
      }

      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        const nextRefreshAt = await this.rateLimiter.getNextAvailableAtForUser(
          userId,
          this.MEMBER_RATE_LIMIT_ENDPOINT,
        );

        await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: "RATE_LIMITED",
        });

        this.logger.log({
          level: "warn",
          message: "Discord rate limited member refresh, keeping cached state",
          guildId,
          userId,
          nextRefreshAt,
        });

        return {
          member: null,
          status: "RATE_LIMITED",
          error,
          nextRefreshAt,
        };
      }

      const transientStatus = this.getTransientSyncStatus(error);
      if (transientStatus === "AUTH_SERVICE_UNAVAILABLE") {
        this.logger.log({
          level: "warn",
          message: "Auth service unavailable, keeping cached member state",
          guildId,
          userId,
        });
      } else {
        this.logger.log({
          level: "error",
          message: "Failed to fetch member from Discord",
          guildId,
          userId: discordId,
          status: transientStatus,
          stack: (error as Error).stack,
        });
      }

      await this.markMemberSyncAttempt({
        discordId,
        guildId,
        status: transientStatus,
      });

      if (throwOnUnexpectedError) {
        throw error;
      }

      return {
        member: null,
        status: transientStatus,
        error,
        nextRefreshAt: null,
      };
    }
  }

  async refreshMember(options: {
    discordId: string;
    guildId: string;
    skipTtlCheck?: boolean;
  }) {
    const member = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: options.discordId, guildId: options.guildId },
      },
    });

    if (!member || !member.globalUserId) {
      throw new NotFoundException(
        "Member not found or global user ID is missing",
      );
    }

    return this.getGuildMemberById({
      discordId: options.discordId,
      guildId: options.guildId,
      userId: member.globalUserId,
      refresh: true,
      standalone: true,
      skipTtlCheck: options.skipTtlCheck,
      returnDeactivatedMember: true,
      throwOnMemberUnauthorized: false,
    });
  }

  getGuildMembers(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberWithRoles[]> {
    return this.prisma.member.findMany({
      where: {
        guildId,
        ...(includeInactive ? {} : { active: true }),
        globalUserId: { not: null },
      },
      include: {
        roles: {
          orderBy: { position: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async getGuildMembersSummary(guildId: string): Promise<MemberSummary[]> {
    const guild = await this.prisma.guild.findFirst({
      where: {
        id: guildId,
        active: true,
      },
      select: {
        ownerId: true,
      },
    });

    if (!guild) {
      return [];
    }

    const members = await this.prisma.member.findMany({
      where: {
        guildId,
        active: true,
        globalUserId: { not: null },
        OR: [
          {
            userId: guild.ownerId,
          },
          {
            roles: {
              some: {
                permissions: {
                  hasSome: [
                    Permission.OWNER,
                    Permission.ADMIN,
                    Permission.LOOTLOG_ACCESS,
                  ],
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        userId: true,
        name: true,
        avatar: true,
        roles: {
          select: {
            color: true,
          },
          orderBy: {
            position: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return members.map(({ roles, ...member }) => ({
      ...member,
      color: roles[0]?.color ?? null,
    }));
  }

  async getMemberLootlogConfigSummary(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberLootlogConfigSummary> {
    const { discordId, guildId } = options;
    const member = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId },
      },
      select: {
        userId: true,
        active: true,
      },
    });

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    const configs = await this.prisma.userCharactersLootlogSettings.findMany({
      where: {
        userId: discordId,
      },
      orderBy: [{ accountId: "asc" }, { characterId: "asc" }],
    });

    const validCharacterRefs = this.getValidLootlogCharacterRefs(configs);
    const latestSnapshotsByCharacterKey =
      await this.getLatestPlayerSnapshots(validCharacterRefs);

    const characters = configs.map((config) => {
      const enabledForGuild = config.catchingGuildIds.includes(guildId);
      const parsedRef = this.parseLootlogCharacterRef(
        config.accountId,
        config.characterId,
      );

      if (!parsedRef) {
        return {
          accountId: config.accountId,
          characterId: config.characterId,
          enabledForGuild,
          characterName: null,
          world: null,
          icon: null,
          metadataStatus: "invalid_character_ref",
        } satisfies MemberLootlogConfigCharacterSummary;
      }

      const snapshot = latestSnapshotsByCharacterKey.get(
        this.createPlayerSnapshotKey(
          parsedRef.accountId,
          parsedRef.characterId,
        ),
      );

      if (!snapshot) {
        return {
          accountId: config.accountId,
          characterId: config.characterId,
          enabledForGuild,
          characterName: null,
          world: null,
          icon: null,
          metadataStatus: "missing_snapshot",
        } satisfies MemberLootlogConfigCharacterSummary;
      }

      return {
        accountId: config.accountId,
        characterId: config.characterId,
        enabledForGuild,
        characterName: snapshot.name,
        world: snapshot.world,
        icon: snapshot.icon,
        metadataStatus: "resolved",
      } satisfies MemberLootlogConfigCharacterSummary;
    });

    return {
      memberUserId: member.userId,
      guildId,
      isActive: member.active,
      configuredCharacterCount: characters.length,
      enabledCharacterCount: characters.filter(
        (character) => character.enabledForGuild,
      ).length,
      characters,
    };
  }

  isMemberSoftStale(
    member: Pick<Member, "lastDiscordSyncAt" | "updatedAt"> | null | undefined,
  ): boolean {
    if (!member) {
      return true;
    }

    const lastSyncAt = this.getLastDiscordSyncAt(member);
    if (!lastSyncAt) {
      return true;
    }

    return lastSyncAt.getTime() < this.getMemberSoftStaleThreshold().getTime();
  }

  getMemberSoftStaleThreshold(referenceTime: number | Date = Date.now()): Date {
    const baseTime =
      referenceTime instanceof Date ? referenceTime.getTime() : referenceTime;

    return new Date(baseTime - getMemberCacheSoftTtl(this.env));
  }

  async createOrUpdateMember({
    guildId,
    avatar,
    nick,
    banner,
    roles: roleIds,
    user,
    globalUserId,
  }: APIGuildMember & {
    guildId: string;
    globalUserId: string;
  }): Promise<MemberWithRoles> {
    const { id } = user;
    const syncTimestamp = new Date();

    try {
      const existingRoleIds =
        roleIds.length > 0
          ? (
              await this.prisma.role.findMany({
                where: { id: { in: roleIds } },
                select: { id: true },
              })
            ).map((role) => role.id)
          : [];

      const memberName = nick ?? user.global_name ?? user.username;
      const memberAvatar = avatar ?? user.avatar;

      const member = await this.prisma.member.upsert({
        where: { memberId: { userId: id, guildId } },
        update: {
          avatar: memberAvatar,
          banner,
          name: memberName,
          active: true,
          globalUserId,
          lastDiscordAttemptAt: syncTimestamp,
          lastDiscordSyncAt: syncTimestamp,
          lastDiscordStatus: "SUCCESS",
          roles: { set: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        create: {
          userId: id,
          guild: { connect: { id: guildId } },
          avatar: memberAvatar,
          active: true,
          name: memberName,
          globalUserId,
          banner,
          lastDiscordAttemptAt: syncTimestamp,
          lastDiscordSyncAt: syncTimestamp,
          lastDiscordStatus: "SUCCESS",
          roles: { connect: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        include: { roles: true },
      });

      await Promise.all([
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_MEMBERS_UPDATE,
          {
            id: id,
            discordId: id,
            userId: globalUserId,
            guildId,
          },
        ),
        this.redisService.del(getPermissionsCacheKey(globalUserId, guildId)),
        this.redisService.deleteByPattern(getUserLootlogConfigCachePattern(id)),
      ]);

      return member;
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to create/update member ${id}`,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  async deactivateMember(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberWithRoles> {
    const { discordId, guildId } = options;

    const member = await this.prisma.member.findUnique({
      where: { memberId: { userId: discordId, guildId } },
      include: { roles: true },
    });

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    if (!member.active) {
      throw new BadRequestException(ErrorKey.MEMBER_ALREADY_DEACTIVATED);
    }

    const deactivatedMember = await this.prisma.member.update({
      where: { memberId: { userId: discordId, guildId } },
      data: {
        active: false,
        lastDiscordAttemptAt: new Date(),
        lastDiscordStatus: "MANUALLY_DEACTIVATED",
        roles: { set: [] },
      },
      include: { roles: true },
    });

    await this.notifyMemberRemoved({
      discordId,
      guildId,
      globalUserId: member.globalUserId,
    });

    return deactivatedMember;
  }

  async deactivateMembersMissingFromDiscordGuilds(options: {
    discordId: string;
    userId: string;
    activeDiscordGuildIds: string[];
    status: string;
  }): Promise<number> {
    const { discordId, userId, activeDiscordGuildIds, status } = options;
    const missingMembers = await this.prisma.member.findMany({
      where: {
        userId: discordId,
        globalUserId: userId,
        active: true,
        guildId: { notIn: activeDiscordGuildIds },
        guild: { active: true },
      },
      select: {
        userId: true,
        guildId: true,
        globalUserId: true,
      },
    });

    if (missingMembers.length === 0) {
      return 0;
    }

    const syncTimestamp = new Date();
    await Promise.all(
      missingMembers.map((member) =>
        this.prisma.member.update({
          where: {
            memberId: { userId: member.userId, guildId: member.guildId },
          },
          data: {
            active: false,
            lastDiscordAttemptAt: syncTimestamp,
            lastDiscordSyncAt: syncTimestamp,
            lastDiscordStatus: status,
            roles: { set: [] },
          },
        }),
      ),
    );

    await this.notifyMembersRemoved(
      missingMembers.map((member) => ({
        discordId: member.userId,
        guildId: member.guildId,
        globalUserId: member.globalUserId,
      })),
    );

    return missingMembers.length;
  }

  async deleteMembersByGuildId(
    guildId: string,
    options?: {
      tx?: Prisma.TransactionClient;
    },
  ): Promise<DeleteMembersByGuildIdResult> {
    const client = options?.tx ?? this.prisma;

    try {
      const affectedMembers = await client.member.findMany({
        where: {
          guildId,
          active: true,
        },
        select: {
          userId: true,
          guildId: true,
          globalUserId: true,
        },
      });

      const result = await client.member.updateMany({
        where: {
          guildId,
          active: true,
        },
        data: {
          active: false,
          lastDiscordAttemptAt: new Date(),
          lastDiscordStatus: "GUILD_DEACTIVATED",
        },
      });

      this.logger.log({
        level: "info",
        message: `Deactivated ${result.count} members from guild ${guildId}`,
      });
      return {
        count: result.count,
        affectedMembers: affectedMembers.map((member) => ({
          discordId: member.userId,
          guildId: member.guildId,
          globalUserId: member.globalUserId,
        })),
      };
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to deactivate members for guild ${guildId}`,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  async notifyMembersRemoved(
    members: MemberRemovalNotificationTarget[],
    batchSize = 25,
  ): Promise<void> {
    const notifyBatch = async (index: number): Promise<void> => {
      if (index >= members.length) {
        return;
      }

      const batch = members.slice(index, index + batchSize);
      await Promise.all(
        batch.map((member) => this.notifyMemberRemoved(member)),
      );

      await notifyBatch(index + batchSize);
    };

    await notifyBatch(0);
  }

  async createBulkRefreshJob(guildId: string, requestedBy: string) {
    const rateLimit = getAdminBulkRefreshRateLimit(this.env);
    const recentJob = await this.prisma.memberRefreshJob.findFirst({
      where: {
        guildId,
        createdAt: {
          gte: new Date(Date.now() - rateLimit),
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentJob) {
      throw new BadRequestException({
        message: ErrorKey.BULK_REFRESH_RATE_LIMIT_ACTIVE,
        nextAvailableAt: new Date(recentJob.createdAt.getTime() + rateLimit),
      });
    }

    const members = await this.getGuildMembers(guildId);

    const job = await this.prisma.memberRefreshJob.create({
      data: {
        guildId,
        requestedBy,
        status: "PENDING",
        totalMembers: members.length,
      },
    });

    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_MEMBERS_BULK_REFRESH,
      {
        jobId: job.id,
        guildId,
        memberIds: members.map((m) => m.userId),
      },
    );

    return this.withRefreshJobCooldown(job);
  }

  async getLatestRefreshJob(
    guildId: string,
  ): Promise<RefreshJobWithCooldown | null> {
    const job = await this.prisma.memberRefreshJob.findFirst({
      where: { guildId },
      orderBy: { createdAt: "desc" },
    });

    return job ? this.withRefreshJobCooldown(job) : null;
  }

  async getRefreshJobStatus(jobId: number) {
    const job = await this.prisma.memberRefreshJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException({
        message: ErrorKey.REFRESH_JOB_NOT_FOUND,
      });
    }

    return this.withRefreshJobCooldown(job);
  }

  private withRefreshJobCooldown(
    job: MemberRefreshJob,
  ): RefreshJobWithCooldown {
    return {
      ...job,
      nextAvailableAt: new Date(
        job.createdAt.getTime() + getAdminBulkRefreshRateLimit(this.env),
      ),
    };
  }

  private getStoredMember(
    discordId: string,
    guildId: string,
  ): Promise<StoredMemberWithRoles | null> {
    return this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId },
      },
      include: { roles: true },
    });
  }

  private decorateMember(
    member: StoredMemberWithRoles,
    options: {
      isStale?: boolean;
      staleWarning?: string;
      refreshQueued?: boolean;
      nextRefreshAt?: Date | null;
    } = {},
  ): MemberWithRoles {
    return {
      ...member,
      ...options,
    };
  }

  private async getLatestPlayerSnapshots(
    characterRefs: Array<{ accountId: number; characterId: number }>,
  ): Promise<
    Map<
      string,
      Pick<
        PlayerSnapshot,
        "accountId" | "characterId" | "name" | "world" | "icon"
      >
    >
  > {
    if (characterRefs.length === 0) {
      return new Map();
    }

    const snapshots = await this.prisma.playerSnapshot.findMany({
      where: {
        OR: characterRefs.map(({ accountId, characterId }) => ({
          accountId,
          characterId,
        })),
      },
      select: {
        accountId: true,
        characterId: true,
        name: true,
        world: true,
        icon: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return snapshots.reduce<
      Map<
        string,
        Pick<
          PlayerSnapshot,
          "accountId" | "characterId" | "name" | "world" | "icon"
        >
      >
    >((result, snapshot) => {
      const key = this.createPlayerSnapshotKey(
        snapshot.accountId,
        snapshot.characterId,
      );

      if (!result.has(key)) {
        result.set(key, snapshot);
      }

      return result;
    }, new Map());
  }

  private getValidLootlogCharacterRefs(
    configs: Array<{ accountId: string; characterId: string }>,
  ): Array<{ accountId: number; characterId: number }> {
    return [
      ...new Map(
        configs
          .map((config) =>
            this.parseLootlogCharacterRef(config.accountId, config.characterId),
          )
          .filter(
            (
              characterRef,
            ): characterRef is {
              accountId: number;
              characterId: number;
            } => characterRef !== null,
          )
          .map((characterRef) => [
            this.createPlayerSnapshotKey(
              characterRef.accountId,
              characterRef.characterId,
            ),
            characterRef,
          ]),
      ).values(),
    ];
  }

  private parseLootlogCharacterRef(
    accountId: string,
    characterId: string,
  ): { accountId: number; characterId: number } | null {
    const parsedAccountId = Number(accountId);
    const parsedCharacterId = Number(characterId);

    if (
      !Number.isInteger(parsedAccountId) ||
      !Number.isInteger(parsedCharacterId) ||
      parsedAccountId <= 0 ||
      parsedCharacterId <= 0
    ) {
      return null;
    }

    return {
      accountId: parsedAccountId,
      characterId: parsedCharacterId,
    };
  }

  private createPlayerSnapshotKey(accountId: number, characterId: number) {
    return `${accountId}:${characterId}`;
  }

  private getLastDiscordSyncAt(
    member: Pick<Member, "lastDiscordSyncAt">,
  ): Date | null {
    return member.lastDiscordSyncAt ?? null;
  }

  private isMemberFresh(
    member: Pick<Member, "active" | "lastDiscordSyncAt" | "updatedAt">,
    cacheExpiry: Date,
  ): boolean {
    const lastSyncAt = this.getLastDiscordSyncAt(member);
    return Boolean(
      member.active &&
      lastSyncAt !== null &&
      lastSyncAt.getTime() >= cacheExpiry.getTime(),
    );
  }

  private canUseStaleMember(
    member: Pick<Member, "lastDiscordSyncAt">,
    now = new Date(),
  ): boolean {
    const lastSyncAt = member.lastDiscordSyncAt;

    return Boolean(
      lastSyncAt &&
      now.getTime() - lastSyncAt.getTime() <= this.staleAccessGraceMs,
    );
  }

  private throwMemberSyncError(attempt: Pick<MemberRefreshAttempt, "error">) {
    if (attempt.error instanceof Error) {
      throw attempt.error;
    }

    throw new HttpException("Discord member sync failed", HttpStatus.CONFLICT);
  }

  private getTransientSyncStatus(error: unknown): MemberSyncStatus {
    if (error instanceof ServiceUnavailableException) {
      const messageCode = this.getHttpExceptionMessageCode(error);
      return messageCode === "AUTH_SERVICE_UNAVAILABLE"
        ? "AUTH_SERVICE_UNAVAILABLE"
        : "DISCORD_SERVICE_UNAVAILABLE";
    }

    if (error instanceof HttpException) {
      return `DISCORD_HTTP_${error.getStatus()}`;
    }

    return "ERROR";
  }

  private getHttpExceptionMessageCode(error: HttpException): string | null {
    const response = error.getResponse();

    if (typeof response === "string") {
      return response;
    }

    if (
      typeof response === "object" &&
      response !== null &&
      "message" in response &&
      typeof response.message === "string"
    ) {
      return response.message;
    }

    return null;
  }

  private async markMemberSyncAttempt(options: {
    discordId: string;
    guildId: string;
    status: string;
    deactivate?: boolean;
    markSynced?: boolean;
  }): Promise<MemberWithRoles | null> {
    const {
      discordId,
      guildId,
      status,
      deactivate = false,
      markSynced = false,
    } = options;
    const existingMember = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId },
      },
    });

    if (!existingMember) {
      return null;
    }

    const attemptTimestamp = new Date();
    const member = await this.prisma.member.update({
      where: {
        memberId: { userId: discordId, guildId },
      },
      data: {
        lastDiscordAttemptAt: attemptTimestamp,
        lastDiscordStatus: status,
        ...(markSynced ? { lastDiscordSyncAt: attemptTimestamp } : {}),
        ...(deactivate
          ? {
              active: false,
              roles: { set: [] },
            }
          : {}),
      },
      include: { roles: true },
    });

    if (deactivate && existingMember.active) {
      await this.notifyMemberRemoved({
        discordId,
        guildId,
        globalUserId: existingMember.globalUserId,
      });
    }

    return member;
  }

  private async notifyMemberRemoved(
    member: MemberRemovalNotificationTarget,
  ): Promise<void> {
    const operations: Promise<unknown>[] = [
      this.redisService.deleteByPattern(
        getUserLootlogConfigCachePattern(member.discordId),
      ),
    ];

    if (member.globalUserId) {
      operations.push(
        this.discordService.clearGuildMemberDataCache({
          guildId: member.guildId,
          userId: member.globalUserId,
        }),
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_MEMBERS_REMOVE,
          {
            id: member.discordId,
            discordId: member.discordId,
            userId: member.globalUserId,
            guildId: member.guildId,
          },
        ),
        this.redisService.del(
          getPermissionsCacheKey(member.globalUserId, member.guildId),
        ),
      );
    }

    await Promise.all(operations);
  }
}
