import { db as prismaDb } from "#src/prisma/db";
import { AuthGuard } from "@lootlog/nest-shared";
import { UserId } from "@lootlog/nest-shared/decorators";
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { PinnedEventResponseDto } from "./dto/pinned-event-response.dto.js";
import { PinnedEventsService } from "./services/pinned-events.service.js";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsPinsController {
  constructor(private readonly pinnedEventsService: PinnedEventsService) {}

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/pinned-events")
  @ApiOperation({
    operationId: "listPinnedEvents",
    summary: "List active pinned events",
  })
  @ZodResponse({
    status: 200,
    description: "Active events pinned by the current user",
    type: [PinnedEventResponseDto],
  })
  listPinnedEvents(
    @UserId() userId: string,
    @GuildData() guildData: { id: string },
  ) {
    return this.pinnedEventsService.listPinnedEvents(userId, guildData.id);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Put("/guilds/:guildId/events/:eventId/pin")
  @ApiOperation({
    operationId: "pinEvent",
    summary: "Pin an active event",
  })
  @ZodResponse({
    status: 200,
    description: "Pinned event",
    type: PinnedEventResponseDto,
  })
  @ApiResponse({ status: 404, description: "Event not found" })
  @ApiResponse({ status: 409, description: "Event is not active" })
  pinEvent(
    @UserId() userId: string,
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
  ) {
    return this.pinnedEventsService.pinEvent(userId, guildData.id, eventId);
  }

  @Permissions(Permission.LOOTLOG_EVENTS_READ)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/events/:eventId/pin")
  @HttpCode(204)
  @ApiOperation({
    operationId: "unpinEvent",
    summary: "Unpin an event",
  })
  @ApiResponse({ status: 204, description: "Event unpinned" })
  async unpinEvent(
    @UserId() userId: string,
    @GuildData() guildData: { id: string },
    @Param("eventId") eventId: string,
  ) {
    await this.pinnedEventsService.unpinEvent(userId, guildData.id, eventId);
  }
}
