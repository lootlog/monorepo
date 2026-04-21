import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationTriggerType as DbNotificationTriggerType,
} from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { NotificationJobService } from "src/notifications/notification-job.service";
import {
  NotificationFiltersResponseDto,
  NotificationRuleResponseDto,
  WatchedItemResponseDto,
  WatchedItemSnapshotResponseDto,
} from "src/notifications/dto/notification-response.dto";
import { NotificationMatchingService } from "src/notifications/notification-matching.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { Error as NotificationError } from "src/notifications/enum/error.enum";
import { ensureLimitNotExceeded } from "src/notifications/utils/ensure-limit-not-exceeded.util";
import type { CreateWatchedItemQuickAddDto } from "src/notifications/dto/create-watched-item-quick-add.dto";
import type { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";

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
    const watchedItems = await this.prisma.watchedItem.findMany({
      where: { userId: discordId },
      include: {
        notificationRule: {
          include: {
            targets: {
              include: {
                target: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const pairs = [
      ...new Map(
        watchedItems.map((item) => [
          `${item.itemId}:${item.itemName}`,
          { itemId: item.itemId, itemName: item.itemName },
        ]),
      ).values(),
    ];

    const snapshots = await this.prisma.itemSnapshot.findMany({
      where: {
        OR: pairs.map(({ itemId, itemName }) => ({
          itemId,
          name: itemName,
        })),
      },
      orderBy: { createdAt: "desc" },
      distinct: ["itemId", "name"],
      select: {
        itemId: true,
        name: true,
        icon: true,
        rarity: true,
        lvl: true,
        itemType: true,
        statRaw: true,
      },
    });

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

    const existingWatchedItem = await this.prisma.watchedItem.findUnique({
      where: {
        userId_itemId_world: {
          userId: discordId,
          itemId: params.itemId,
          world: params.world,
        },
      },
      include: { notificationRule: true },
    });

    const existingFilters = existingWatchedItem?.notificationRule
      ? this.matchingService.parseFilters(
          existingWatchedItem.notificationRule.filters ?? {},
        )
      : null;
    const guildIds = params.resolveGuildIds(existingFilters);

    if (existingWatchedItem?.notificationRuleId) {
      await this.prisma.$transaction(async (tx) => {
        await tx.watchedItem.update({
          where: { id: existingWatchedItem.id },
          data: {
            enabled: true,
            itemName: params.itemName,
          },
        });
        await tx.notificationRule.update({
          where: { id: existingWatchedItem.notificationRuleId },
          data: {
            enabled: true,
            world: params.world,
            filters: {
              itemId: params.itemId,
              guildIds,
            },
          },
        });
        const notificationRuleId = existingWatchedItem.notificationRuleId;
        if (!notificationRuleId) {
          throw new globalThis.Error(
            "Missing notification rule id for watched item",
          );
        }

        await tx.notificationRuleTarget.createMany({
          data: targetIds.map((targetId) => ({
            ruleId: notificationRuleId,
            targetId,
          })),
          skipDuplicates: true,
        });
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

    return this.prisma.$transaction(async (tx) => {
      const notificationRule = await tx.notificationRule.create({
        data: {
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
          targets: {
            createMany: {
              data: targetIds.map((targetId) => ({ targetId })),
            },
          },
        },
      });

      return tx.watchedItem
        .upsert({
          where: {
            userId_itemId_world: {
              userId: discordId,
              itemId: params.itemId,
              world: params.world,
            },
          },
          create: {
            userId: discordId,
            itemId: params.itemId,
            itemName: params.itemName,
            world: params.world,
            notificationRuleId: notificationRule.id,
          },
          update: {
            enabled: true,
            itemName: params.itemName,
            notificationRuleId: notificationRule.id,
          },
          include: {
            notificationRule: {
              include: {
                targets: {
                  include: {
                    target: true,
                  },
                },
              },
            },
          },
        })
        .then((watchedItem) => this.mapWatchedItem(watchedItem));
    });
  }

  async deleteWatchedItem(discordId: string, watchedItemId: number) {
    const watchedItem = await this.prisma.watchedItem.findFirst({
      where: {
        id: watchedItemId,
        userId: discordId,
      },
    });

    if (!watchedItem) {
      throw new NotFoundException(NotificationError.WATCHED_ITEM_NOT_FOUND);
    }

    if (watchedItem.notificationRuleId) {
      await this.jobService.cancelPendingJobs({
        ruleId: watchedItem.notificationRuleId,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.watchedItem.delete({ where: { id: watchedItem.id } });

      if (watchedItem.notificationRuleId) {
        await tx.notificationRule.delete({
          where: { id: watchedItem.notificationRuleId },
        });
      }
    });

    return { success: true };
  }

  private async ensureWatchedItemLimitNotExceeded(discordId: string) {
    const currentWatchedItemCount = await this.prisma.watchedItem.count({
      where: {
        userId: discordId,
      },
    });

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
    return this.prisma.watchedItem
      .findUnique({
        where: {
          userId_itemId_world: {
            userId: params.discordId,
            itemId: params.itemId,
            world: params.world,
          },
        },
        include: {
          notificationRule: {
            include: {
              targets: {
                include: {
                  target: true,
                },
              },
            },
          },
        },
      })
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
