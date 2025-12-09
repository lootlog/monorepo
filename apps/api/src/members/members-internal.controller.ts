import { Controller, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MembersService } from './members.service';

interface GameClientRefreshResponse {
  refreshed: boolean;
  rateLimited: boolean;
  guildsRefreshed: number;
  nextRefreshAt?: string;
}

@ApiTags('internal')
@Controller('internal/members')
export class MembersInternalController {
  constructor(private readonly membersService: MembersService) {}

  @Post('refresh-discord-roles')
  @ApiOperation({
    summary: '[Internal] Refresh Discord roles for game-client user',
    description: `
      Internal endpoint for gateway service to refresh Discord roles for game-client users.
      Rate limited to prevent Discord API abuse (15 min between refreshes per user).
      Does not require authentication.
    `,
  })
  @ApiQuery({
    name: 'discordId',
    required: true,
    description: 'Discord user ID',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'User ID (globalUserId)',
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh result',
  })
  async refreshDiscordRoles(
    @Query('discordId') discordId: string,
    @Query('userId') userId: string,
  ): Promise<GameClientRefreshResponse> {
    if (!discordId || !userId) {
      return {
        refreshed: false,
        rateLimited: false,
        guildsRefreshed: 0,
      };
    }

    const result = await this.membersService.refreshGameClientUserRoles({
      discordId,
      userId,
    });

    return {
      ...result,
      nextRefreshAt: result.nextRefreshAt?.toISOString(),
    };
  }
}
