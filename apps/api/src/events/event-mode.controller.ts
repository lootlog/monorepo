import { DiscordId, UserId } from "@lootlog/nest-shared/decorators";
import { Controller, Get, Headers, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import {
  DEV_PERMISSION_OVERRIDE_HEADER,
  parseDevPermissionOverrideHeader,
} from "src/shared/permissions/dev-permission-override";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { EventModeQueryDto } from "./dto/event-mode-query.dto";
import { EventModeResponseDto } from "./dto/event-mode-response.dto";
import { EventModeService } from "./services/event-mode.service";

@ApiTags("event-mode")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users/@me/event-mode")
export class EventModeController {
  constructor(private readonly eventModeService: EventModeService) {}

  @Get()
  @ApiOperation({
    summary: "Get current user event mode",
    description:
      "Get active pinned events, assignments, and the next respawn for the authenticated user",
  })
  @ZodResponse({
    status: 200,
    description: "Current user Event Mode projection",
    type: EventModeResponseDto,
  })
  getEventMode(
    @UserId() userId: string,
    @DiscordId() discordId: string,
    @Query() query: EventModeQueryDto,
    @Headers(DEV_PERMISSION_OVERRIDE_HEADER) devPermissionOverride?: string,
  ) {
    return this.eventModeService.getEventMode({
      userId,
      discordId,
      world: query.world,
      devPermissionOverride: parseDevPermissionOverrideHeader(
        devPermissionOverride,
      ),
    });
  }
}
