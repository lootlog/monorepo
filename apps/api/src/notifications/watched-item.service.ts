import { db as prismaDb } from "#src/prisma/db";
import { and, or } from "@prisma/orm-family-sql/orm-client";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import { GuildsService } from "#src/guilds/guilds.service";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import {
  NotificationFiltersResponseDto,
  NotificationRuleResponseDto,
  WatchedItemResponseDto,
  WatchedItemSnapshotResponseDto,
} from "#src/notifications/dto/notification-response.dto";
import { NotificationMatchingService } from "#src/notifications/notification-matching.service";
import { NotificationTargetService } from "#src/notifications/notification-target.service";
import { Error as NotificationError } from "#src/notifications/enum/error.enum";
import { ensureLimitNotExceeded } from "#src/notifications/utils/ensure-limit-not-exceeded.util";
import type { CreateWatchedItemQuickAddDto } from "#src/notifications/dto/create-watched-item-quick-add.dto";
import type { CreateWatchedItemDto } from "#src/notifications/dto/create-watched-item.dto";

const DbNotificationOwnerType =
  prismaDb.nativeEnums.public.NotificationOwnerType.members;
type DbNotificationOwnerType =
  (typeof DbNotificationOwnerType)[keyof typeof DbNotificationOwnerType];
const DbNotificationTriggerType =
  prismaDb.nativeEnums.public.NotificationTriggerType.members;
type DbNotificationTriggerType =
  (typeof DbNotificationTriggerType)[keyof typeof DbNotificationTriggerType];

const USER_WATCHED_ITEM_LIMIT = 20;

type NotificationRuleWithUnknownFilters = Omit<
  typeof NotificationRuleResponseDto.schema._output,
  "filters"
> & {
  filters: unknown;
};

type WatchedItemWithUnknownSnapshot = Omit<
  typeof WatchedItemResponseDto.schema._output,
  "itemSnapshot" | "notificationRule"
> & {
  itemSnapshot?: unknown | null;
  notificationRule: NotificationRuleWithUnknownFilters | null;
};

