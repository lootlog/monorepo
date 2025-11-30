import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthGuard,
  DiscordId,
  UserId,
  GuildId,
  RequiredPermissions,
} from '@lootlog/nest-shared';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';
import { Permission } from '@lootlog/types';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('activities')
export class ActivitiesController {
  @Get(':guildId')
  @RequiredPermissions(Permission.ADMIN)
  getActivities(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @GuildId() guildId: string,
  ) {
    return { message: 'List of activities', discordId, userId, guildId };
  }
}
