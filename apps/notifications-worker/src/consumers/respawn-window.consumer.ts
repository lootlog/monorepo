import { Injectable, Logger } from "@nestjs/common";
import {
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from "@golevelup/nestjs-rabbitmq";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enums/routing-key.enum";
import { Queue } from "src/enums/queue.enum";
import { RulesService } from "src/rules/rules.service";

interface RespawnWindowPayload {
  guildId: string;
  eventId: string;
  heroId: string;
}

@Injectable()
export class RespawnWindowConsumer {
  private readonly logger = new Logger(RespawnWindowConsumer.name);

  constructor(
    private readonly rulesService: RulesService,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
    queue: Queue.NOTIFICATIONS_RESPAWN_WINDOW_OPENED,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: { durable: true },
  })
  async handleRespawnWindowOpened(payload: RespawnWindowPayload) {
    this.logger.debug(
      `Respawn window opened: guild=${payload.guildId} hero=${payload.heroId}`,
    );

    const rules = await this.rulesService.findMatchingRules(
      "npc_spawned",
      payload.guildId,
    );

    for (const rule of rules) {
      const targets = rule.rulesToTargets
        .map((rt) => rt.target)
        .filter((t) => t?.enabled);

      for (const target of targets) {
        if (!target) continue;

        const timestamp = new Date().toISOString();
        const idempotencyKey = `rule:${rule.id}:target:${target.id}:window:${payload.heroId}:${timestamp}`;

        await this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.NOTIFICATIONS_DISCORD_SEND,
          {
            idempotencyKey,
            targetType: target.targetType,
            externalId: target.externalId,
            payload: {
              triggerType: "npc_spawned",
              guildId: payload.guildId,
              eventId: payload.eventId,
              heroId: payload.heroId,
            },
          },
        );
      }
    }
  }
}
