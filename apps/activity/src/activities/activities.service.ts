import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/shared/db/prisma.service";
import { CreateActivityDto } from "./dto/create-activity.dto";
import { ActivityEntity } from "./entities/activity.entity";
import { createHash } from "node:crypto";
import { ActivityType, Prisma } from "src/generated/prisma/client";

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
          world: dto.world,
          details: dto.details
            ? (dto.details as Prisma.InputJsonValue)
            : undefined,
          actorSnapshotId,
        },
        include: {
          actorSnapshot: true,
        },
      });

      return new ActivityEntity({
        ...activity,
        details: activity.details as Record<string, unknown> | undefined,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        this.logger.log(
          `Duplicate activity detected via idempotency key: ${dto.idempotencyKey}`,
        );

        const existing = await this.prisma.activity.findFirst({
          where: { idempotencyKey: dto.idempotencyKey },
          include: {
            actorSnapshot: true,
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
      where: {
        id_createdAt: {
          id: activity.id,
          createdAt: activity.createdAt,
        },
      },
    });

    return 1;
  }

  async deleteMany(guildId: string, type?: ActivityType): Promise<number> {
    const result = await this.prisma.activity.deleteMany({
      where: {
        guildId,
        type,
      },
    });

    return result.count;
  }

  async getStatsByGuild(
    guildId: string,
  ): Promise<Record<ActivityType, number>> {
    const stats = await this.prisma.activity.groupBy({
      by: ["type"],
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
    snapshot: CreateActivityDto["actorSnapshot"],
    source: CreateActivityDto["source"],
  ): Promise<string> {
    if (!snapshot) {
      throw new Error("Actor snapshot is required");
    }

    const fingerprint = this.generateFingerprint(snapshot, source);

    try {
      const actorSnapshot = await this.prisma.activityActorSnapshot.upsert({
        where: { fingerprint },
        update: {},
        create: {
          accountId: snapshot.accountId,
          characterId: snapshot.characterId,
          clanName: snapshot.clanName,
          clanId: snapshot.clanId,
          name: snapshot.name,
          icon: snapshot.icon,
          lvl: snapshot.lvl,
          prof: snapshot.prof,
          source,
          fingerprint,
        },
        select: { id: true },
      });

      return actorSnapshot.id;
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to create or find actor snapshot",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private generateFingerprint(
    snapshot: CreateActivityDto["actorSnapshot"],
    source: CreateActivityDto["source"],
  ): string {
    const data = JSON.stringify({
      accountId: snapshot.accountId,
      characterId: snapshot.characterId,
      clanName: snapshot.clanName,
      clanId: snapshot.clanId,
      name: snapshot.name,
      icon: snapshot.icon,
      lvl: snapshot.lvl,
      prof: snapshot.prof,
      source,
    });

    return createHash("sha256").update(data).digest("hex");
  }
}
