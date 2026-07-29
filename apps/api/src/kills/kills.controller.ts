import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { DiscordId } from "@lootlog/nest-shared/decorators";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodResponse } from "nestjs-zod";
import {
  NpcType,
  Permission,
  type Guild,
  type Role,
} from "src/generated/prisma/client";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "@lootlog/nest-shared";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { CreateKillDto } from "./dto/create-kill.dto";
import {
  CreateKillResponseDto,
  GuildKillStatsResponseDto,
  GuildTopKillersByTypeResponseDto,
  GuildTopNpcsResponseDto,
  MemberKillsResponseDto,
  NpcKillersResponseDto,
  UserKillStatsResponseDto,
  UserNpcKillsResponseDto,
} from "./dto/kill-stats-response.dto";
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from "./dto/get-kill-stats.dto";
import { GetMemberKillsDto } from "./dto/get-member-kills.dto";
import { GetNpcKillersDto } from "./dto/get-npc-killers.dto";
import { GetUserNpcKillsDto } from "./dto/get-user-npc-kills.dto";
import { KillsService } from "./kills.service";
import { normalizeKillStatsPeriod } from "./utils/kill-stats-period";

@ApiTags("kills")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class KillsController {
  constructor(private readonly killsService: KillsService) {}

  @Post("/kills")
  @ApiOperation({
    summary: "Record a kill",
    description:
      "Records an NPC kill. Guilds are auto-detected from user lootlog config (loot/timer whitelists).",
  })
  @ZodResponse({
    status: 201,
    description: "Kill recorded successfully",
    type: CreateKillResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error",
  })
  createKill(@Body() data: CreateKillDto, @DiscordId() discordId: string) {
    return this.killsService.createKill(discordId, data);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/stats/kills")
  @ApiOperation({
    summary: "Get guild kill statistics",
    description:
      "Retrieves kill statistics for a guild including overview and member ranking.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Guild kill statistics",
    type: GuildKillStatsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getGuildKillStats(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @Query() query: GetGuildKillStatsDto,
    @GuildData() guildData: Guild,
  ) {
    return this.killsService.getGuildKillStats(
      guildData.id,
      permissions,
      roles,
      query,
    );
  }

  @Get("/users/@me/stats/kills")
  @ApiOperation({
    summary: "Get personal kill statistics",
    description:
      "Retrieves kill statistics for the authenticated user across all guilds, deduplicated.",
  })
  @ZodResponse({
    status: 200,
    description: "User kill statistics",
    type: UserKillStatsResponseDto,
  })
  getUserKillStats(
    @DiscordId() discordId: string,
    @Query() query: GetUserKillStatsDto,
  ) {
    return this.killsService.getUserKillStats(discordId, query);
  }

  @Get("/users/@me/kills/npcs")
  @ApiOperation({
    summary: "Get paginated list of killed NPCs",
    description:
      "Retrieves a paginated, searchable list of NPCs killed by the authenticated user.",
  })
  @ZodResponse({
    status: 200,
    description: "Paginated list of killed NPCs",
    type: UserNpcKillsResponseDto,
  })
  getUserNpcKills(
    @DiscordId() discordId: string,
    @Query() query: GetUserNpcKillsDto,
  ) {
    return this.killsService.getUserNpcKills(discordId, query);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/stats/kills/top-npcs")
  @ApiOperation({
    summary: "Get top killed NPCs in guild",
    description: "Retrieves the most frequently killed NPCs in a guild.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Top killed NPCs",
    type: GuildTopNpcsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiQuery({
    name: "npcType",
    required: false,
    description: "NPC type filter",
    example: "HERO",
    type: String,
    enum: Object.values(NpcType),
    enumName: "NpcType",
  })
  getGuildTopNpcs(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guildData: Guild,
    @Query("limit") limit?: number,
    @Query("npcType") npcType?: NpcType,
    @Query("world") world?: string,
    @Query("search") search?: string,
    @Query("minLvl") minLvl?: string,
    @Query("maxLvl") maxLvl?: string,
    @Query("period") period?: string,
  ) {
    return this.killsService.getGuildTopNpcs(
      guildData.id,
      permissions,
      roles,
      limit ?? 10,
      npcType,
      world,
      search,
      minLvl ? Number.parseInt(minLvl, 10) : undefined,
      maxLvl ? Number.parseInt(maxLvl, 10) : undefined,
      normalizeKillStatsPeriod(period),
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/stats/kills/top-killers")
  @ApiOperation({
    summary: "Get top killers by NPC type in guild",
    description:
      "Retrieves top members by kill count for specific NPC types (TITAN, HERO).",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ZodResponse({
    status: 200,
    description: "Top killers by NPC type",
    type: GuildTopKillersByTypeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getGuildTopKillersByType(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guildData: Guild,
    @Query("limit") limit?: number,
    @Query("period") period?: string,
  ) {
    return this.killsService.getGuildTopKillersByType(
      guildData.id,
      permissions,
      roles,
      [NpcType.TITAN, NpcType.HERO, NpcType.EVENT_HERO],
      limit ?? 5,
      normalizeKillStatsPeriod(period),
    );
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/stats/kills/npcs/:npcId/killers")
  @ApiOperation({
    summary: "Get killers ranking for a specific NPC",
    description:
      "Retrieves a ranking of members who killed a specific NPC, sorted by kill count.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "npcId", description: "NPC ID", example: "999" })
  @ZodResponse({
    status: 200,
    description: "NPC killers ranking",
    type: NpcKillersResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({
    status: 404,
    description: "NPC not found in guild kill stats",
  })
  async getNpcKillers(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guildData: Guild,
    @Param("npcId") npcId: string,
    @Query() query: GetNpcKillersDto,
  ) {
    const result = await this.killsService.getNpcKillers(
      guildData.id,
      permissions,
      roles,
      Number.parseInt(npcId, 10),
      query.limit ?? 50,
      query.world,
      query.period,
    );

    if (!result) {
      return { npc: null, killers: [] };
    }

    return result;
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/stats/kills/members/:memberId")
  @ApiOperation({
    summary: "Get kill statistics for a specific guild member",
    description:
      "Retrieves kill statistics for a specific member including overview and list of killed NPCs.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "memberId", description: "Member ID", example: "123" })
  @ZodResponse({
    status: 200,
    description: "Member kill statistics",
    type: MemberKillsResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({
    status: 404,
    description: "Member not found in guild",
  })
  async getMemberKills(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guildData: Guild,
    @Param("memberId") memberId: string,
    @Query() query: GetMemberKillsDto,
  ) {
    const result = await this.killsService.getMemberKills(
      guildData.id,
      Number.parseInt(memberId, 10),
      permissions,
      roles,
      query,
    );

    if (!result) {
      return { member: null, overview: null, npcs: [], pagination: null };
    }

    return result;
  }
}
