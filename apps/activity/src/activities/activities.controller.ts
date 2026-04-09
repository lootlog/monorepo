import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard, RequiredPermissions } from "@lootlog/nest-shared";
import { Permission } from "@lootlog/types";
import { ZodResponse } from "nestjs-zod";
import { PermissionsGuard } from "src/shared/guards/permissions.guard";
import {
  ActivityResponseDto,
  ActorNameSuggestionsResponseDto,
  ClanNameSuggestionsResponseDto,
  DeleteActivityResponseDto,
  PaginatedActivitiesResponseDto,
  WorldSuggestionsResponseDto,
} from "./dto/activity-response.dto";
import { QueryActivitiesDto } from "./dto/query-activities.dto";
import { SuggestActorNamesDto } from "./dto/suggest-actor-names.dto";
import { SuggestClanNamesDto } from "./dto/suggest-clan-names.dto";
import { SuggestWorldsDto } from "./dto/suggest-worlds.dto";
import { ActivitiesService } from "./activities.service";
import { ActivitiesQueryService } from "./services/activities-query.service";

@ApiTags("guilds")
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller("guilds")
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly activitiesQueryService: ActivitiesQueryService,
  ) {}

  @Get(":guildId/activity-logs")
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: "Get activities for a specific guild" })
  @ZodResponse({ status: 200, type: PaginatedActivitiesResponseDto })
  findByGuild(
    @Param("guildId") guildId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    return this.activitiesQueryService.findByGuild(guildId, query);
  }

  @Get(":guildId/activity-logs/actor-name-suggestions")
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: "Get actor name suggestions for a guild" })
  @ZodResponse({ status: 200, type: ActorNameSuggestionsResponseDto })
  async suggestActorNames(
    @Param("guildId") guildId: string,
    @Query() query: SuggestActorNamesDto,
  ) {
    const suggestions = await this.activitiesQueryService.suggestActorNames(
      guildId,
      query.search,
      query.limit,
    );

    return { suggestions };
  }

  @Get(":guildId/activity-logs/world-suggestions")
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: "Get world suggestions for a guild" })
  @ZodResponse({ status: 200, type: WorldSuggestionsResponseDto })
  async suggestWorlds(
    @Param("guildId") guildId: string,
    @Query() query: SuggestWorldsDto,
  ) {
    const worlds = await this.activitiesQueryService.suggestWorlds(
      guildId,
      query.search,
      query.limit,
    );

    return { worlds };
  }

  @Get(":guildId/activity-logs/clan-name-suggestions")
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: "Get clan name suggestions for a guild" })
  @ZodResponse({ status: 200, type: ClanNameSuggestionsResponseDto })
  async suggestClanNames(
    @Param("guildId") guildId: string,
    @Query() query: SuggestClanNamesDto,
  ) {
    const suggestions = await this.activitiesQueryService.suggestClanNames(
      guildId,
      query.search,
      query.limit,
    );

    return { suggestions };
  }

  @Get(":guildId/users/:userId/activity-logs")
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: "Get activities for a specific user in a guild" })
  @ZodResponse({ status: 200, type: PaginatedActivitiesResponseDto })
  findByUser(
    @Param("guildId") guildId: string,
    @Param("userId") userId: string,
    @Query() query: QueryActivitiesDto,
  ) {
    return this.activitiesQueryService.findByUser(userId, guildId, query);
  }

  @Get(":guildId/activity-logs/:id")
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: "Get a single activity by ID" })
  @ZodResponse({ status: 200, type: ActivityResponseDto })
  @ApiResponse({ status: 404, description: "Activity not found" })
  findOne(@Param("guildId") guildId: string, @Param("id") id: string) {
    return this.activitiesQueryService.findOne(id, guildId);
  }

  @Delete(":guildId/activity-logs/:id")
  @RequiredPermissions(Permission.OWNER)
  @ApiOperation({ summary: "Delete a specific activity by ID" })
  @ZodResponse({ status: 200, type: DeleteActivityResponseDto })
  @ApiResponse({ status: 404, description: "Activity not found" })
  async deleteActivity(
    @Param("guildId") guildId: string,
    @Param("id") id: string,
  ) {
    const count = await this.activitiesService.deleteOne(id, guildId);
    return { count };
  }
}
