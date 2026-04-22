import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  UseGuards,
} from "@nestjs/common";
import { UserId } from "@lootlog/nest-shared/decorators";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { TimerSettingsService } from "./timer-settings.service";
import { UpdateTimerSettingsDto } from "./dto/update-timer-settings.dto";
import { UpdateGuildTimerSettingsDto } from "./dto/update-guild-timer-settings.dto";
import { MigrateTimerSettingsDto } from "./dto/migrate-timer-settings.dto";
import {
  GuildTimerSettingsResponseDto,
  TimerSettingsResponseDto,
} from "./dto/timer-settings-response.dto";

@ApiTags("timer-settings")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("timer-settings")
export class TimerSettingsController {
  constructor(private readonly timerSettingsService: TimerSettingsService) {}

  @Get()
  @ApiOperation({
    summary: "Get global timer settings",
    description: "Retrieve user global timer settings",
  })
  @ZodResponse({
    status: 200,
    description: "User global timer settings",
    type: TimerSettingsResponseDto,
  })
  getGlobalSettings(@UserId() userId: string) {
    return this.timerSettingsService.getGlobalSettings(userId);
  }

  @Patch()
  @ApiOperation({
    summary: "Update global timer settings",
    description: "Update user global timer settings",
  })
  @ZodResponse({
    status: 200,
    description: "Updated global timer settings",
    type: TimerSettingsResponseDto,
  })
  updateGlobalSettings(
    @UserId() userId: string,
    @Body() dto: UpdateTimerSettingsDto,
  ) {
    return this.timerSettingsService.updateGlobalSettings(userId, dto);
  }

  @Get("guilds/:guildId")
  @ApiOperation({
    summary: "Get guild-specific timer settings",
    description: "Retrieve user timer settings for a specific guild",
  })
  @ApiParam({
    name: "guildId",
    description: "Guild ID",
    example: "guild_123",
  })
  @ZodResponse({
    status: 200,
    description: "Guild-specific timer settings",
    type: GuildTimerSettingsResponseDto,
  })
  getGuildSettings(
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.timerSettingsService.getGuildSettings(userId, guildId);
  }

  @Patch("guilds/:guildId")
  @ApiOperation({
    summary: "Update guild-specific timer settings",
    description: "Update user timer settings for a specific guild",
  })
  @ApiParam({
    name: "guildId",
    description: "Guild ID",
    example: "guild_123",
  })
  @ZodResponse({
    status: 200,
    description: "Updated guild-specific timer settings",
    type: GuildTimerSettingsResponseDto,
  })
  updateGuildSettings(
    @UserId() userId: string,
    @Param("guildId") guildId: string,
    @Body() dto: UpdateGuildTimerSettingsDto,
  ) {
    return this.timerSettingsService.updateGuildSettings(userId, guildId, dto);
  }

  @Post("migrate")
  @ApiOperation({
    summary: "Migrate localStorage settings to backend",
    description:
      "Migrate timer settings from localStorage to backend with conflict resolution",
  })
  @ApiResponse({
    status: 200,
    description: "Migration result",
  })
  migrateSettings(
    @UserId() userId: string,
    @Body() dto: MigrateTimerSettingsDto,
  ) {
    return this.timerSettingsService.migrateSettings(userId, dto);
  }
}
