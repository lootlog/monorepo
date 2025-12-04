import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RequiredPermissions } from '@lootlog/nest-shared';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';
import { Permission } from '@lootlog/types';
import { ActivitiesService } from './activities.service';
import { ActivitiesQueryService } from './services/activities-query.service';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import { SuggestActorNamesDto } from './dto/suggest-actor-names.dto';
import { SuggestWorldsDto } from './dto/suggest-worlds.dto';
import { SuggestClanNamesDto } from './dto/suggest-clan-names.dto';
import {
  ActivityEntity,
  PaginatedActivitiesEntity,
} from './entities/activity.entity';

@ApiTags('guilds')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('guilds')
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly activitiesQueryService: ActivitiesQueryService,
  ) {}

  @Get(':guildId/activity-logs')
  @RequiredPermissions(Permission.ADMIN)
  @SerializeOptions({ type: PaginatedActivitiesEntity })
  @ApiOperation({ summary: 'Get activities for a specific guild' })
  @ApiResponse({ status: 200, type: PaginatedActivitiesEntity })
  findByGuild(
    @Param('guildId') guildId: string,
    @Query() query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    return this.activitiesQueryService.findByGuild(guildId, query);
  }

  @Get(':guildId/activity-logs/actor-name-suggestions')
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: 'Get actor name suggestions for a guild' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async suggestActorNames(
    @Param('guildId') guildId: string,
    @Query() query: SuggestActorNamesDto,
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.activitiesQueryService.suggestActorNames(
      guildId,
      query.search,
      query.limit,
    );

    return { suggestions };
  }

  @Get(':guildId/activity-logs/world-suggestions')
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: 'Get world suggestions for a guild' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        worlds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async suggestWorlds(
    @Param('guildId') guildId: string,
    @Query() query: SuggestWorldsDto,
  ): Promise<{ worlds: string[] }> {
    const worlds = await this.activitiesQueryService.suggestWorlds(
      guildId,
      query.search,
      query.limit,
    );

    return { worlds };
  }

  @Get(':guildId/activity-logs/clan-name-suggestions')
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: 'Get clan name suggestions for a guild' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  async suggestClanNames(
    @Param('guildId') guildId: string,
    @Query() query: SuggestClanNamesDto,
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.activitiesQueryService.suggestClanNames(
      guildId,
      query.search,
      query.limit,
    );

    return { suggestions };
  }

  @Get(':guildId/users/:userId/activity-logs')
  @RequiredPermissions(Permission.ADMIN)
  @SerializeOptions({ type: PaginatedActivitiesEntity })
  @ApiOperation({ summary: 'Get activities for a specific user in a guild' })
  @ApiResponse({ status: 200, type: PaginatedActivitiesEntity })
  findByUser(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Query() query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    return this.activitiesQueryService.findByUser(userId, guildId, query);
  }

  @Get(':guildId/activity-logs/:id')
  @RequiredPermissions(Permission.ADMIN)
  @SerializeOptions({ type: ActivityEntity })
  @ApiOperation({ summary: 'Get a single activity by ID' })
  @ApiResponse({ status: 200, type: ActivityEntity })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  findOne(
    @Param('guildId') guildId: string,
    @Param('id') id: string,
  ): Promise<ActivityEntity> {
    return this.activitiesQueryService.findOne(id, guildId);
  }

  @Delete(':guildId/activity-logs/:id')
  @RequiredPermissions(Permission.OWNER)
  @ApiOperation({ summary: 'Delete a specific activity by ID' })
  @ApiResponse({
    status: 200,
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async deleteActivity(
    @Param('guildId') guildId: string,
    @Param('id') id: string,
  ): Promise<{ count: number }> {
    const count = await this.activitiesService.deleteOne(id, guildId);
    return { count };
  }
}
