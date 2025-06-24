import { Body, Controller, Post, Query, UseGuards } from '@nestjs/common';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('/notifications')
  async getAllTimers(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationDto,
  ) {
    return this.notificationsService.sendNotification(discordId, data);
  }
}
