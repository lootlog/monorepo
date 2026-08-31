import { db as prismaDb } from "#src/prisma/db";
import type { Contract, FieldOutputTypes } from "../prisma/contract.js";
import { and, or } from "@prisma/orm-family-sql/orm-client";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import { PrismaService } from "#src/db/prisma.service";
import { attachRolesToMembers } from "./member-roles.repository.js";
import {
  getGuildMemberReferencesCacheKey,
  getGuildMembersSummaryCacheKey,
  getMemberLootlogConfigSummaryCacheKey,
} from "#src/shared/constants/cache.constant";
import type {
  MemberLootlogConfigCharacterSummary,
  MemberLootlogConfigSummary,
  MemberReference,
  MemberSummary,
  MemberWithRoles,
} from "./member.types.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];
type PlayerSnapshot = FieldOutputTypes["public"]["PlayerSnapshot"];

const MEMBER_READ_CACHE_TTL_SECONDS = 30;
const MEMBER_LOOTLOG_CONFIG_SUMMARY_CACHE_TTL_SECONDS = 60;

@Injectable()
export class MemberReadService {
  private readonly logger = new Logger(MemberReadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getGuildMembers(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberWithRoles[]> {
    let membersQuery = this.prisma.db.orm.public.Member.where((row) =>
      and(row.guildId.eq(guildId), row.globalUserId.isNotNull()),
    );
    if (!includeInactive) {
      membersQuery = membersQuery.where((row) => row.active.eq(true));
    }
    const members = await membersQuery.orderBy((row) => row.name.asc()).all();
    return attachRolesToMembers(this.prisma.db, members);
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
        let membersQuery = this.prisma.db.orm.public.Member.where((row) =>
          and(row.guildId.eq(guildId), row.globalUserId.isNotNull()),
        );
        if (!includeInactive) {
          membersQuery = membersQuery.where((row) => row.active.eq(true));
        }
        const memberRows = await membersQuery
          .select("id", "userId", "name", "avatar", "active")
          .orderBy((row) => row.name.asc())
          .all();
        const members = await attachRolesToMembers(
          this.prisma.db,
          memberRows as Omit<MemberReference, "color">[],
        );

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
        const guild = await this.prisma.db.orm.public.Guild.where((row) =>
          and(row.id.eq(guildId), row.active.eq(true)),
        )
          .select("ownerId")
          .first();

        if (!guild) {
          return [];
        }

        const memberRows = await this.prisma.db.orm.public.Member.where((row) =>
          and(
            row.guildId.eq(guildId),
            row.active.eq(true),
            row.globalUserId.isNotNull(),
          ),
        )
          .select("id", "userId", "name", "avatar")
          .orderBy((row) => row.name.asc())
          .all();
        const members = await attachRolesToMembers(
          this.prisma.db,
          memberRows as Omit<MemberSummary, "color">[],
        );

        const summaryPermissions = new Set<Permission>([
          Permission.OWNER,
          Permission.ADMIN,
          Permission.LOOTLOG_ACCESS,
        ]);
        return members
          .filter(
            (member) =>
              member.userId === guild.ownerId ||
              member.roles.some((role) =>
                role.permissions
                  ? role.permissions.some((permission) =>
                      summaryPermissions.has(permission),
                    )
                  : true,
              ),
          )
          .map(({ roles, ...member }) => ({
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
        const member = await this.prisma.db.orm.public.Member.where((row) =>
          and(row.userId.eq(discordId), row.guildId.eq(guildId)),
        )
          .select("userId", "active")
          .first();

        if (!member) {
          throw new NotFoundException("Member not found");
        }

        const configs =
          await this.prisma.db.orm.public.UserCharactersLootlogSettings.where(
            (row) => row.userId.eq(discordId),
          )
            .orderBy([
              (row) => row.accountId.asc(),
              (row) => row.characterId.asc(),
            ])
            .all();

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

    const snapshots = (await this.prisma.db.orm.public.PlayerSnapshot.where(
      (row) =>
        or(
          ...characterRefs.map(({ accountId, characterId }) =>
            and(row.accountId.eq(accountId), row.characterId.eq(characterId)),
          ),
        ),
    )
      .select("accountId", "characterId", "name", "world", "icon")
      .orderBy((row) => row.createdAt.desc())
      .all()) as PlayerSnapshot[];

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
