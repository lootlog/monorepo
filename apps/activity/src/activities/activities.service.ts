import { createHash } from "node:crypto";
import { createId } from "@paralleldrive/cuid2";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";
import { db as prismaDb } from "../prisma/db.js";
import { PrismaService } from "#src/prisma.service";
import { temporalToDate } from "#src/shared/db/temporal";
import { CreateActivityDto } from "./dto/create-activity.dto.js";
import type { ActivityResponse } from "./dto/activity-response.dto.js";
import { mapActivityDetails } from "./utils/map-activity-details.js";

const ActivityType = prismaDb.nativeEnums.public.ActivityType.members;
type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
type ActivityTypeValue = (typeof ActivityType)[keyof typeof ActivityType];

type PrismaTransaction = Parameters<
  PrismaService["db"]["transaction"]
>[0] extends (transaction: infer Transaction) => PromiseLike<unknown>
  ? Transaction
  : never;

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(dto: CreateActivityDto): Promise<ActivityResponse> {
    let actorSnapshotId: string | undefined;
    if (dto.actorSnapshot) {
      actorSnapshotId = await this.findOrCreateActorSnapshot(
        dto.actorSnapshot,
        dto.source,
      );
    }

    try {
      const activity = await this.prisma.db.transaction(async (transaction) => {
        const createdActivity = await transaction.orm.public.Activity.create({
          id: createId(),
          userId: dto.userId,
          guildId: dto.guildId,
          discordId: dto.discordId,
          _type: dto.type,
          source: dto.source,
          idempotencyKey: dto.idempotencyKey,
          world: dto.world ?? null,
          details: (dto.details ?? null) as JsonValue,
          actorSnapshotId: actorSnapshotId ?? null,
        });

        await this.updateMemberActivityStats(transaction, dto);

        const actorSnapshot = actorSnapshotId
          ? await transaction.orm.public.ActivityActorSnapshot.first({
              id: actorSnapshotId,
            })
          : null;

        return { ...createdActivity, actorSnapshot };
      });

      return {
        ...this.mapActivityTemporalFields(activity),
        type: activity._type,
        actorSnapshot: activity.actorSnapshot ?? undefined,
        details: mapActivityDetails(activity.details),
      };
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        this.logger.log(
          `Duplicate activity detected via idempotency key: ${dto.idempotencyKey}`,
        );

        const existing = await this.prisma.db.orm.public.Activity.where({
          idempotencyKey: dto.idempotencyKey,
        }).first();

        if (!existing) {
          throw error;
        }

        const actorSnapshot = existing.actorSnapshotId
          ? await this.prisma.db.orm.public.ActivityActorSnapshot.first({
              id: existing.actorSnapshotId,
            })
          : null;
        const existingWithSnapshot = { ...existing, actorSnapshot };

        return {
          ...this.mapActivityTemporalFields(existingWithSnapshot),
          type: existing._type,
          actorSnapshot: actorSnapshot ?? undefined,
          details: mapActivityDetails(existing.details),
        };
      }

      throw error;
    }
  }

  private async updateMemberActivityStats(
    transaction: PrismaTransaction,
    dto: CreateActivityDto,
  ): Promise<void> {
    if (dto.type === ActivityType.CONNECT_EVENT) {
      await this.updateMemberActivityStatsForConnect(transaction, dto);
      return;
    }

    if (dto.type === ActivityType.DISCONNECT_EVENT) {
      await this.updateMemberActivityStatsForDisconnect(transaction, dto);
    }
  }

  private async updateMemberActivityStatsForConnect(
    transaction: PrismaTransaction,
    dto: CreateActivityDto,
  ): Promise<void> {
    const sessionId = this.getActivitySessionId(dto);
    const lastSeenAt = new Date();
    const lastSeenAtIso = lastSeenAt.toISOString();
    const userAgent = this.getDetailsString(dto, "userAgent") ?? null;
    const world = dto.world ?? null;
    const insertSessionPlan = this.prisma.db.raw.sql`
      INSERT INTO "MemberActivitySession"
        ("guildId", "discordId", "source", "sessionId", "userId", "userAgent", "world", "lastSeenAt")
      VALUES
        (${dto.guildId}, ${dto.discordId}, ${dto.source}, ${sessionId}, ${dto.userId}, ${userAgent}, ${world}, ${lastSeenAtIso}::timestamptz)
      ON CONFLICT DO NOTHING
    `
      .affectedCount()
      .build();
    const { affectedRows: visitCountIncrement } =
      await transaction.execute(insertSessionPlan);
    const activeSessionCount = Number(
      await transaction.orm.public.MemberActivitySession.where({
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
      }).count(),
    );

    const updateStatsPlan = this.prisma.db.raw.sql`
      INSERT INTO "MemberActivityStats"
        ("guildId", "discordId", "source", "lastSeenAt", "visitCount", "activeSessionCount", "updatedAt")
      VALUES
        (${dto.guildId}, ${dto.discordId}, ${dto.source}, ${lastSeenAtIso}::timestamptz, ${visitCountIncrement}, ${activeSessionCount}, NOW())
      ON CONFLICT ("guildId", "discordId", "source") DO UPDATE SET
        "lastSeenAt" = EXCLUDED."lastSeenAt",
        "visitCount" = "MemberActivityStats"."visitCount" + EXCLUDED."visitCount",
        "activeSessionCount" = EXCLUDED."activeSessionCount",
        "updatedAt" = NOW()
    `
      .affectedCount()
      .build();
    await transaction.execute(updateStatsPlan);
  }

  private async updateMemberActivityStatsForDisconnect(
    transaction: PrismaTransaction,
    dto: CreateActivityDto,
  ): Promise<void> {
    const sessionId = this.getActivitySessionId(dto);

    await transaction.orm.public.MemberActivitySession.where({
      guildId: dto.guildId,
      discordId: dto.discordId,
      source: dto.source,
      sessionId,
    }).delete();
    const activeSessionCount = Number(
      await transaction.orm.public.MemberActivitySession.where({
        guildId: dto.guildId,
        discordId: dto.discordId,
        source: dto.source,
      }).count(),
    );

    await transaction.orm.public.MemberActivityStats.where({
      guildId: dto.guildId,
      discordId: dto.discordId,
      source: dto.source,
    }).update({ activeSessionCount, updatedAt: new Date() });
  }

  async clearActiveSessionsForMember(member: {
    guildId: string;
    discordId: string;
  }): Promise<void> {
    await this.prisma.db.transaction(async (transaction) => {
      await transaction.orm.public.MemberActivitySession.where({
        guildId: member.guildId,
        discordId: member.discordId,
      }).delete();

      await transaction.orm.public.MemberActivityStats.where({
        guildId: member.guildId,
        discordId: member.discordId,
      })
        .where((stats) => stats.activeSessionCount.gt(0))
        .update({ activeSessionCount: 0, updatedAt: new Date() });
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
    const activity = await this.prisma.db.orm.public.Activity.where({
      id,
      guildId,
    }).first();

    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }

    await this.prisma.db.orm.public.Activity.where({
      id: activity.id,
      createdAt: activity.createdAt,
    }).delete();

    return 1;
  }

  async deleteMany(guildId: string, type?: ActivityTypeValue): Promise<number> {
    const deleted = type
      ? await this.prisma.db.runtime().execute(
          this.prisma.db.raw.sql`
            DELETE FROM "Activity"
            WHERE "guildId" = ${guildId} AND "type" = ${type}
          `
            .affectedCount()
            .build(),
        )
      : await this.prisma.db.runtime().execute(
          this.prisma.db.raw.sql`
            DELETE FROM "Activity"
            WHERE "guildId" = ${guildId}
          `
            .affectedCount()
            .build(),
        );

    return deleted.affectedRows;
  }

  async getStatsByGuild(
    guildId: string,
  ): Promise<Record<ActivityTypeValue, number>> {
    const stats = await this.prisma.db.orm.public.Activity.where({ guildId })
      .groupBy("_type")
      .aggregate((aggregate) => ({ count: aggregate.count() }));

    return stats.reduce(
      (acc, stat) => {
        acc[stat._type] = stat.count;
        return acc;
      },
      {} as Record<ActivityTypeValue, number>,
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
      const actorSnapshot =
        await this.prisma.db.orm.public.ActivityActorSnapshot.where({
          fingerprint,
        })
          .select("id")
          .upsert({
            update: { fingerprint },
            create: {
              id: createId(),
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

  private mapActivityTemporalFields<
    Activity extends {
      createdAt: Date | { toString(): string };
      actorSnapshot: null | {
        createdAt: Date | { toString(): string };
      };
    },
  >(activity: Activity) {
    return {
      ...activity,
      createdAt: temporalToDate(activity.createdAt),
      actorSnapshot: activity.actorSnapshot
        ? {
            ...activity.actorSnapshot,
            createdAt: temporalToDate(activity.actorSnapshot.createdAt),
          }
        : null,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "sqlState" in error &&
      error.sqlState === "23505"
    );
  }
}
