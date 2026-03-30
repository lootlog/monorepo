import { Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  notificationRules,
  notificationRulesToTargets,
  notificationJobs,
} from "src/shared/modules/drizzle/schema";
import type { CreateRuleDto } from "./dto/create-rule.dto";
import type { UpdateRuleDto } from "./dto/update-rule.dto";

@Injectable()
export class RulesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(dto: CreateRuleDto) {
    return this.drizzle.db.transaction(async (tx) => {
      const [rule] = await tx
        .insert(notificationRules)
        .values({
          ownerType: dto.ownerType,
          ownerId: dto.ownerId,
          triggerType: dto.triggerType,
          guildId: dto.guildId,
          world: dto.world,
          filters: dto.filters ?? {},
          leadTimeMinutes: dto.leadTimeMinutes,
          dedupeWindowSeconds: dto.dedupeWindowSeconds,
          enabled: dto.enabled,
        })
        .returning();

      if (dto.targetIds?.length) {
        await tx.insert(notificationRulesToTargets).values(
          dto.targetIds.map((targetId) => ({
            ruleId: rule.id,
            targetId,
          })),
        );
      }

      return rule;
    });
  }

  async findByOwner(ownerType: string, ownerId: string) {
    return this.drizzle.db.query.notificationRules.findMany({
      where: and(
        eq(notificationRules.ownerType, ownerType as "guild" | "user"),
        eq(notificationRules.ownerId, ownerId),
      ),
      with: {
        rulesToTargets: {
          with: { target: true },
        },
      },
    });
  }

  async findById(id: string) {
    return this.drizzle.db.query.notificationRules.findFirst({
      where: eq(notificationRules.id, id),
      with: {
        rulesToTargets: {
          with: { target: true },
        },
      },
    });
  }

  async findMatchingRules(
    triggerType: string,
    guildId: string,
    world?: string,
  ) {
    const conditions = [
      eq(notificationRules.triggerType, triggerType as any),
      eq(notificationRules.guildId, guildId),
      eq(notificationRules.enabled, true),
    ];

    if (world) {
      conditions.push(eq(notificationRules.world, world));
    }

    return this.drizzle.db.query.notificationRules.findMany({
      where: and(...conditions),
      with: {
        rulesToTargets: {
          with: { target: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateRuleDto) {
    return this.drizzle.db.transaction(async (tx) => {
      const { targetIds, ...updateData } = dto;

      const [rule] = await tx
        .update(notificationRules)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(notificationRules.id, id))
        .returning();

      if (!rule) return null;

      if (targetIds !== undefined) {
        await tx
          .delete(notificationRulesToTargets)
          .where(eq(notificationRulesToTargets.ruleId, id));

        if (targetIds.length) {
          await tx.insert(notificationRulesToTargets).values(
            targetIds.map((targetId) => ({
              ruleId: id,
              targetId,
            })),
          );
        }
      }

      if (dto.enabled === false) {
        await tx
          .update(notificationJobs)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(
            and(
              eq(notificationJobs.ruleId, id),
              eq(notificationJobs.status, "pending"),
            ),
          );
      }

      return rule;
    });
  }

  async delete(id: string) {
    const [deleted] = await this.drizzle.db
      .delete(notificationRules)
      .where(eq(notificationRules.id, id))
      .returning({ id: notificationRules.id });
    return deleted;
  }
}
