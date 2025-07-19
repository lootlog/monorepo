import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('/notifications')
  async getAllTimers(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() data: CreateNotificationDto,
  ) {
    return this.notificationsService.sendNotification(discordId, userId, data);
  }
}
