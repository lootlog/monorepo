import { createHash } from "node:crypto";
import type { Logger } from "winston";
import { Prisma, type ActivityType } from "../generated/prisma/client.js";
import { NotFoundError } from "../lib/errors/http-errors.js";
import { PrismaDatabase } from "../shared/prisma/prisma-database.js";
import type { CreateActivitySchema } from "./schemas/create-activity.schema.js";

function mapActivityDetails(
  details: unknown,
): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return undefined;
  }

  return details as Record<string, unknown>;
}

export class ActivityStore {
  constructor(
    private readonly prismaDatabase: PrismaDatabase,
    private readonly logger: Logger,
  ) {}

  async create(activityData: CreateActivitySchema) {
    let actorSnapshotId: string | undefined;

    if (activityData.actorSnapshot) {
      actorSnapshotId = await this.findOrCreateActorSnapshot(
        activityData.actorSnapshot,
        activityData.source,
      );
    }

    try {
      const activity = await this.prismaDatabase.activity.create({
        data: {
          userId: activityData.userId,
          guildId: activityData.guildId,
          discordId: activityData.discordId,
          type: activityData.type,
          source: activityData.source,
          idempotencyKey: activityData.idempotencyKey,
          world: activityData.world,
          details: activityData.details as Prisma.InputJsonValue | undefined,
          actorSnapshotId,
        },
        include: {
          actorSnapshot: true,
        },
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
        this.logger.info("Duplicate activity detected via idempotency key", {
          idempotencyKey: activityData.idempotencyKey,
        });

        const existingActivity = await this.prismaDatabase.activity.findFirst({
          where: {
            idempotencyKey: activityData.idempotencyKey,
          },
          include: {
            actorSnapshot: true,
          },
        });

        if (!existingActivity) {
          throw error;
        }

        return {
          ...existingActivity,
          actorSnapshot: existingActivity.actorSnapshot ?? undefined,
          details: mapActivityDetails(existingActivity.details),
        };
      }

      throw error;
    }
  }

  async deleteOne(activityId: string, guildId: string) {
    const activity = await this.prismaDatabase.activity.findFirst({
      where: {
        id: activityId,
        guildId,
      },
    });

    if (!activity) {
      throw new NotFoundError(`Activity with ID ${activityId} not found`);
    }

    await this.prismaDatabase.activity.delete({
      where: {
        id_createdAt: {
          id: activity.id,
          createdAt: activity.createdAt,
        },
      },
    });

    return 1;
  }

  async deleteMany(guildId: string, type?: ActivityType) {
    const result = await this.prismaDatabase.activity.deleteMany({
      where: {
        guildId,
        type,
      },
    });

    return result.count;
  }

  async getStatsByGuild(guildId: string) {
    const stats = await this.prismaDatabase.activity.groupBy({
      by: ["type"],
      where: {
        guildId,
      },
      _count: {
        type: true,
      },
    });

    return stats.reduce(
      (activityTypeCounts, stat) => {
        activityTypeCounts[stat.type] = stat._count.type;
        return activityTypeCounts;
      },
      {} as Record<ActivityType, number>,
    );
  }

  private async findOrCreateActorSnapshot(
    snapshot: CreateActivitySchema["actorSnapshot"],
    source: CreateActivitySchema["source"],
  ) {
    if (!snapshot) {
      throw new Error("Actor snapshot is required");
    }

    const fingerprint = this.generateFingerprint(snapshot, source);

    try {
      const actorSnapshot =
        await this.prismaDatabase.activityActorSnapshot.upsert({
          where: {
            fingerprint,
          },
          update: {},
          create: {
            accountId: snapshot.accountId!,
            characterId: snapshot.characterId!,
            clanName: snapshot.clanName,
            clanId: snapshot.clanId,
            name: snapshot.name!,
            icon: snapshot.icon!,
            lvl: snapshot.lvl!,
            prof: snapshot.prof!,
            source,
            fingerprint,
          },
          select: {
            id: true,
          },
        });

      return actorSnapshot.id;
    } catch (error) {
      this.logger.error("Failed to create or find actor snapshot", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private generateFingerprint(
    snapshot: NonNullable<CreateActivitySchema["actorSnapshot"]>,
    source: CreateActivitySchema["source"],
  ) {
    const serializedSnapshot = JSON.stringify({
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

    return createHash("sha256").update(serializedSnapshot).digest("hex");
  }
}
