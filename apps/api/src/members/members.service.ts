import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RedisService } from "@lootlog/nest-shared/redis";
import type { APIGuildMember } from "discord-api-types/v10";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { serviceConfig } from "src/config/service.config";
import { PrismaService } from "src/db/prisma.service";
import { RoutingKey } from "src/enum/routing-key.enum";
import {
  Permission,
  type Member,
  type MemberRefreshJob,
  type PlayerSnapshot,
} from "src/generated/prisma/client";
import { RuntimeEnvironment } from "src/types/runtime.types";
import { getAdminBulkRefreshRateLimit } from "./constants/member-cache.constant";
import { ErrorKey } from "./enum/error-key.enum";
import { MemberDiscordAccessService } from "./member-discord-access.service";
import { MemberDiscordRefreshService } from "./member-discord-refresh.service";
import { MemberDiscordSyncService } from "./member-discord-sync.service";
import type { MemberRefreshScheduleResult } from "./member-refresh-scheduler.service";
import { MemberRemovalService } from "./member-removal.service";
import type {
  DeleteMembersByGuildIdOptions,
  DeleteMembersByGuildIdResult,
  MemberRefreshAttempt,
  MemberRemovalNotificationTarget,
  MemberSyncResult,
  MemberWithRoles,
} from "./member.types";

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

type RefreshJobWithCooldown = MemberRefreshJob & {
  nextAvailableAt: Date;
};

@Injectable()
export class MembersService {
  private readonly env: RuntimeEnvironment;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
    private readonly memberDiscordAccessService: MemberDiscordAccessService,
    private readonly memberDiscordRefreshService: MemberDiscordRefreshService,
    private readonly memberDiscordSyncService: MemberDiscordSyncService,
    private readonly memberRemovalService: MemberRemovalService,
  ) {
    this.env = serviceConfig.env;
  }

  getGuildMemberById(options: {
    discordId: string;
    guildId: string;
    userId: string;
    refresh?: boolean;
    standalone?: boolean;
    skipTtlCheck?: boolean;
    returnDeactivatedMember?: boolean;
    throwOnMemberUnauthorized?: boolean;
  }): Promise<MemberWithRoles | null> {
    return this.memberDiscordAccessService.getGuildMemberById(options);
  }

  refreshGuildMemberWithinBudget(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberRefreshAttempt> {
    return this.memberDiscordRefreshService.refreshGuildMemberWithinBudget(
      options,
    );
  }

  queueMemberRefresh(options: {
    discordId: string;
    guildId: string;
    userId: string;
    priority: number;
    reason: string;
  }): Promise<MemberRefreshScheduleResult> {
    return this.memberDiscordRefreshService.queueMemberRefresh(options);
  }

  syncMemberFromDiscord(options: {
    discordId: string;
    guildId: string;
    userId: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberSyncResult> {
    return this.memberDiscordSyncService.syncMemberFromDiscord(options);
  }

  refreshMember(options: {
    discordId: string;
    guildId: string;
    skipTtlCheck?: boolean;
  }): Promise<MemberWithRoles | null> {
    return this.memberDiscordAccessService.refreshMember(options);
  }

  isMemberSoftStale(
    member: Pick<Member, "lastDiscordSyncAt" | "updatedAt"> | null | undefined,
  ): boolean {
    return this.memberDiscordAccessService.isMemberSoftStale(member);
  }

  getMemberSoftStaleThreshold(referenceTime?: number | Date): Date {
    return this.memberDiscordAccessService.getMemberSoftStaleThreshold(
      referenceTime,
    );
  }

  createOrUpdateMember(
    member: APIGuildMember & {
      guildId: string;
      globalUserId: string;
    },
  ): Promise<MemberWithRoles> {
    return this.memberDiscordSyncService.createOrUpdateMember(member);
  }

  deactivateMember(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberWithRoles> {
    return this.memberRemovalService.deactivateMember(options);
  }

  deactivateMembersMissingFromDiscordGuilds(options: {
    discordId: string;
    userId: string;
    activeDiscordGuildIds: string[];
    status: string;
  }): Promise<number> {
    return this.memberRemovalService.deactivateMembersMissingFromDiscordGuilds(
      options,
    );
  }

  deleteMembersByGuildId(
    guildId: string,
    options?: DeleteMembersByGuildIdOptions,
  ): Promise<DeleteMembersByGuildIdResult> {
    return this.memberRemovalService.deleteMembersByGuildId(guildId, options);
  }

  notifyMembersRemoved(
    members: MemberRemovalNotificationTarget[],
    batchSize?: number,
  ): Promise<void> {
    return this.memberRemovalService.notifyMembersRemoved(members, batchSize);
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
        memberIds: members.map((member) => member.userId),
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
}
