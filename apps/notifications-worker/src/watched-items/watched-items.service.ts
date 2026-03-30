import { Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  watchedItems,
  notificationRules,
  notificationRulesToTargets,
} from "src/shared/modules/drizzle/schema";
import type { CreateWatchedItemDto } from "./dto/create-watched-item.dto";

@Injectable()
export class WatchedItemsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(userId: string, dto: CreateWatchedItemDto) {
    return this.drizzle.db.transaction(async (tx) => {
      const [rule] = await tx
        .insert(notificationRules)
        .values({
          ownerType: "user",
          ownerId: userId,
          triggerType: "watched_item_dropped",
          filters: { itemIds: [dto.itemId] },
          world: dto.world,
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

      const [item] = await tx
        .insert(watchedItems)
        .values({
          userId,
          itemId: dto.itemId,
          itemName: dto.itemName,
          itemIcon: dto.itemIcon,
          world: dto.world,
          ruleId: rule.id,
        })
        .onConflictDoUpdate({
          target: [watchedItems.userId, watchedItems.itemId, watchedItems.world],
          set: {
            itemName: dto.itemName,
            itemIcon: dto.itemIcon,
            ruleId: rule.id,
          },
        })
        .returning();

      return item;
    });
  }

  async findByUser(userId: string) {
    return this.drizzle.db.query.watchedItems.findMany({
      where: eq(watchedItems.userId, userId),
      with: { rule: true },
    });
  }

  async findByItemAndWorld(itemId: number, world?: string) {
    const conditions = [eq(watchedItems.itemId, itemId)];
    if (world) {
      conditions.push(eq(watchedItems.world, world));
    }
    return this.drizzle.db.query.watchedItems.findMany({
      where: and(...conditions),
      with: {
        rule: {
          with: {
            rulesToTargets: {
              with: { target: true },
            },
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const item = await this.drizzle.db.query.watchedItems.findFirst({
      where: and(eq(watchedItems.id, id), eq(watchedItems.userId, userId)),
    });

    if (!item) return null;

    if (item.ruleId) {
      await this.drizzle.db
        .delete(notificationRules)
        .where(eq(notificationRules.id, item.ruleId));
    }

    const [deleted] = await this.drizzle.db
      .delete(watchedItems)
      .where(eq(watchedItems.id, id))
      .returning({ id: watchedItems.id });

    return deleted;
  }
}
