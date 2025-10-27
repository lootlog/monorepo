import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserGuildPermissionsDto } from 'src/guilds/dto/user-guild-permissions.dto';
import { GuildsService } from 'src/guilds/guilds.service';

@ApiTags('internal')
@Controller('internal/guilds')
export class GuildsInternalController {
  constructor(private readonly guildsService: GuildsService) {}

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
  @ApiResponse({
    status: 200,
    description: 'List of user guilds with permissions',
    type: [UserGuildPermissionsDto],
  })
  async getUserPermissions(
    @Query('discordId') discordId: string,
    @Query('userId') userId: string,
  ): Promise<UserGuildPermissionsDto[]> {
    if (!discordId || !userId) {
      return [];
    }

    return this.guildsService.getUserGuildsWithPermissions(discordId, userId);
  }
}
