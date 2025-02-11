import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
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

  async getUserLootlogConfigByPlayerId(userId: string, playerId: string) {
    const userGuilds = await this.usersService.getUserGuilds(userId);

    const configurations = await this.prisma.playerLootlogConfig.findMany({
      where: {
        playerId,
        guildId: {
          in: userGuilds.map(({ id }) => id),
        },
      },
    });

    return configurations;
  }

  async createUserLootlogConfig(
    userId: string,
    data: CreateUserLootlogConfigDto,
  ) {
    return [];
  }
}
