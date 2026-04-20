import { Body, Controller, Get, Patch, Param, UseGuards } from "@nestjs/common";
import { UserId } from "@lootlog/nest-shared/decorators";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { EventSettingsService } from "./services/event-settings.service";
import { UpdateEventSettingsDto } from "./dto/update-event-settings.dto";
import { EventSettingsResponseDto } from "./dto/event-settings-response.dto";

@ApiTags("event-settings")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class EventsSettingsController {
  constructor(private readonly eventSettingsService: EventSettingsService) {}

  @Get("guilds/:guildId/event-settings")
  @ApiOperation({
    summary: "Get guild event settings",
    description: "Retrieve user event settings for a specific guild",
  })
  @ApiParam({
    name: "guildId",
    description: "Guild ID",
    example: "guild_123",
  })
  @ZodResponse({
    status: 200,
    description: "Guild event settings",
    type: EventSettingsResponseDto,
  })
  getSettings(@UserId() userId: string, @Param("guildId") guildId: string) {
    return this.eventSettingsService.getSettings(userId, guildId);
  }

  @Patch("guilds/:guildId/event-settings")
  @ApiOperation({
    summary: "Update guild event settings",
    description: "Update user event settings for a specific guild",
  })
  @ApiParam({
    name: "guildId",
    description: "Guild ID",
    example: "guild_123",
  })
  @ZodResponse({
    status: 200,
    description: "Updated guild event settings",
    type: EventSettingsResponseDto,
  })
  updateSettings(
    @UserId() userId: string,
    @Param("guildId") guildId: string,
    @Body() dto: UpdateEventSettingsDto,
  ) {
    return this.eventSettingsService.updateSettings(userId, guildId, dto);
  }
}
