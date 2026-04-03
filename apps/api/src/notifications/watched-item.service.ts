import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationTriggerType as DbNotificationTriggerType,
} from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";
import { GuildsService } from "src/guilds/guilds.service";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationMatchingService } from "src/notifications/notification-matching.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { Error } from "src/notifications/enum/error.enum";
import type { CreateWatchedItemQuickAddDto } from "src/notifications/dto/create-watched-item-quick-add.dto";
import type { CreateWatchedItemDto } from "src/notifications/dto/create-watched-item.dto";

const USER_WATCHED_ITEM_LIMIT = 20;

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
        itemSnapshot: snapshot
          ? {
              name: snapshot.name,
              icon: snapshot.icon,
              rarity: snapshot.rarity,
              lvl: snapshot.lvl,
              type: snapshot.itemType,
              stat: snapshot.statRaw,
            }
          : null,
      };
    });
  }

  async createWatchedItem(
    discordId: string,
    userId: string,
    data: CreateWatchedItemDto,
  ) {
    const normalizedGuildIds = await this.validateWatchedItemGuildIds({
      discordId,
      userId,
      guildIds: data.guildIds,
    });
    const existingWatchedItem = await this.prisma.watchedItem.findUnique({
      where: {
        userId_itemId_world: {
          userId: discordId,
          itemId: data.itemId,
          world: data.world,
        },
      },
      include: {
        notificationRule: true,
      },
    });

    const targetIds =
      await this.targetService.getActiveUserTargetIds(discordId);
    if (targetIds.length === 0) {
      throw new ConflictException(Error.ACTIVE_DISCORD_DM_TARGET_REQUIRED);
    }

    if (existingWatchedItem?.notificationRuleId) {
      await this.prisma.$transaction(async (tx) => {
        await tx.watchedItem.update({
          where: { id: existingWatchedItem.id },
          data: {
            enabled: true,
            itemName: data.itemName,
          },
        });
        await tx.notificationRule.update({
          where: { id: existingWatchedItem.notificationRuleId },
          data: {
            enabled: true,
            world: data.world,
            filters: {
              itemId: data.itemId,
              guildIds: normalizedGuildIds,
            },
          },
        });
        if (targetIds.length > 0) {
          await tx.notificationRuleTarget.createMany({
            data: targetIds.map((targetId) => ({
              ruleId: existingWatchedItem.notificationRuleId!,
              targetId,
            })),
            skipDuplicates: true,
          });
        }
      });

      return this.getWatchedItemByScope({
        discordId,
        itemId: data.itemId,
        world: data.world,
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
          world: data.world,
          filters: {
            itemId: data.itemId,
            guildIds: normalizedGuildIds,
          },
          enabled: true,
          dedupeWindowSeconds: 0,
          targets:
            targetIds.length > 0
              ? {
                  createMany: {
                    data: targetIds.map((targetId) => ({ targetId })),
                  },
                }
              : undefined,
        },
      });

      return tx.watchedItem.upsert({
        where: {
          userId_itemId_world: {
            userId: discordId,
            itemId: data.itemId,
            world: data.world,
          },
        },
        create: {
          userId: discordId,
          itemId: data.itemId,
          itemName: data.itemName,
          world: data.world,
          notificationRuleId: notificationRule.id,
        },
        update: {
          enabled: true,
          itemName: data.itemName,
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
      });
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
    const targetIds =
      await this.targetService.getActiveUserTargetIds(discordId);

    if (targetIds.length === 0) {
      throw new ConflictException(Error.ACTIVE_DISCORD_DM_TARGET_REQUIRED);
    }

    const existingWatchedItem = await this.prisma.watchedItem.findUnique({
      where: {
        userId_itemId_world: {
          userId: discordId,
          itemId: data.itemId,
          world: data.world,
        },
      },
      include: {
        notificationRule: true,
      },
    });

    if (existingWatchedItem?.notificationRuleId) {
      const existingFilters = this.matchingService.parseFilters(
        existingWatchedItem.notificationRule?.filters ?? {},
      );
      const mergedGuildIds = [
        ...new Set([...(existingFilters.guildIds ?? []), guildId]),
      ].sort();

      await this.prisma.$transaction(async (tx) => {
        await tx.watchedItem.update({
          where: { id: existingWatchedItem.id },
          data: {
            enabled: true,
            itemName: data.itemName,
          },
        });
        await tx.notificationRule.update({
          where: { id: existingWatchedItem.notificationRuleId },
          data: {
            enabled: true,
            world: data.world,
            filters: {
              itemId: data.itemId,
              guildIds: mergedGuildIds,
            },
          },
        });
        await tx.notificationRuleTarget.createMany({
          data: targetIds.map((targetId) => ({
            ruleId: existingWatchedItem.notificationRuleId!,
            targetId,
          })),
          skipDuplicates: true,
        });
      });

      return this.getWatchedItemByScope({
        discordId,
        itemId: data.itemId,
        world: data.world,
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
          world: data.world,
          filters: {
            itemId: data.itemId,
            guildIds: [guildId],
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

      return tx.watchedItem.upsert({
        where: {
          userId_itemId_world: {
            userId: discordId,
            itemId: data.itemId,
            world: data.world,
          },
        },
        create: {
          userId: discordId,
          itemId: data.itemId,
          itemName: data.itemName,
          world: data.world,
          notificationRuleId: notificationRule.id,
        },
        update: {
          enabled: true,
          itemName: data.itemName,
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
      });
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
      throw new NotFoundException(Error.WATCHED_ITEM_NOT_FOUND);
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

    if (currentWatchedItemCount >= USER_WATCHED_ITEM_LIMIT) {
      throw new ConflictException({
        message: Error.USER_WATCHED_ITEM_LIMIT_REACHED,
        watchedItemLimit: USER_WATCHED_ITEM_LIMIT,
        watchedItemCount: currentWatchedItemCount,
      });
    }
  }

  private async validateWatchedItemGuildIds(params: {
    userId: string;
    discordId: string;
    guildIds: string[];
  }) {
    const uniqueInputIds = [...new Set(params.guildIds)];

    if (uniqueInputIds.length === 0) {
      throw new BadRequestException(Error.AT_LEAST_ONE_GUILD_REQUIRED);
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
        Error.SELECTED_GUILDS_NOT_AVAILABLE_FOR_AUTHENTICATED_USER,
      );
    }

    return [...new Set(resolvedGuildIds as string[])].sort();
  }

  private getWatchedItemByScope(params: {
    discordId: string;
    itemId: number;
    world: string;
  }) {
    return this.prisma.watchedItem.findUnique({
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
    });
  }
}
