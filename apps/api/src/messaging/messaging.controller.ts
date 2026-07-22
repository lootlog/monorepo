import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { DiscordId } from "@lootlog/nest-shared/decorators";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { CreateNotificationDto } from "src/messaging/dto/create-notification.dto";
import { CreateVolunteerDto } from "src/messaging/dto/create-volunteer.dto";
import { NotificationResponseDto } from "src/messaging/dto/messaging-response.dto";
import { MessagingService } from "src/messaging/messaging.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

@ApiTags("messaging")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("messaging")
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @ApiOperation({
    summary: "Send notification",
    description: "Send a notification to the user",
  })
  @ZodResponse({
    status: 201,
    description: "Notification sent successfully",
    type: NotificationResponseDto,
  })
  sendNotification(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationDto,
  ) {
    return this.messagingService.sendNotification(discordId, data);
  }

  @Post(":notificationId/volunteer")
  @ApiOperation({
    summary: "Volunteer for NPC notification",
    description: "Send a volunteer request to the notification creator",
  })
  @ApiResponse({
    status: 201,
    description: "Volunteer request sent successfully",
  })
  volunteer(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: CreateVolunteerDto,
  ) {
    return this.messagingService.volunteer(discordId, notificationId, data);
  }
}
