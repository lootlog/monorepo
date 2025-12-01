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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard, RequiredPermissions } from '@lootlog/nest-shared';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';
import { Permission } from '@lootlog/types';
import { ActivitiesService } from './activities.service';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import {
  ActivityEntity,
  PaginatedActivitiesEntity,
} from './entities/activity.entity';
import { ActivityType } from '../../prisma/generated/client';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('guilds/:guildId')
  @RequiredPermissions(Permission.ADMIN)
  @SerializeOptions({ type: PaginatedActivitiesEntity })
  @ApiOperation({ summary: 'Get activities for a specific guild' })
  @ApiResponse({ status: 200, type: PaginatedActivitiesEntity })
  async findByGuild(
    @Param('guildId') guildId: string,
    @Query() query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    return this.activitiesService.findByGuild(guildId, query);
  }

  @Get('guilds/:guildId/users/:userId')
  @RequiredPermissions(Permission.ADMIN)
  @SerializeOptions({ type: PaginatedActivitiesEntity })
  @ApiOperation({ summary: 'Get activities for a specific user in a guild' })
  @ApiResponse({ status: 200, type: PaginatedActivitiesEntity })
  async findByUser(
    @Param('guildId') guildId: string,
    @Param('userId') userId: string,
    @Query() query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    return this.activitiesService.findByUser(userId, guildId, query);
  }

  @Get('guilds/:guildId/stats')
  @RequiredPermissions(Permission.ADMIN)
  @ApiOperation({ summary: 'Get activity statistics for a guild' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      additionalProperties: { type: 'number' },
    },
  })
  async getStatsByGuild(
    @Param('guildId') guildId: string,
  ): Promise<Record<ActivityType, number>> {
    return this.activitiesService.getStatsByGuild(guildId);
  }

  @Get('guilds/:guildId/activities/:id')
  @RequiredPermissions(Permission.ADMIN)
  @SerializeOptions({ type: ActivityEntity })
  @ApiOperation({ summary: 'Get a single activity by ID' })
  @ApiResponse({ status: 200, type: ActivityEntity })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async findOne(
    @Param('guildId') guildId: string,
    @Param('id') id: string,
  ): Promise<ActivityEntity> {
    return this.activitiesService.findOne(id, guildId);
  }

  @Delete('guilds/:guildId')
  @RequiredPermissions(Permission.OWNER)
  @ApiOperation({ summary: 'Delete all activities for a guild' })
  @ApiQuery({ name: 'type', enum: ActivityType, required: false })
  @ApiResponse({
    status: 200,
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  async deleteByGuild(
    @Param('guildId') guildId: string,
    @Query('type') type?: ActivityType,
  ): Promise<{ count: number }> {
    const count = await this.activitiesService.deleteMany(guildId, type);
    return { count };
  }
}
