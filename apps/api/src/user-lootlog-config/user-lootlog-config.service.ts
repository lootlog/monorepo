import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { CreateOrUpdateLootlogCharacterConfigDto } from 'src/user-lootlog-config/dto/create-user-account-config.dto';
import { CreateUserLootlogConfigDto } from 'src/user-lootlog-config/dto/create-user-lootlog-config.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class UserLootlogConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getUserLootlogConfig(userId: string) {
    return [];
  }

  // async getUserLootlogConfigByPlayerId(userId: string, playerId: string) {
  //   const userGuilds = await this.usersService.getUserGuilds(userId);

  //   const configurations = await this.prisma.playerLootlogConfig.findMany({
  //     where: {
  //       playerId,
  //       guildId: {
  //         in: userGuilds.map(({ id }) => id),
  //       },
  //     },
  //   });

  //   return configurations;
  // }

  async createUserLootlogConfig(
    userId: string,
    data: CreateUserLootlogConfigDto,
  ) {
    return [];
  }

  async getLootlogCharacterConfig(discordId: string, accountId: string) {
    const charactersConfig =
      await this.prisma.userCharactersLootlogSettings.findMany({
        where: {
          userId: discordId,
          accountId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    return charactersConfig.reduce((acc, config) => {
      const { characterId } = config;
      return {
        ...acc,
        [characterId]: config,
      };
    }, {});
  }

  async createOrUpdateLootlogCharacterConfig(
    discordId: string,
    accountId: string,
    data: CreateOrUpdateLootlogCharacterConfigDto,
  ) {
    const config = await this.prisma.userCharactersLootlogSettings.upsert({
      where: {
        userId: discordId,
        accountId,
        characterId: data.characterId,
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
