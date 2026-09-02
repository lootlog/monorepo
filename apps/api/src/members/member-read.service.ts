import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { RedisService } from "#src/redis/redis.service";
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
import { MembersRepository } from "./members.repository.js";

type PlayerSnapshotSummary = Awaited<
  ReturnType<MembersRepository["findPlayerSnapshots"]>
>[number];

const MEMBER_READ_CACHE_TTL_SECONDS = 30;
const MEMBER_LOOTLOG_CONFIG_SUMMARY_CACHE_TTL_SECONDS = 60;

@Injectable()
export class MemberReadService {
  private readonly logger = new Logger(MemberReadService.name);

  constructor(
    private readonly repository: MembersRepository,
    private readonly redisService: RedisService,
  ) {}

  getGuildMembers(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberWithRoles[]> {
    return this.repository.findGuildMembers(guildId, includeInactive);
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
        const members = await this.repository.findGuildMembers(
          guildId,
          includeInactive,
        );

        return members.map(({ id, userId, name, avatar, active, roles }) => ({
          id,
          userId,
          name,
          avatar,
          active,
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
        const ownerId = await this.repository.findActiveGuildOwner(guildId);
        if (!ownerId) {
          return [];
        }
        const members = await this.repository.findGuildMembersSummary(
          guildId,
          ownerId,
        );

        return members.map(({ id, userId, name, avatar, roles }) => ({
          id,
          userId,
          name,
          avatar,
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
        const member = await this.repository.findMember(discordId, guildId);

        if (!member) {
          throw new NotFoundException("Member not found");
        }

        const configs = await this.repository.findLootlogConfigs(discordId);

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
        PlayerSnapshotSummary,
        "accountId" | "characterId" | "name" | "world" | "icon"
      >
    >
  > {
    if (characterRefs.length === 0) {
      return new Map();
    }

    const snapshots = await this.repository.findPlayerSnapshots(characterRefs);

    return snapshots.reduce<
      Map<
        string,
        Pick<
          PlayerSnapshotSummary,
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
