import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission } from "src/generated/prisma/client";
import type { CreateOrUpdateLootlogCharacterConfigDto } from "src/user-lootlog-config/dto/create-user-account-config.dto";
import { toUserLootlogConfigResponse } from "src/shared/dto/user-lootlog-config-response.dto";

@Injectable()
export class UserLootlogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
  ) {}

  private async getWritableLootlogGuildIds(discordId: string) {
    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_LOOTS_WRITE],
    );

    return new Set(guilds.map((guild) => guild.id));
  }

  async getLootlogAccountConfig(discordId: string, accountId: string) {
    const [accountConfig, writableGuildIds] = await Promise.all([
      this.prisma.userCharactersLootlogSettings.findMany({
        where: {
          userId: discordId,
          accountId,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.getWritableLootlogGuildIds(discordId),
    ]);

    return accountConfig.reduce<
      Record<string, ReturnType<typeof toUserLootlogConfigResponse>>
    >((result, config) => {
      result[config.characterId] = toUserLootlogConfigResponse({
        userId: config.userId,
        accountId: config.accountId,
        characterId: config.characterId,
        catchingGuildIds: config.catchingGuildIds.filter((guildId) =>
          writableGuildIds.has(guildId),
        ),
      });

      return result;
    }, {});
  }

  getLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    characterId: string,
  ) {
    return this.prisma.userCharactersLootlogSettings.findFirst({
      where: {
        userId: discordId,
        accountId,
        characterId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createOrUpdateLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    const writableGuildIds = await this.getWritableLootlogGuildIds(discordId);
    const normalizedCatchingGuildIds = [
      ...new Set(data.catchingGuildIds),
    ].filter((guildId) => writableGuildIds.has(guildId));

    const config = await this.prisma.userCharactersLootlogSettings.upsert({
      where: {
        userId_accountId_characterId: {
          userId: discordId,
          accountId,
          characterId: data.characterId,
        },
      },
      update: {
        catchingGuildIds: normalizedCatchingGuildIds,
      },
      create: {
        userId: discordId,
        accountId,
        characterId: data.characterId,
        catchingGuildIds: normalizedCatchingGuildIds,
      },
    });

    return toUserLootlogConfigResponse(config);
  }
}
