import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { NotificationsService } from "src/notifications/notifications.service";
import { SetGuildDiscordNotificationConfigDto } from "src/notifications/dto/set-guild-discord-notification-config.dto";
import { DiscordId } from "src/shared/decorators/discord-id.decorator";
import { UserId } from "src/shared/decorators/user-id.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";

@UseGuards(AuthGuard)
@Controller("guilds/:guildId/discord-notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get("config")
  getGuildConfig(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.notificationsService.getGuildConfig({
      discordId,
      userId,
      guildId,
    });
  }

  @Put("config")
  setGuildConfig(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param("guildId") guildId: string,
    @Body() body: SetGuildDiscordNotificationConfigDto,
  ) {
    return this.notificationsService.setGuildConfig({
      discordId,
      userId,
      guildId,
      data: body,
    });
  }

  @Get("permissions-status")
  getPermissionsStatus(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.notificationsService.getPermissionsStatus({
      discordId,
      userId,
      guildId,
      force: false,
    });
  }

  @Post("permissions-status/refresh")
  refreshPermissionsStatus(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.notificationsService.getPermissionsStatus({
      discordId,
      userId,
      guildId,
      force: true,
    });
  }
}
