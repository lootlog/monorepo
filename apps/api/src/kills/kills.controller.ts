import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { Guild, Permission, type Role } from "generated/client";
import { DiscordId } from "src/shared/decorators/discord-id.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { KillsService } from "./kills.service";
import { CreateKillDto } from "./dto/create-kill.dto";
import {
  GetGuildKillStatsDto,
  GetUserKillStatsDto,
} from "./dto/get-kill-stats.dto";
import { GetUserNpcKillsDto } from "./dto/get-user-npc-kills.dto";
import {
  CreateKillResponseEntity,
  GuildKillStatsEntity,
  GuildTopNpcsEntity,
  GuildTopKillersByTypeEntity,
  NpcKillersResponseEntity,
  MemberKillsResponseEntity,
  UserKillStatsEntity,
  UserNpcKillsEntity,
} from "./entities/kill-stats.entity";
import { GetNpcKillersDto } from "./dto/get-npc-killers.dto";
import { GetMemberKillsDto } from "./dto/get-member-kills.dto";
import { NpcType } from "generated/client";
import { GuildData } from "src/shared/decorators/guild-data.decorator";

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
  @ApiResponse({
    status: 201,
    description: "Kill recorded successfully",
    type: CreateKillResponseEntity,
  })
  @ApiResponse({
    status: 400,
    description: "Validation error",
  })
  async createKill(
    @Body() data: CreateKillDto,
    @DiscordId() discordId: string,
  ) {
    const result = await this.killsService.createKill(discordId, data);
    return plainToInstance(CreateKillResponseEntity, result);
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
  @ApiResponse({
    status: 200,
    description: "Guild kill statistics",
    type: GuildKillStatsEntity,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async getGuildKillStats(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @Query() query: GetGuildKillStatsDto,
    @GuildData() guildData: Guild,
  ) {
    const stats = await this.killsService.getGuildKillStats(
      guildData.id,
      permissions,
      roles,
      query,
    );
    return plainToInstance(GuildKillStatsEntity, stats);
  }

  @Get("/users/@me/stats/kills")
  @ApiOperation({
    summary: "Get personal kill statistics",
    description:
      "Retrieves kill statistics for the authenticated user across all guilds, deduplicated.",
  })
  @ApiResponse({
    status: 200,
    description: "User kill statistics",
    type: UserKillStatsEntity,
  })
  async getUserKillStats(
    @DiscordId() discordId: string,
    @Query() query: GetUserKillStatsDto,
  ) {
    const stats = await this.killsService.getUserKillStats(discordId, query);
    return plainToInstance(UserKillStatsEntity, stats);
  }

  @Get("/users/@me/kills/npcs")
  @ApiOperation({
    summary: "Get paginated list of killed NPCs",
    description:
      "Retrieves a paginated, searchable list of NPCs killed by the authenticated user.",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of killed NPCs",
    type: UserNpcKillsEntity,
  })
  async getUserNpcKills(
    @DiscordId() discordId: string,
    @Query() query: GetUserNpcKillsDto,
  ) {
    const result = await this.killsService.getUserNpcKills(discordId, query);
    return plainToInstance(UserNpcKillsEntity, result);
  }

  @Permissions(Permission.LOOTLOG_ACCESS)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/stats/kills/top-npcs")
  @ApiOperation({
    summary: "Get top killed NPCs in guild",
    description: "Retrieves the most frequently killed NPCs in a guild.",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiResponse({
    status: 200,
    description: "Top killed NPCs",
    type: GuildTopNpcsEntity,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async getGuildTopNpcs(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guildData: Guild,
    @Query("limit") limit?: number,
    @Query("npcType") npcType?: NpcType,
    @Query("world") world?: string,
    @Query("search") search?: string,
    @Query("minLvl") minLvl?: string,
    @Query("maxLvl") maxLvl?: string,
  ) {
    const result = await this.killsService.getGuildTopNpcs(
      guildData.id,
      permissions,
      roles,
      limit ?? 10,
      npcType,
      world,
      search,
      minLvl ? Number.parseInt(minLvl, 10) : undefined,
      maxLvl ? Number.parseInt(maxLvl, 10) : undefined,
    );
    return plainToInstance(GuildTopNpcsEntity, result);
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
  @ApiResponse({
    status: 200,
    description: "Top killers by NPC type",
    type: GuildTopKillersByTypeEntity,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async getGuildTopKillersByType(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guildData: Guild,
    @Query("limit") limit?: number,
  ) {
    const result = await this.killsService.getGuildTopKillersByType(
      guildData.id,
      permissions,
      roles,
      [NpcType.TITAN, NpcType.HERO, NpcType.EVENT_HERO],
      limit ?? 5,
    );
    return plainToInstance(GuildTopKillersByTypeEntity, result);
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
  @ApiResponse({
    status: 200,
    description: "NPC killers ranking",
    type: NpcKillersResponseEntity,
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
    );

    if (!result) {
      return { npc: null, killers: [] };
    }

    return plainToInstance(NpcKillersResponseEntity, result);
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
  @ApiResponse({
    status: 200,
    description: "Member kill statistics",
    type: MemberKillsResponseEntity,
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

    return plainToInstance(MemberKillsResponseEntity, result);
  }
}
