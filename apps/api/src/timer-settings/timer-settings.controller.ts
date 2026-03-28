import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Param,
  UseGuards,
} from "@nestjs/common";
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
import { TimerSettingsService } from "./timer-settings.service";
import { UpdateTimerSettingsDto } from "./dto/update-timer-settings.dto";
import { UpdateGuildTimerSettingsDto } from "./dto/update-guild-timer-settings.dto";
import { MigrateTimerSettingsDto } from "./dto/migrate-timer-settings.dto";
import { TimerSettingsEntity } from "./entities/timer-settings.entity";
import { GuildTimerSettingsEntity } from "./entities/guild-timer-settings.entity";

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
  @ApiResponse({
    status: 200,
    description: "User global timer settings",
    type: TimerSettingsEntity,
  })
  async getGlobalSettings(@UserId() userId: string) {
    const settings = await this.timerSettingsService.getGlobalSettings(userId);
    return plainToInstance(TimerSettingsEntity, settings, {
      excludeExtraneousValues: true,
    });
  }

  @Patch()
  @ApiOperation({
    summary: "Update global timer settings",
    description: "Update user global timer settings",
  })
  @ApiResponse({
    status: 200,
    description: "Updated global timer settings",
    type: TimerSettingsEntity,
  })
  async updateGlobalSettings(
    @UserId() userId: string,
    @Body() dto: UpdateTimerSettingsDto,
  ) {
    const settings = await this.timerSettingsService.updateGlobalSettings(
      userId,
      dto,
    );
    return plainToInstance(TimerSettingsEntity, settings, {
      excludeExtraneousValues: true,
    });
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
  @ApiResponse({
    status: 200,
    description: "Guild-specific timer settings",
    type: GuildTimerSettingsEntity,
  })
  async getGuildSettings(
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    const settings = await this.timerSettingsService.getGuildSettings(
      userId,
      guildId,
    );
    return plainToInstance(GuildTimerSettingsEntity, settings, {
      excludeExtraneousValues: true,
    });
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
  @ApiResponse({
    status: 200,
    description: "Updated guild-specific timer settings",
    type: GuildTimerSettingsEntity,
  })
  async updateGuildSettings(
    @UserId() userId: string,
    @Param("guildId") guildId: string,
    @Body() dto: UpdateGuildTimerSettingsDto,
  ) {
    const settings = await this.timerSettingsService.updateGuildSettings(
      userId,
      guildId,
      dto,
    );
    return plainToInstance(GuildTimerSettingsEntity, settings, {
      excludeExtraneousValues: true,
    });
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
  async migrateSettings(
    @UserId() userId: string,
    @Body() dto: MigrateTimerSettingsDto,
  ) {
    return this.timerSettingsService.migrateSettings(userId, dto);
  }
}
