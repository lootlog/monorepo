import { createHash } from "node:crypto";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ActivityType, Prisma } from "#src/generated/prisma/client";
import { PrismaService } from "#src/shared/db/prisma.service";
import { CreateActivityDto } from "./dto/create-activity.dto.js";
import { mapActivityDetails } from "./utils/map-activity-details.js";

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateActivityDto) {
    let actorSnapshotId: string | undefined;
    if (dto.actorSnapshot) {
      actorSnapshotId = await this.findOrCreateActorSnapshot(
        dto.actorSnapshot,
        dto.source,
      );
    }

    try {
      const activity = await this.prisma.$transaction(async (tx) => {
        const createdActivity = await tx.activity.create({
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

        await this.updateMemberActivityStats(tx, dto);

        return createdActivity;
      });

      return {
        ...activity,
        actorSnapshot: activity.actorSnapshot ?? undefined,
        details: mapActivityDetails(activity.details),
      };
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

        return {
          ...existing,
          actorSnapshot: existing.actorSnapshot ?? undefined,
          details: mapActivityDetails(existing.details),
        };
      }

      throw error;
    }
  }

  private async updateMemberActivityStats(
    tx: Prisma.TransactionClient,
    dto: CreateActivityDto,
  ): Promise<void> {
    if (dto.type === ActivityType.CONNECT_EVENT) {
      await this.updateMemberActivityStatsForConnect(tx, dto);
      return;
    }

    if (dto.type === ActivityType.DISCONNECT_EVENT) {
      await this.updateMemberActivityStatsForDisconnect(tx, dto);
    }
  }

  private async updateMemberActivityStatsForConnect(
    tx: Prisma.TransactionClient,
    dto: CreateActivityDto,
  ): Promise<void> {
    const sessionId = this.getActivitySessionId(dto);
    const lastSeenAt = new Date();
    const createdSession = await tx.memberActivitySession.createMany({
      data: {
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
        sessionId,
        userId: dto.userId,
        userAgent: this.getDetailsString(dto, "userAgent"),
        world: dto.world,
        lastSeenAt,
      },
      skipDuplicates: true,
    });
    const activeSessionCount = await tx.memberActivitySession.count({
      where: {
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
      },
    });
    const visitCountIncrement = createdSession.count;

    await tx.memberActivityStats.upsert({
      where: {
        guildId_discordId_source: {
          guildId: dto.guildId,
          discordId: dto.discordId,
          source: dto.source,
        },
      },
      update: {
        lastSeenAt,
        ...(visitCountIncrement > 0
          ? { visitCount: { increment: visitCountIncrement } }
          : {}),
        activeSessionCount,
      },
      create: {
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
        lastSeenAt,
        visitCount: visitCountIncrement,
        activeSessionCount,
      },
    });
  }

  private async updateMemberActivityStatsForDisconnect(
    tx: Prisma.TransactionClient,
    dto: CreateActivityDto,
  ): Promise<void> {
    const sessionId = this.getActivitySessionId(dto);

    await tx.memberActivitySession.deleteMany({
      where: {
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
        sessionId,
      },
    });
    const activeSessionCount = await tx.memberActivitySession.count({
      where: {
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
      },
    });

    await tx.memberActivityStats.updateMany({
      where: {
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
      },
      data: {
        activeSessionCount,
      },
    });
  }

  async clearActiveSessionsForMember(member: {
    guildId: string;
    discordId: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.memberActivitySession.deleteMany({
        where: {
          guildId: member.guildId,
          discordId: member.discordId,
        },
      });

      await tx.memberActivityStats.updateMany({
        where: {
          guildId: member.guildId,
          discordId: member.discordId,
          activeSessionCount: { gt: 0 },
        },
        data: {
          activeSessionCount: 0,
        },
      });
    });
  }

  private getActivitySessionId(dto: CreateActivityDto): string {
    const sessionId = this.getDetailsString(dto, "sessionId");

    if (!sessionId) {
      throw new Error(
        `${dto.type} activity for ${dto.discordId} in ${dto.guildId} is missing details.sessionId`,
      );
    }

    return sessionId;
  }

  private getDetailsString(
    dto: CreateActivityDto,
    key: string,
  ): string | undefined {
    const details = dto.details;

    if (!details || Array.isArray(details) || typeof details !== "object") {
      return undefined;
    }

    const value = details[key];

    return typeof value === "string" && value.length > 0 ? value : undefined;
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
