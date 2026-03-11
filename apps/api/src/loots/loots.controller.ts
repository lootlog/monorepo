import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
  ApiQuery,
} from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { type Guild, Permission, type Role } from "generated/client";
import { CreateCommentDto } from "src/loots/dto/create-comment-dto";
import { CreateLootDto } from "src/loots/dto/create-loot.dto";
import { UpdateLootDto } from "src/loots/dto/update-loot.dto";
import { LootStatsQueryDto } from "src/loots/dto/loot-stats.dto";
import { LootsService } from "src/loots/loots.service";
import { LootStatsService } from "src/loots/services/loot-stats.service";
import { DiscordId } from "src/shared/decorators/discord-id.decorator";
import { UserId } from "src/shared/decorators/user-id.decorator";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { ArrayValidationPipe } from "src/shared/pipes/array-validation.pipe";
import { LootEntity } from "src/shared/entities/loot.entity";
import { LootCommentEntity } from "src/shared/entities/loot-comment.entity";
import type { Period } from "src/loots/dto/loot-stats.dto";

@ApiTags("loots")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class LootsController {
  constructor(
    private readonly lootsService: LootsService,
    private readonly lootStatsService: LootStatsService,
  ) {}

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots")
  @ApiOperation({
    summary: "Get guild loots",
    description: "Retrieve paginated loots for a guild with optional filters",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiQuery({
    name: "cursor",
    description: "Pagination cursor",
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "Number of results per page",
    required: false,
  })
  @ApiQuery({
    name: "world",
    description: "World name filter",
    required: false,
  })
  @ApiQuery({
    name: "npcTypes",
    description: "NPC types filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "rarities",
    description: "Item rarities filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "players",
    description: "Player names filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "npcs",
    description: "NPC names filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "npcLevelMin",
    description: "Minimum NPC level filter",
    required: false,
  })
  @ApiQuery({
    name: "npcLevelMax",
    description: "Maximum NPC level filter",
    required: false,
  })
  @ApiQuery({
    name: "itemLevelMin",
    description: "Minimum item level filter",
    required: false,
  })
  @ApiQuery({
    name: "itemLevelMax",
    description: "Maximum item level filter",
    required: false,
  })
  @ApiQuery({
    name: "playerLevelMin",
    description: "Minimum player level filter",
    required: false,
  })
  @ApiQuery({
    name: "playerLevelMax",
    description: "Maximum player level filter",
    required: false,
  })
  @ApiQuery({
    name: "search",
    description: "Search term for loots, items, NPCs or players",
    required: false,
  })
  @ApiQuery({
    name: "hid",
    required: false,
    type: String,
    description: "house id or similar",
  })
  @ApiQuery({
    name: "itemNames",
    required: false,
    type: [String],
    description: "filter by item names",
  })
  @ApiQuery({
    name: "createdAtMin",
    description: "Minimum creation date filter (ISO 8601)",
    required: false,
  })
  @ApiQuery({
    name: "createdAtMax",
    description: "Maximum creation date filter (ISO 8601)",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of loots",
    type: [LootEntity],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async fetchLootsByGuildId(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
    @Query("cursor") cursor: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number,
    @Query("world") world: string,
    @Query("npcTypes", new ArrayValidationPipe())
    npcTypes: string[],
    @Query("rarities", new ArrayValidationPipe())
    rarities: string[],
    @Query("players", new ArrayValidationPipe())
    players: string[],
    @Query("npcs", new ArrayValidationPipe())
    npcs: string[],
    @Query("npcLevelMin", new ParseIntPipe({ optional: true }))
    npcLevelMin?: number,
    @Query("npcLevelMax", new ParseIntPipe({ optional: true }))
    npcLevelMax?: number,
    @Query("itemLevelMin", new ParseIntPipe({ optional: true }))
    itemLevelMin?: number,
    @Query("itemLevelMax", new ParseIntPipe({ optional: true }))
    itemLevelMax?: number,
    @Query("playerLevelMin", new ParseIntPipe({ optional: true }))
    playerLevelMin?: number,
    @Query("playerLevelMax", new ParseIntPipe({ optional: true }))
    playerLevelMax?: number,
    @Query("search") search?: string,
    @Query("hid") hid?: string,
    @Query("itemNames", new ArrayValidationPipe())
    itemNames?: string[],
    @Query("createdAtMin") createdAtMin?: string,
    @Query("createdAtMax") createdAtMax?: string,
  ) {
    const loots = await this.lootsService.fetchLootsByGuildId(
      guild,
      permissions,
      roles,
      {
        cursor,
        limit,
        npcTypes,
        rarities,
        players,
        npcs,
        world,
        npcLevelMin,
        npcLevelMax,
        itemLevelMin,
        itemLevelMax,
        playerLevelMin,
        playerLevelMax,
        search,
        hid,
        itemNames,
        createdAtMin,
        createdAtMax,
      },
    );
    return plainToInstance(LootEntity, loots);
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/stats")
  @ApiOperation({
    summary: "Get guild loot statistics",
    description:
      "Retrieve aggregated loot statistics for a guild with optional time period and filters",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiQuery({
    name: "period",
    description: "Time period for statistics",
    required: false,
    enum: ["24h", "3d", "7d", "14d", "30d", "90d", "180d", "all"],
  })
  @ApiQuery({
    name: "world",
    description: "World name filter",
    required: false,
  })
  @ApiQuery({
    name: "npcTypes",
    description: "NPC types filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "excludeColossus",
    description: "Exclude COLOSSUS NPCs from statistics",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description:
      "Loot statistics including overview, timeline, top NPCs, and top contributors",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async getLootStats(
    @GuildData() guild: Guild,
    @Query("period") period?: Period,
    @Query("world") world?: string,
    @Query("npcTypes", new ArrayValidationPipe()) npcTypes?: string[],
    @Query("excludeColossus") excludeColossus?: string,
  ) {
    return this.lootStatsService.getLootStats(
      guild.id,
      period ?? "7d",
      world,
      npcTypes,
      excludeColossus === "true",
    );
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/count")
  @ApiOperation({
    summary: "Get guild loots count",
    description:
      "Retrieve the total count of loots for a guild with optional filters",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiQuery({
    name: "world",
    description: "World name filter",
    required: false,
  })
  @ApiQuery({
    name: "npcTypes",
    description: "NPC types filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "rarities",
    description: "Item rarities filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "players",
    description: "Player names filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "npcs",
    description: "NPC names filter (comma-separated)",
    required: false,
  })
  @ApiQuery({
    name: "npcLevelMin",
    description: "Minimum NPC level filter",
    required: false,
  })
  @ApiQuery({
    name: "npcLevelMax",
    description: "Maximum NPC level filter",
    required: false,
  })
  @ApiQuery({
    name: "itemLevelMin",
    description: "Minimum item level filter",
    required: false,
  })
  @ApiQuery({
    name: "itemLevelMax",
    description: "Maximum item level filter",
    required: false,
  })
  @ApiQuery({
    name: "playerLevelMin",
    description: "Minimum player level filter",
    required: false,
  })
  @ApiQuery({
    name: "playerLevelMax",
    description: "Maximum player level filter",
    required: false,
  })
  @ApiQuery({
    name: "search",
    description: "Search term for loots, items, NPCs or players",
    required: false,
  })
  @ApiQuery({
    name: "hid",
    required: false,
    type: String,
    description: "house id or similar",
  })
  @ApiQuery({
    name: "itemNames",
    required: false,
    type: [String],
    description: "filter by item names",
  })
  @ApiQuery({
    name: "createdAtMin",
    description: "Minimum creation date filter (ISO 8601)",
    required: false,
  })
  @ApiQuery({
    name: "createdAtMax",
    description: "Maximum creation date filter (ISO 8601)",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Count of loots matching the filters",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async countLootsByGuildId(
    @MemberPermissions() permissions: Permission[],
    @MemberRoles() roles: Role[],
    @GuildData() guild: Guild,
    @Query("world") world: string,
    @Query("npcTypes", new ArrayValidationPipe())
    npcTypes: string[],
    @Query("rarities", new ArrayValidationPipe())
    rarities: string[],
    @Query("players", new ArrayValidationPipe())
    players: string[],
    @Query("npcs", new ArrayValidationPipe())
    npcs: string[],
    @Query("npcLevelMin", new ParseIntPipe({ optional: true }))
    npcLevelMin?: number,
    @Query("npcLevelMax", new ParseIntPipe({ optional: true }))
    npcLevelMax?: number,
    @Query("itemLevelMin", new ParseIntPipe({ optional: true }))
    itemLevelMin?: number,
    @Query("itemLevelMax", new ParseIntPipe({ optional: true }))
    itemLevelMax?: number,
    @Query("playerLevelMin", new ParseIntPipe({ optional: true }))
    playerLevelMin?: number,
    @Query("playerLevelMax", new ParseIntPipe({ optional: true }))
    playerLevelMax?: number,
    @Query("search") search?: string,
    @Query("hid") hid?: string,
    @Query("itemNames", new ArrayValidationPipe())
    itemNames?: string[],
    @Query("createdAtMin") createdAtMin?: string,
    @Query("createdAtMax") createdAtMax?: string,
  ) {
    const count = await this.lootsService.countLootsByGuildId(
      guild,
      permissions,
      roles,
      {
        limit: 0,
        cursor: 0,
        npcTypes,
        rarities,
        players,
        npcs,
        world,
        npcLevelMin,
        npcLevelMax,
        itemLevelMin,
        itemLevelMax,
        playerLevelMin,
        playerLevelMax,
        search,
        hid,
        itemNames,
        createdAtMin,
        createdAtMax,
      },
    );
    return { count };
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/:lootId")
  @ApiOperation({
    summary: "Get single loot",
    description: "Retrieve a single loot by ID",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ApiResponse({
    status: 200,
    description: "Loot details",
    type: LootEntity,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  async fetchLootById(
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @GuildData() guild: Guild,
  ) {
    const loot = await this.lootsService.fetchLootById(guild, lootId);
    if (!loot) {
      return null;
    }
    return plainToInstance(LootEntity, loot);
  }

  @Post("/loots")
  @ApiOperation({
    summary: "Create loot",
    description: "Submit a loot from game client",
  })
  @ApiResponse({
    status: 201,
    description: "Loot created successfully",
    type: LootEntity,
  })
  async createLoot(
    @DiscordId() discordId: string,
    @UserId() userId: string,
    @Body() body: CreateLootDto,
  ) {
    return this.lootsService.createLoot(discordId, userId, body);
  }

  @Permissions(Permission.LOOTLOG_LOOTS_READ)
  @UseGuards(PermissionsGuard)
  @Get("/guilds/:guildId/loots/:lootId/comments")
  @ApiOperation({
    summary: "Get loot comments",
    description: "Retrieve comments for a specific loot",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ApiResponse({
    status: 200,
    description: "List of loot comments",
    type: [LootCommentEntity],
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  async getComments(
    @DiscordId() discordId: string,
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @GuildData() guild: Guild,
  ) {
    const comments = await this.lootsService.getComments({
      discordId,
      lootId,
      guildId: guild.id,
    });
    return plainToInstance(LootCommentEntity, comments);
  }

  @Permissions(Permission.LOOTLOG_LOOTS_WRITE)
  @UseGuards(PermissionsGuard)
  @Post("/guilds/:guildId/loots/:lootId/comments")
  @ApiOperation({
    summary: "Create loot comment",
    description: "Add a comment to a loot",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ApiResponse({
    status: 201,
    description: "Comment created successfully",
    type: LootCommentEntity,
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  async createComment(
    @DiscordId() discordId: string,
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @Body() body: CreateCommentDto,
    @GuildData() guild: Guild,
  ) {
    const comment = await this.lootsService.createComment({
      discordId,
      lootId,
      body,
      guildId: guild.id,
    });
    return plainToInstance(LootCommentEntity, comment);
  }

  @Permissions(Permission.ADMIN, Permission.LOOTLOG_MANAGE)
  @UseGuards(PermissionsGuard)
  @Delete("/guilds/:guildId/loots/:lootId")
  @ApiOperation({
    summary: "Delete loot",
    description: "Delete a loot entry",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({ name: "lootId", description: "Loot ID", example: "123" })
  @ApiResponse({
    status: 200,
    description: "Loot deleted successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - admin or manage permission required",
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  async deleteLoot(
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @GuildData() guild: Guild,
  ) {
    return this.lootsService.deleteLoot({
      guildId: guild.id,
      lootId,
    });
  }

  @Patch("/loots/:id")
  @ApiOperation({
    summary: "Update loot",
    description: "Update loot information",
  })
  @ApiParam({ name: "id", description: "Loot ID", example: "123" })
  @ApiResponse({
    status: 200,
    description: "Loot updated successfully",
    type: LootEntity,
  })
  @ApiResponse({ status: 404, description: "Loot not found" })
  async updateLoot(
    @DiscordId() discordId: string,
    @Body() body: UpdateLootDto,
    @Param("id", new ParseIntPipe()) lootId: number,
  ) {
    return this.lootsService.updateLoot(discordId, lootId, body);
  }
}
