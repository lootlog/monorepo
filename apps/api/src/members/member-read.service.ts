import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { Permission, type PlayerSnapshot } from "src/generated/prisma/client";
import type {
  MemberLootlogConfigCharacterSummary,
  MemberLootlogConfigSummary,
  MemberReference,
  MemberSummary,
  MemberWithRoles,
} from "./member.types";

@Injectable()
export class MemberReadService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getGuildMemberReferences(
    guildId: string,
    includeInactive = false,
  ): Promise<MemberReference[]> {
    const members = await this.prisma.member.findMany({
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
