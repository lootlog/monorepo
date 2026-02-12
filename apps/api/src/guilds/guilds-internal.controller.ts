import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InternalUserGuildPermissionsResponseDto } from 'src/guilds/dto/internal-user-guild-permissions-response.dto';
import { GuildsService } from 'src/guilds/guilds.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';

@ApiTags('internal')
@Controller('internal/guilds')
export class GuildsInternalController {
  constructor(
    private readonly guildsService: GuildsService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  @Get('user-permissions')
  @ApiOperation({
    summary: '[Internal] Get user guilds with permissions',
    description:
      'Internal endpoint for gateway service to retrieve user guilds with permissions. Does not require authentication.',
  })
  @ApiQuery({
    name: 'discordId',
    required: true,
    description: 'Discord user ID',
  })
  @ApiQuery({ name: 'userId', required: true, description: 'User ID' })
  @ApiQuery({
    name: 'accountId',
    required: false,
    description: 'Account ID used to resolve user lootlog settings',
  })
  @ApiQuery({
    name: 'characterId',
    required: false,
    description: 'Character ID used to resolve user lootlog settings',
  })
  @ApiResponse({
    status: 200,
    description: 'User guilds with permissions and optional lootlog settings',
    type: InternalUserGuildPermissionsResponseDto,
  })
  async getUserPermissions(
    @Query('discordId') discordId: string,
    @Query('userId') userId: string,
    @Query('accountId') accountId?: string,
    @Query('characterId') characterId?: string,
  ): Promise<InternalUserGuildPermissionsResponseDto> {
    if (!discordId || !userId) {
      return { guilds: [] };
    }

    const guilds = await this.guildsService.getUserGuildsWithPermissions(
      discordId,
      userId,
    );

    if (!accountId || !characterId) {
      return { guilds };
    }

    const accountConfig =
      await this.userLootlogConfigService.getLootlogAccountConfig(
        discordId,
        accountId,
      );
    const characterConfig = accountConfig[characterId];
    const timersGuildIds = new Set(
      characterConfig?.addTimersWhitelistGuildIds ?? [],
    );
    const lootGuildIds = new Set(
      characterConfig?.collectLootWhitelistGuildIds ?? [],
    );

    const guildStatusByGuildId = guilds.reduce(
      (acc, guildData) => {
        const guildId = guildData.guild.id;

        return {
          ...acc,
          [guildId]: {
            timersEnabled: timersGuildIds.has(guildId),
            lootEnabled: lootGuildIds.has(guildId),
          },
        };
      },
      {} as Record<string, { timersEnabled: boolean; lootEnabled: boolean }>,
    );

    return {
      guilds,
      lootlogSettings: {
        accountId,
        characterId,
        guildStatusByGuildId,
      },
    };
  }
}
