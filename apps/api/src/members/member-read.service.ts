import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { PrismaService } from "src/db/prisma.service";
import { Permission, type PlayerSnapshot } from "src/db/domain";
import {
  getGuildMemberReferencesCacheKey,
  getGuildMembersSummaryCacheKey,
  getMemberLootlogConfigSummaryCacheKey,
} from "src/shared/constants/cache.constant";
import type {
  MemberLootlogConfigCharacterSummary,
  MemberLootlogConfigSummary,
  MemberReference,
  MemberSummary,
  MemberWithRoles,
} from "./member.types";

const MEMBER_READ_CACHE_TTL_SECONDS = 30;
const MEMBER_LOOTLOG_CONFIG_SUMMARY_CACHE_TTL_SECONDS = 60;

@Injectable()
export class MemberReadService {
  private readonly logger = new Logger(MemberReadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  getGuildMembers(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberWithRoles[]> {
    return this.prisma.orm.public.Member.findMany({
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

  getGuildMemberReferences(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberReference[]> {
    return this.getCachedMemberRead(
      getGuildMemberReferencesCacheKey(guildId, includeInactive),
      MEMBER_READ_CACHE_TTL_SECONDS,
      "guild member references",
      async () => {
        const members = await this.prisma.orm.public.Member.findMany({
          where: {
            guildId,
            ...(includeInactive ? {} : { active: true }),
            globalUserId: { not: null },
          },
          select: {
            id: true,
            userId: true,
            name: true,
            avatar: true,
            active: true,
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
      },
    );
  }

  getGuildMembersSummary(guildId: string): Promise<MemberSummary[]> {
    return this.getCachedMemberRead(
      getGuildMembersSummaryCacheKey(guildId),
      MEMBER_READ_CACHE_TTL_SECONDS,
      "guild members summary",
      async () => {
        const guild = await this.prisma.orm.public.Guild.findFirst({
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

        const members = await this.prisma.orm.public.Member.findMany({
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
      },
    );
  }

  private async getCachedMemberRead<T>(
    cacheKey: string,
    ttlSeconds: number,
    cacheName: string,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.redisService.getJson<T>(cacheKey);

    if (cached !== null) {
      this.logger.debug(`Cache hit for ${cacheName}: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${cacheName}: ${cacheKey}`);

    return this.redisService.getOrSetJson({
      key: cacheKey,
      ttlSeconds,
      factory,
    });
  }

  getMemberLootlogConfigSummary(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberLootlogConfigSummary> {
    const { discordId, guildId } = options;

    return this.getCachedMemberRead(
      getMemberLootlogConfigSummaryCacheKey(guildId, discordId),
      MEMBER_LOOTLOG_CONFIG_SUMMARY_CACHE_TTL_SECONDS,
      "member lootlog config summary",
      async () => {
        const member = await this.prisma.orm.public.Member.findUnique({
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

        const configs =
          await this.prisma.orm.public.UserCharactersLootlogSettings.findMany({
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
      },
    );
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

    const snapshots = await this.prisma.orm.public.PlayerSnapshot.findMany({
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
