import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { DiscordId, UserId } from "@lootlog/nest-shared";
import { ZodResponse } from "nestjs-zod";
import { type Guild, Permission, type Role } from "src/generated/prisma/client";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { TimerResponseDto } from "src/shared/dto/timer-response.dto";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { CreateManualTimerDto } from "src/timers/dto/create-manual-timer.dto";
import { CreateAutoTimerResponseDto } from "src/timers/dto/create-auto-timer-response.dto";
import { CreateTimerFromGameClientDto } from "src/timers/dto/create-timer-from-game-client.dto";
import { ResetTimerDto } from "src/timers/dto/reset-timer.dto";
import { SearchTimersNpcResponseDto } from "src/timers/dto/search-timers-npcs-response.dto";
import { SearchTimersNpcsDto } from "src/timers/dto/search-timers-npcs.dto";
import { TimersService } from "src/timers/timers.service";

@ApiTags("timers")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class TimersController {
  constructor(private readonly timersService: TimersService) {}

  @Get("/timers")
  @ApiOperation({
    summary: "Get all user timers",
    description:
      "Retrieve all timers accessible to the authenticated user across all guilds",
  })
  @ApiQuery({
    name: "world",
    description: "World name filter",
    required: false,
  })
  @ZodResponse({
    status: 200,
    description: "List of timers",
    type: [TimerResponseDto],
  })
  getAllTimers(@Query("world") world: string, @DiscordId() discordId: string) {
    return this.timersService.getAllTimers(discordId, { world });
  }

  @Permissions(Permission.LOOTLOG_TIMERS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/timers")
  @ApiOperation({
    summary: "Get guild timers",
    description: "Retrieve timers for a specific guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiQuery({
    name: "world",
    description: "World name filter",
    required: false,
  })
  @ZodResponse({
    status: 200,
    description: "List of guild timers",
    type: [TimerResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getTimers(
    @Query("world") world: string,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
  ) {
    return this.timersService.getTimers(
      {
        world,
      },
      guild,
      permissions,
      roles,
    );
  }

  @Permissions(Permission.LOOTLOG_TIMERS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/timers/npcs/search")
  @ApiOperation({
    summary: "Search NPCs with timer data",
    description:
      "Search for NPCs that have been timed in this guild/world, returning their latest respawn configuration",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiQuery({
    name: "search",
    description: "NPC name search term",
    required: true,
  })
  @ApiQuery({ name: "world", description: "World name", required: true })
  @ApiQuery({
    name: "limit",
    description: "Result limit (1-50)",
    required: false,
  })
  @ZodResponse({
    status: 200,
    description: "List of NPCs with timer metadata",
    type: [SearchTimersNpcResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  searchNpcsWithTimerData(
    @Param("guildId") guildId: string,
    @Query() query: SearchTimersNpcsDto,
  ) {
    return this.timersService.searchNpcsWithTimerData(
      guildId,
      query.world,
      query.search,
      query.limit,
    );
  }

  @Post("/timers/auto")
  @ApiOperation({
    summary: "Create automatic timers",
    description:
      "Resolve target guilds from character catching settings and create timers for them",
  })
  @ZodResponse({
    status: 201,
    description: "Automatic timer creation result",
    type: CreateAutoTimerResponseDto,
  })
  @ApiResponse({ status: 400, description: "No guild accepted this timer" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  createAutoTimer(
    @Body() data: CreateTimerFromGameClientDto,
    @DiscordId() discordId: string,
    @UserId() userId: string,
  ) {
    return this.timersService.createAutoTimer(discordId, userId, data);
  }

  @Permissions(Permission.LOOTLOG_TIMERS_RESET)
  @UseGuards(PermissionsGuard)
  @Patch("/guilds/:guildId/timers/:timerIdentifier/reset")
  @ApiOperation({
    summary: "Reset timer",
    description: "Reset a timer for a specific NPC in a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "timerIdentifier",
    description: "Timer key or legacy NPC ID when unambiguous",
    example: "12345:test boss",
  })
  @ZodResponse({
    status: 200,
    description: "Timer reset successfully",
    type: TimerResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Timer not found" })
  resetTimer(
    @DiscordId() discordId: string,
    @Param("guildId") guildId: string,
    @Param("timerIdentifier") timerIdentifier: string,
    @Body() data: ResetTimerDto,
  ) {
    return this.timersService.resetTimer(
      discordId,
      guildId,
      timerIdentifier,
      data,
    );
  }

  @Permissions(Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/timers/:timerIdentifier")
  @ApiOperation({
    summary: "Delete timer",
    description: "Delete a timer for a specific NPC in a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "timerIdentifier",
    description: "Timer key or legacy NPC ID when unambiguous",
    example: "12345:test boss",
  })
  @ApiQuery({ name: "world", description: "World name", required: false })
  @ApiResponse({
    status: 200,
    description: "Timer deleted successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - manage permission required",
  })
  @ApiResponse({ status: 404, description: "Timer not found" })
  deleteTimer(
    @Query("world") world: string,
    @Param("guildId") guildId: string,
    @Param("timerIdentifier") timerIdentifier: string,
  ) {
    return this.timersService.deleteTimer(guildId, timerIdentifier, world);
  }

  @Permissions(Permission.LOOTLOG_TIMERS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/timers/manual")
  @ApiOperation({
    summary: "Create manual timer",
    description: "Manually create a timer for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 201,
    description: "Manual timer created successfully",
    type: TimerResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  createManualTimer(
    @Body() data: CreateManualTimerDto,
    @DiscordId() discordId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.timersService.createManualTimer(discordId, guildId, data);
  }

  @Permissions(Permission.LOOTLOG_TIMERS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/timers")
  @ApiOperation({
    summary: "Create timer from game client for specific guild",
    description:
      "Create a timer submitted by user from game client for a specific guild. Supports custom spawn times.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 201,
    description: "Timer created successfully",
    type: TimerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error (invalid spawn times, wt too low, etc.)",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  createTimerFromGameClient(
    @Body() data: CreateTimerFromGameClientDto,
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Param("guildId") guildId: string,
  ) {
    return this.timersService.createTimerForGuild(
      discordId,
      userId,
      guildId,
      data,
    );
  }
}
