import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { CreateOrUpdateLootlogCharacterConfigDto } from 'src/user-lootlog-config/dto/create-user-account-config.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class UserLootlogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getLootlogAccountConfig(discordId: string, accountId: string) {
    const accountConfig =
      await this.prisma.userCharactersLootlogSettings.findMany({
        where: {
          userId: discordId,
          accountId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    return accountConfig.reduce((acc, config) => {
      const { characterId } = config;
      return {
        ...acc,
        [characterId]: config,
      };
    }, {});
  }

  async getLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    characterId: string,
  ) {
    const characterConfig =
      await this.prisma.userCharactersLootlogSettings.findFirst({
        where: {
          userId: discordId,
          accountId,
          characterId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    return characterConfig;
  }

  async createOrUpdateLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    const config = await this.prisma.userCharactersLootlogSettings.upsert({
      where: {
        userId_accountId_characterId: {
          userId: discordId,
          accountId,
          characterId: data.characterId,
        },
      },
      update: {
        collectLootBlaclistGuildIds: data.lootGuildIds,
        addTimersBlacklistGuildIds: data.timerGuildIds,
      },
      create: {
        userId: discordId,
        accountId,
        characterId: data.characterId,
        collectLootBlaclistGuildIds: data.lootGuildIds,
        addTimersBlacklistGuildIds: data.timerGuildIds,
      },
    });

    return config;
  }
}