@Injectable()
export class WatchedItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guildsService: GuildsService,
    private readonly targetService: NotificationTargetService,
    private readonly jobService: NotificationJobService,
    private readonly matchingService: NotificationMatchingService,
  ) {}

  async listWatchedItems(discordId: string) {
    const watchedItems = (await this.prisma.db.orm.public.WatchedItem.where(
      (row) => row.userId.eq(discordId),
    )
      .include("notificationRule", (relation) =>
        relation.include("targets", (relationChild) =>
          relationChild.include("target"),
        ),
      )
      .orderBy((row) => row.updatedAt.desc())
      .all()) as any[];

    const pairs = [
      ...new Map(
        watchedItems.map((item) => [
          `${item.itemId}:${item.itemName}`,
          { itemId: item.itemId, itemName: item.itemName },
        ]),
      ).values(),
    ];

    const snapshots = (await this.prisma.db.orm.public.ItemSnapshot.where(
      (row) =>
        or(
          ...pairs.map(({ itemId, itemName }) =>
            and(row.itemId.eq(itemId), row.name.eq(itemName)),
          ),
        ),
    )
      .select("itemId", "name", "icon", "rarity", "lvl", "itemType", "statRaw")
      .orderBy((row) => row.createdAt.desc())
      .distinct(["itemId", "name"])
      .all()) as any[];

    const snapshotByKey = new Map(
      snapshots.map((s) => [`${s.itemId}:${s.name}`, s]),
    );

    return watchedItems.map((item) => {
      const snapshot = snapshotByKey.get(`${item.itemId}:${item.itemName}`);

      return {
        ...item,
        notificationRule: item.notificationRule
          ? this.mapNotificationRule(item.notificationRule)
          : null,
        itemSnapshot: this.mapWatchedItemSnapshot(
          snapshot
            ? {
                name: snapshot.name,
                icon: snapshot.icon,
                rarity: snapshot.rarity,
                lvl: snapshot.lvl,
                type: snapshot.itemType,
                stat: snapshot.statRaw,
              }
            : null,
        ),
      };
    });
  }

  async createWatchedItem(
    discordId: string,
    userId: string,
    data: CreateWatchedItemDto,
  ) {
    const guildIds = await this.validateWatchedItemGuildIds({
      discordId,
      userId,
      guildIds: data.guildIds,
    });

    return this.upsertWatchedItem(discordId, {
      itemId: data.itemId,
      itemName: data.itemName,
      world: data.world,
      resolveGuildIds: () => guildIds,
    });
  }

  async quickAddWatchedItem(
    discordId: string,
    userId: string,
    data: CreateWatchedItemQuickAddDto,
  ) {
    const [guildId] = await this.validateWatchedItemGuildIds({
      discordId,
      userId,
      guildIds: [data.guildId],
    });

    return this.upsertWatchedItem(discordId, {
      itemId: data.itemId,
      itemName: data.itemName,
      world: data.world,
      resolveGuildIds: (existingFilters) => {
        const existing = existingFilters?.guildIds ?? [];
        return [...new Set([...existing, guildId])].sort();
      },
    });
  }

  private async upsertWatchedItem(
    discordId: string,
    params: {
      itemId: number;
      itemName: string;
      world: string;
      resolveGuildIds: (
        existingFilters: { guildIds?: string[] } | null,
      ) => string[];
    },
  ) {
    const targetIds =
      await this.targetService.getActiveUserTargetIds(discordId);

    if (targetIds.length === 0) {
      throw new ConflictException(
        NotificationError.ACTIVE_DISCORD_DM_TARGET_REQUIRED,
      );
    }

    const existingWatchedItem =
      await this.prisma.db.orm.public.WatchedItem.where((row) =>
        and(
          row.userId.eq(discordId),
          row.itemId.eq(params.itemId),
          row.world.eq(params.world),
        ),
      )
        .include("notificationRule")
        .first();

    const existingFilters = existingWatchedItem?.notificationRule
      ? this.matchingService.parseFilters(
          existingWatchedItem.notificationRule.filters ?? {},
        )
      : null;
    const guildIds = params.resolveGuildIds(existingFilters);

    if (existingWatchedItem?.notificationRuleId) {
      await this.prisma.db.transaction(async (tx) => {
        await tx.orm.public.WatchedItem.where((row) =>
          row.id.eq(existingWatchedItem.id),
        ).update({
          enabled: true,
          itemName: params.itemName,
          updatedAt: new Date(),
        });
        await tx.orm.public.NotificationRule.where((row) =>
          row.id.eq(existingWatchedItem.notificationRuleId),
        ).update({
          enabled: true,
          world: params.world,
          filters: {
            itemId: params.itemId,
            guildIds,
          },
          updatedAt: new Date(),
        });
        const notificationRuleId = existingWatchedItem.notificationRuleId;
        if (!notificationRuleId) {
          throw new globalThis.Error(
            "Missing notification rule id for watched item",
          );
        }

        await tx.orm.public.NotificationRuleTarget.createAndCount(
          targetIds.map((targetId) => ({
            ruleId: notificationRuleId,
            targetId,
          })),
        );
      });

      return this.getWatchedItemByScope({
        discordId,
        itemId: params.itemId,
        world: params.world,
      });
    }

    if (!existingWatchedItem) {
      await this.ensureWatchedItemLimitNotExceeded(discordId);
    }

    return this.prisma.db.transaction(async (tx) => {
      const notificationRule = await tx.orm.public.NotificationRule.create({
        ownerType: DbNotificationOwnerType.USER,
        ownerId: discordId,
        triggerType: DbNotificationTriggerType.WATCHED_ITEM_DROPPED,
        world: params.world,
        filters: {
          itemId: params.itemId,
          guildIds,
        },
        enabled: true,
        dedupeWindowSeconds: 0,
        updatedAt: new Date(),
      });
      if (targetIds.length > 0) {
        await tx.orm.public.NotificationRuleTarget.createAndCount(
          targetIds.map((targetId) => ({
            ruleId: notificationRule.id,
            targetId,
          })),
        );
      }

      return tx.orm.public.WatchedItem.where((row) =>
        and(
          row.userId.eq(discordId),
          row.itemId.eq(params.itemId),
          row.world.eq(params.world),
        ),
      )
        .upsert({
          create: {
            userId: discordId,
            itemId: params.itemId,
            itemName: params.itemName,
            world: params.world,
            notificationRuleId: notificationRule.id,
            updatedAt: new Date(),
          },
          update: {
            enabled: true,
            itemName: params.itemName,
            notificationRuleId: notificationRule.id,
          },
        })
        .then((watchedItem) => this.mapWatchedItem(watchedItem));
    });
  }

  async deleteWatchedItem(discordId: string, watchedItemId: number) {
    const watchedItem = await this.prisma.db.orm.public.WatchedItem.where(
      (row) => and(row.id.eq(watchedItemId), row.userId.eq(discordId)),
    ).first();

    if (!watchedItem) {
      throw new NotFoundException(NotificationError.WATCHED_ITEM_NOT_FOUND);
    }

    if (watchedItem.notificationRuleId) {
      await this.jobService.cancelPendingJobs({
        ruleId: watchedItem.notificationRuleId,
      });
    }

    await this.prisma.db.transaction(async (tx) => {
      await tx.orm.public.WatchedItem.where((row) =>
        row.id.eq(watchedItem.id),
      ).delete();

      if (watchedItem.notificationRuleId) {
        await tx.orm.public.NotificationRule.where((row) =>
          row.id.eq(watchedItem.notificationRuleId),
        ).delete();
      }
    });

    return { success: true };
  }

  private async ensureWatchedItemLimitNotExceeded(discordId: string) {
    const currentWatchedItemCount =
      await this.prisma.db.orm.public.WatchedItem.where((row) =>
        row.userId.eq(discordId),
      ).count();

    ensureLimitNotExceeded({
      currentCount: currentWatchedItemCount,
      limit: USER_WATCHED_ITEM_LIMIT,
      errorMessage: NotificationError.USER_WATCHED_ITEM_LIMIT_REACHED,
      metadata: {
        watchedItemLimit: USER_WATCHED_ITEM_LIMIT,
        watchedItemCount: currentWatchedItemCount,
      },
    });
  }

  private async validateWatchedItemGuildIds(params: {
    userId: string;
    discordId: string;
    guildIds: string[];
  }) {
    const uniqueInputIds = [...new Set(params.guildIds)];

    if (uniqueInputIds.length === 0) {
      throw new BadRequestException(
        NotificationError.AT_LEAST_ONE_GUILD_REQUIRED,
      );
    }

    const userGuilds = await this.guildsService.getUserGuilds(
      params.discordId,
      params.userId,
      "game",
    );

    const resolvedGuildIds = uniqueInputIds.map((input) => {
      const guild = userGuilds.find(
        (g) => g.id === input || g.vanityUrl === input,
      );
      if (!guild) {
        return null;
      }
      return guild.id;
    });

    if (resolvedGuildIds.some((id) => id === null)) {
      throw new BadRequestException(
        NotificationError.SELECTED_GUILDS_NOT_AVAILABLE_FOR_AUTHENTICATED_USER,
      );
    }

    return [...new Set(resolvedGuildIds as string[])].sort();
  }

  private getWatchedItemByScope(params: {
    discordId: string;
    itemId: number;
    world: string;
  }) {
    return this.prisma.db.orm.public.WatchedItem.where((row) =>
      and(
        row.userId.eq(params.discordId),
        row.itemId.eq(params.itemId),
        row.world.eq(params.world),
      ),
    )
      .include("notificationRule", (relation) =>
        relation.include("targets", (relationChild) =>
          relationChild.include("target"),
        ),
      )
      .first()
      .then((watchedItem) =>
        watchedItem ? this.mapWatchedItem(watchedItem) : null,
      );
  }

  private mapWatchedItem(
    watchedItem: WatchedItemWithUnknownSnapshot,
  ): typeof WatchedItemResponseDto.schema._output {
    return {
      ...watchedItem,
      itemSnapshot: this.mapWatchedItemSnapshot(watchedItem.itemSnapshot),
      notificationRule: watchedItem.notificationRule
        ? this.mapNotificationRule(watchedItem.notificationRule)
        : null,
    };
  }

  private mapWatchedItemSnapshot(
    itemSnapshot: unknown | null | undefined,
  ): typeof WatchedItemSnapshotResponseDto.schema._output | null {
    if (!itemSnapshot) {
      return null;
    }

    return WatchedItemSnapshotResponseDto.schema.parse(itemSnapshot);
  }

  private mapNotificationRule(
    notificationRule: NotificationRuleWithUnknownFilters,
  ): typeof NotificationRuleResponseDto.schema._output {
    return {
      ...notificationRule,
      filters: NotificationFiltersResponseDto.schema.parse(
        notificationRule.filters,
      ),
    };
  }
}
