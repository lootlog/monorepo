import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/shared/db/prisma.service';
import { QueryActivitiesDto } from '../dto/query-activities.dto';
import {
  ActivityEntity,
  PaginatedActivitiesEntity,
} from '../entities/activity.entity';
import type { Prisma } from '../../../prisma/generated/client';

@Injectable()
export class ActivitiesQueryService {
  private readonly logger = new Logger(ActivitiesQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    const limit = Math.min(query.limit ?? 50, 100);
    const where: Prisma.ActivityWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.guildId) {
      where.guildId = query.guildId;
    }

    if (query.type && query.type.length > 0) {
      where.type = { in: query.type };
    }

    if (query.source && query.source.length > 0) {
      where.source = { in: query.source };
    }

    if (query.world) {
      where.world = {
        contains: query.world,
        mode: 'insensitive',
      };
    }

    if (query.playerName) {
      where.actorSnapshot = {
        name: {
          contains: query.playerName,
          mode: 'insensitive',
        },
      };
    }

    if (query.startDate ?? query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    if (query.cursor) {
      where.id = { lt: query.cursor };
    }

    const activities = await this.prisma.activity.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        actorSnapshot: true,
      },
    });

    const hasMore = activities.length > limit;
    const data = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    return new PaginatedActivitiesEntity({
      data: data.map(
        (activity) =>
          new ActivityEntity({
            ...activity,
            details: activity.details as Record<string, unknown> | undefined,
          }),
      ),
      nextCursor,
      hasMore,
    });
  }

  async findByGuild(
    guildId: string,
    query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    return this.findMany({ ...query, guildId });
  }

  async findByUser(
    userId: string,
    guildId: string,
    query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    return this.findMany({ ...query, userId, guildId });
  }

  async findOne(id: string, guildId: string): Promise<ActivityEntity> {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        guildId,
      },
      include: {
        actorSnapshot: true,
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    return new ActivityEntity({
      ...activity,
      details: activity.details as Record<string, unknown> | undefined,
    });
  }
}
