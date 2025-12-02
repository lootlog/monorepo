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
  async findByGuild(
    @Param('guildId') guildId: string,
    @Query() query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    return this.activitiesQueryService.findByGuild(guildId, query);
  }

  @Get(':guildId/users/:userId/activity-logs')
  @RequiredPermissions(Permission.ADMIN)
  @SerializeOptions({ type: PaginatedActivitiesEntity })
  @ApiOperation({ summary: 'Get activities for a specific user in a guild' })
  @ApiResponse({ status: 200, type: PaginatedActivitiesEntity })
  async findByUser(
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
  async findOne(
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
