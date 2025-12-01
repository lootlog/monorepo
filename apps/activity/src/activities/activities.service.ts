import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/db/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { QueryActivitiesDto } from './dto/query-activities.dto';
import {
  ActivityEntity,
  PaginatedActivitiesEntity,
} from './entities/activity.entity';
import { createHash } from 'node:crypto';
import { ActivityType, Prisma } from '../../prisma/generated/client';

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateActivityDto): Promise<ActivityEntity> {
    let actorSnapshotId: string | undefined;
    if (dto.actorSnapshot) {
      actorSnapshotId = await this.findOrCreateActorSnapshot(
        dto.actorSnapshot,
        dto.source,
      );
    }

    try {
      const activity = await this.prisma.activity.create({
        data: {
          userId: dto.userId,
          guildId: dto.guildId,
          discordId: dto.discordId,
          type: dto.type,
          source: dto.source,
          idempotencyKey: dto.idempotencyKey,
          details: dto.details
            ? (dto.details as Prisma.InputJsonValue)
            : undefined,
          actorSnapshotId,
          lootContext: dto.lootContext
            ? {
                create: {
                  lootId: dto.lootContext.lootId,
                  actorSnapshotId: actorSnapshotId!,
                },
              }
            : undefined,
          timerContext: dto.timerContext
            ? {
                create: {
                  npcName: dto.timerContext.npcName,
                  actorSnapshotId: actorSnapshotId!,
                },
              }
            : undefined,
        },
        include: {
          actorSnapshot: true,
          lootContext: {
            include: {
              actorSnapshot: true,
            },
          },
          timerContext: {
            include: {
              actorSnapshot: true,
            },
          },
        },
      });

      this.logger.log(
        `Activity created: ${activity.id} (type: ${activity.type}, userId: ${activity.userId})`,
      );

      return new ActivityEntity({
        ...activity,
        details: activity.details as Record<string, unknown> | undefined,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          `Duplicate activity detected via idempotency key: ${dto.idempotencyKey}`,
        );

        const existing = await this.prisma.activity.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          include: {
            actorSnapshot: true,
            lootContext: {
              include: {
                actorSnapshot: true,
              },
            },
            timerContext: {
              include: {
                actorSnapshot: true,
              },
            },
          },
        });

        if (!existing) {
          throw error;
        }

        return new ActivityEntity({
          ...existing,
          details: existing.details as Record<string, unknown> | undefined,
        });
      }

      throw error;
    }
  }

  async findMany(
    query: QueryActivitiesDto,
  ): Promise<PaginatedActivitiesEntity> {
    const limit = Math.min(query.limit ?? 50, 100);
    const where: Parameters<typeof this.prisma.activity.findMany>[0]['where'] =
      {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.guildId) {
      where.guildId = query.guildId;
    }

    if (query.type) {
      where.type = query.type;
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
        lootContext: {
          include: {
            actorSnapshot: true,
          },
        },
        timerContext: {
          include: {
            actorSnapshot: true,
          },
        },
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

  async findOne(id: string, guildId: string): Promise<ActivityEntity> {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        guildId,
      },
      include: {
        actorSnapshot: true,
        lootContext: {
          include: {
            actorSnapshot: true,
          },
        },
        timerContext: {
          include: {
            actorSnapshot: true,
          },
        },
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

  async deleteOne(id: string, guildId: string): Promise<number> {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id,
        guildId,
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    await this.prisma.activity.delete({
      where: { id },
    });

    this.logger.log(
      `Deleted activity ${id} (type: ${activity.type}) for guild ${guildId}`,
    );

    return 1;
  }

  async deleteMany(guildId: string, type?: ActivityType): Promise<number> {
    const result = await this.prisma.activity.deleteMany({
      where: {
        guildId,
        type,
      },
    });

    this.logger.log(
      `Deleted ${result.count} activities for guild ${guildId}${type ? ` with type ${type}` : ''}`,
    );

    return result.count;
  }

  async getStatsByGuild(
    guildId: string,
  ): Promise<Record<ActivityType, number>> {
    const stats = await this.prisma.activity.groupBy({
      by: ['type'],
      where: { guildId },
      _count: { type: true },
    });

    return stats.reduce(
      (acc, stat) => {
        acc[stat.type] = stat._count.type;
        return acc;
      },
      {} as Record<ActivityType, number>,
    );
  }

  private async findOrCreateActorSnapshot(
    snapshot: CreateActivityDto['actorSnapshot'],
    source: CreateActivityDto['source'],
  ): Promise<string> {
    if (!snapshot) {
      throw new Error('Actor snapshot is required');
    }

    const fingerprint = this.generateFingerprint(snapshot, source);

    const existing = await this.prisma.activityActorSnapshot.findUnique({
      where: { fingerprint },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    const created = await this.prisma.activityActorSnapshot.create({
      data: {
        accountId: snapshot.accountId,
        characterId: snapshot.characterId,
        clanName: snapshot.clanName,
        clanId: snapshot.clanId,
        icon: snapshot.icon,
        lvl: snapshot.lvl,
        prof: snapshot.prof,
        source,
        fingerprint,
      },
      select: { id: true },
    });

    this.logger.debug(`Created new actor snapshot: ${created.id}`);

    return created.id;
  }

  private generateFingerprint(
    snapshot: CreateActivityDto['actorSnapshot'],
    source: CreateActivityDto['source'],
  ): string {
    const data = JSON.stringify({
      accountId: snapshot.accountId,
      characterId: snapshot.characterId,
      clanName: snapshot.clanName,
      clanId: snapshot.clanId,
      icon: snapshot.icon,
      lvl: snapshot.lvl,
      prof: snapshot.prof,
      source,
    });

    return createHash('sha256').update(data).digest('hex');
  }

}
