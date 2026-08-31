import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../prisma/contract.js";
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
import { DiscordId, UserId } from "@lootlog/nest-shared/decorators";
import { ZodResponse } from "nestjs-zod";
import { GuildData } from "#src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "#src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "#src/shared/decorators/member-roles.decorator";
import { TimerResponseDto } from "#src/shared/dto/timer-response.dto";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "#src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "#src/shared/permissions/permissions.guard";
import { CreateManualTimerDto } from "#src/timers/dto/create-manual-timer.dto";
import { CreateAutoTimerResponseDto } from "#src/timers/dto/create-auto-timer-response.dto";
import { CreateTimerFromGameClientDto } from "#src/timers/dto/create-timer-from-game-client.dto";
import { ResetTimerDto } from "#src/timers/dto/reset-timer.dto";
import { SearchTimersNpcResponseDto } from "#src/timers/dto/search-timers-npcs-response.dto";
import { SearchTimersNpcsDto } from "#src/timers/dto/search-timers-npcs.dto";
import { TimerHistoryResponseDto } from "#src/timers/dto/timer-history-response.dto";
import { TimersService } from "#src/timers/timers.service";

type Guild = FieldOutputTypes["public"]["Guild"];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];
type Role = FieldOutputTypes["public"]["Role"];

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
  getAllTimers(
    @Query("world") world: string,
    @DiscordId() discordId: string,
    @UserId() userId: string,
  ) {
    return this.timersService.getAllTimers(discordId, userId, { world });
  }

  @Get("/timers/history")
  @ApiOperation({
    summary: "Get recent timer action history",
    description:
      "Retrieve latest visible timer history entries for an authenticated user guild",
  })
  @ApiQuery({ name: "guildId", description: "Guild ID", required: true })
  @ApiQuery({ name: "world", description: "World name", required: true })
  @ApiQuery({ name: "limit", description: "Result limit", required: false })
  @ZodResponse({
    status: 200,
    description: "List of recent timer history entries",
    type: [TimerHistoryResponseDto],
  })
  getRecentTimerHistory(
    @DiscordId() discordId: string,
    @Query("guildId") guildId: string,
    @Query("world") world: string,
    @Query("limit") limit: string | undefined,
  ) {
    return this.timersService.getRecentTimerHistory(discordId, guildId, world, {
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
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
    @UserId() userId: string,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
  ) {
    return this.timersService.getTimers(
      userId,
      { world },
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
    @DiscordId() discordId: string,
    @Query("world") world: string,
    @Param("guildId") guildId: string,
    @Param("timerIdentifier") timerIdentifier: string,
  ) {
    return this.timersService.deleteTimer(
      discordId,
      guildId,
      timerIdentifier,
      world,
    );
  }

  @Permissions(Permission.LOOTLOG_TIMERS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/timers/:timerIdentifier/history")
  @ApiOperation({
    summary: "Get timer action history",
    description: "Retrieve latest action history entries for a guild timer",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "timerIdentifier",
    description: "Timer key or legacy NPC ID when unambiguous",
    example: "12345:test boss",
  })
  @ApiQuery({ name: "world", description: "World name", required: true })
  @ApiQuery({ name: "limit", description: "Result limit", required: false })
  @ZodResponse({
    status: 200,
    description: "List of timer history entries",
    type: [TimerHistoryResponseDto],
  })
  getTimerHistory(
    @Query("world") world: string,
    @Query("limit") limit: string | undefined,
    @Param("guildId") guildId: string,
    @Param("timerIdentifier") timerIdentifier: string,
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
  ) {
    return this.timersService.getTimerHistory(guildId, world, timerIdentifier, {
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      permissions,
      roles,
    });
  }

  @Permissions(Permission.LOOTLOG_TIMERS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/timers/history/:historyEntryId/restore")
  @ApiOperation({
    summary: "Restore timer from history",
    description: "Restore a deleted timer from a timer history entry",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "historyEntryId",
    description: "Timer history entry ID",
    example: 123,
  })
  @ZodResponse({
    status: 201,
    description: "Timer restored successfully",
    type: TimerResponseDto,
  })
  restoreTimerFromHistory(
    @DiscordId() discordId: string,
    @Param("guildId") guildId: string,
    @Param("historyEntryId") historyEntryId: string,
  ) {
    return this.timersService.restoreTimerFromHistory(
      discordId,
      guildId,
      Number.parseInt(historyEntryId, 10),
    );
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
}
