import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import type { CreateOrUpdateLootlogCharacterConfigDto } from "src/user-lootlog-config/dto/create-user-account-config.dto";
import { toUserLootlogConfigResponse } from "src/shared/dto/user-lootlog-config-response.dto";

@Injectable()
export class UserLootlogConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getLootlogAccountConfig(discordId: string, accountId: string) {
    const accountConfig =
      await this.prisma.userCharactersLootlogSettings.findMany({
        where: {
          userId: discordId,
          accountId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return accountConfig.reduce<
      Record<string, ReturnType<typeof toUserLootlogConfigResponse>>
    >((result, config) => {
      result[config.characterId] = toUserLootlogConfigResponse({
        userId: config.userId,
        accountId: config.accountId,
        characterId: config.characterId,
        catchingGuildIds: config.catchingGuildIds,
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
    const normalizedCatchingGuildIds = [...new Set(data.catchingGuildIds)];

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
