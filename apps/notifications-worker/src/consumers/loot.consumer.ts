import { Injectable, Logger } from "@nestjs/common";
import {
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from "@golevelup/nestjs-rabbitmq";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enums/routing-key.enum";
import { Queue } from "src/enums/queue.enum";
import { WatchedItemsService } from "src/watched-items/watched-items.service";

interface LootCreatedPayload {
  lootId: number;
  world: string;
  items: Array<{
    id: number;
    name: string;
    rarity?: string;
  }>;
  npcs: Array<{
    id: number;
    name: string;
    type?: string;
  }>;
  guildIds: string[];
}

@Injectable()
export class LootConsumer {
  private readonly logger = new Logger(LootConsumer.name);

  constructor(
    private readonly watchedItemsService: WatchedItemsService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.LOOTS_CREATED,
    queue: Queue.NOTIFICATIONS_LOOTS_CREATED,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: { durable: true },
  })
  async handleLootCreated(payload: LootCreatedPayload) {
    this.logger.debug(`Loot created: lootId=${payload.lootId}`);

    for (const item of payload.items) {
      const watchedItems = await this.watchedItemsService.findByItemAndWorld(
        item.id,
        payload.world,
      );

      for (const watched of watchedItems) {
        if (!watched.rule?.enabled) continue;

        const targets = watched.rule.rulesToTargets
          ?.map((rt) => rt.target)
          .filter((t) => t?.enabled);

        if (!targets?.length) continue;

        for (const target of targets) {
          if (!target) continue;

          const idempotencyKey = `rule:${watched.ruleId}:target:${target.id}:loot:${payload.lootId}`;

          await this.amqpConnection.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.NOTIFICATIONS_DISCORD_SEND,
            {
              idempotencyKey,
              targetType: target.targetType,
              externalId: target.externalId,
              payload: {
                triggerType: "watched_item_dropped",
                item,
                npcs: payload.npcs,
                world: payload.world,
                lootId: payload.lootId,
              },
            },
          );
        }
      }
    }
  }
}
