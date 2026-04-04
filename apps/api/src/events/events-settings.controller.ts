import { Body, Controller, Get, Patch, Param, UseGuards } from "@nestjs/common";
import { UserId } from "@lootlog/nest-shared";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { EventSettingsService } from "./services/event-settings.service";
import type { UpdateEventSettingsDto } from "./dto/update-event-settings.dto";
import { EventSettingsEntity } from "./entities/event-settings.entity";

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
  @ApiResponse({
    status: 200,
    description: "Guild event settings",
    type: EventSettingsEntity,
  })
  async getSettings(
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    const settings = await this.eventSettingsService.getSettings(
      userId,
      guildId,
    );
    return plainToInstance(EventSettingsEntity, settings, {
      excludeExtraneousValues: true,
    });
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
  @ApiResponse({
    status: 200,
    description: "Updated guild event settings",
    type: EventSettingsEntity,
  })
  async updateSettings(
    @UserId() userId: string,
    @Param("guildId") guildId: string,
    @Body() dto: UpdateEventSettingsDto,
  ) {
    const settings = await this.eventSettingsService.updateSettings(
      userId,
      guildId,
      dto,
    );
    return plainToInstance(EventSettingsEntity, settings, {
      excludeExtraneousValues: true,
    });
  }
}
