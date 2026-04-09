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
} from "@nestjs/swagger";
import { DiscordId, UserId } from "@lootlog/nest-shared";
import { plainToInstance } from "class-transformer";
import { type Guild, Permission, type Role } from "src/generated/prisma/client";
import { CreateCommentDto } from "src/loots/dto/create-comment-dto";
import { CreateLootDto } from "src/loots/dto/create-loot.dto";
import { UpdateLootDto } from "src/loots/dto/update-loot.dto";
import { FetchLootsParamsDto } from "src/loots/dto/fetch-loots-params.dto";
import { LootStatsQueryDto } from "src/loots/dto/loot-stats.dto";
import { LootsService } from "src/loots/loots.service";
import { LootStatsService } from "src/loots/services/loot-stats.service";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { MemberPermissions } from "src/shared/decorators/member-permissions.decorator";
import { MemberRoles } from "src/shared/decorators/member-roles.decorator";
import { AuthGuard } from "src/shared/guards/auth.guard";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";
import { LootEntity } from "src/shared/entities/loot.entity";
import { LootCommentEntity } from "src/shared/entities/loot-comment.entity";

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
    @Query() query: FetchLootsParamsDto,
  ) {
    const loots = await this.lootsService.fetchLootsByGuildId(
      guild,
      permissions,
      roles,
      query,
    );
    return plainToInstance(LootEntity, loots, {
      excludeExtraneousValues: true,
    });
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
  @ApiResponse({
    status: 200,
    description:
      "Loot statistics including overview, timeline, top NPCs, and top contributors",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getLootStats(@GuildData() guild: Guild, @Query() query: LootStatsQueryDto) {
    return this.lootStatsService.getLootStats(
      guild.id,
      query.period ?? "7d",
      query.world,
      query.npcTypes ? query.npcTypes.split(",") : undefined,
      query.excludeColossus ?? false,
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
    @Query() query: FetchLootsParamsDto,
  ) {
    const count = await this.lootsService.countLootsByGuildId(
      guild,
      permissions,
      roles,
      {
        ...query,
        limit: 0,
        cursor: 0,
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
    return plainToInstance(LootEntity, loot, { excludeExtraneousValues: true });
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
  createLoot(
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
    @Param("lootId", new ParseIntPipe()) lootId: number,
    @GuildData() guild: Guild,
  ) {
    const comments = await this.lootsService.getComments({
      lootId,
      guildId: guild.id,
    });
    return plainToInstance(LootCommentEntity, comments, {
      excludeExtraneousValues: true,
    });
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
    return plainToInstance(LootCommentEntity, comment, {
      excludeExtraneousValues: true,
    });
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
  deleteLoot(
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
  updateLoot(
    @DiscordId() discordId: string,
    @Body() body: UpdateLootDto,
    @Param("id", new ParseIntPipe()) lootId: number,
  ) {
    return this.lootsService.updateLoot(discordId, lootId, body);
  }
}
