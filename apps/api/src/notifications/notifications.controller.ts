import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { DiscordId } from "@lootlog/nest-shared";
import type { FastifyReply } from "fastify";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { CreateNotificationDto } from "src/notifications/dto/create-notification.dto";
import { CreatePartyGatheringDto } from "src/notifications/dto/create-party-gathering.dto";
import { CreateVolunteerDto } from "src/notifications/dto/create-volunteer.dto";
import { NotificationsService } from "src/notifications/notifications.service";
import { AuthGuard } from "src/shared/guards/auth.guard";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({
    summary: "Send notification",
    description: "Send a notification to the user",
  })
  @ApiResponse({
    status: 201,
    description: "Notification sent successfully",
  })
  async sendNotification(
    @DiscordId() discordId: string,
    @Body() data: CreateNotificationDto,
  ) {
    return this.notificationsService.sendNotification(discordId, data);
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
  async volunteer(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Body() data: CreateVolunteerDto,
  ) {
    return this.notificationsService.volunteer(discordId, notificationId, data);
  }

  @Post("party-gathering")
  @ApiOperation({
    summary: "Create party gathering notification",
    description: "Send a party gathering (LFG) notification to guild members",
  })
  @ApiResponse({
    status: 201,
    description: "Party gathering notification sent successfully",
  })
  async createPartyGathering(
    @DiscordId() discordId: string,
    @Body() data: CreatePartyGatheringDto,
  ) {
    return this.notificationsService.sendPartyGathering(discordId, data);
  }

  @Delete("party-gathering")
  @ApiOperation({
    summary: "Cancel party gathering by user",
    description:
      "Cancel the active party gathering for the current user without requiring a notificationId",
  })
  @ApiResponse({
    status: 200,
    description: "Party gathering notification cancelled successfully",
  })
  async cancelPartyGatheringByUser(@DiscordId() discordId: string) {
    return this.notificationsService.cancelPartyGatheringByUser(discordId);
  }

  @Delete("party-gathering/:notificationId")
  @ApiOperation({
    summary: "Cancel party gathering notification",
    description: "Cancel an active party gathering notification",
  })
  @ApiResponse({
    status: 200,
    description: "Party gathering notification cancelled successfully",
  })
  @ApiResponse({
    status: 204,
    description: "Notification already expired or not found (idempotent)",
  })
  @ApiResponse({
    status: 403,
    description: "Not the owner of this notification",
  })
  async cancelPartyGathering(
    @DiscordId() discordId: string,
    @Param("notificationId") notificationId: string,
    @Res() reply: FastifyReply,
  ) {
    const result = await this.notificationsService.cancelPartyGathering(
      discordId,
      notificationId,
    );

    if (result.status === "expired") {
      return reply.status(204).send();
    }

    return reply.status(200).send({ success: true, guildIds: result.guildIds });
  }
}
