import { Injectable, Logger } from "@nestjs/common";
import {
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from "@golevelup/nestjs-rabbitmq";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enums/routing-key.enum";
import { Queue } from "src/enums/queue.enum";
import { RulesService } from "src/rules/rules.service";
import { SchedulerService } from "src/scheduler/scheduler.service";

interface TimerUpdatePayload {
  guildId: string;
  world: string;
  npcId: number;
  timerKey: string;
  minSpawnTime: string;
  maxSpawnTime: string;
  npc: Record<string, unknown>;
  windowOpenedAt?: string;
}

@Injectable()
export class TimerConsumer {
  private readonly logger = new Logger(TimerConsumer.name);

  constructor(
    private readonly rulesService: RulesService,
    private readonly schedulerService: SchedulerService,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_TIMERS_UPDATE,
    queue: Queue.NOTIFICATIONS_TIMERS_UPDATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: { durable: true },
  })
  async handleTimerUpdate(payload: TimerUpdatePayload) {
    this.logger.debug(
      `Timer update: guild=${payload.guildId} npc=${payload.timerKey}`,
    );

    const rules = await this.rulesService.findMatchingRules(
      "timer_before_spawn",
      payload.guildId,
      payload.world,
    );

    const matchingRules = rules.filter((rule) => {
      const filters = rule.filters as Record<string, unknown>;
      if (!filters?.npcIds) return true;
      return (filters.npcIds as number[]).includes(payload.npcId);
    });

    for (const rule of matchingRules) {
      if (!rule.leadTimeMinutes) continue;

      const minSpawnTime = new Date(payload.minSpawnTime);
      const scheduledFor = new Date(
        minSpawnTime.getTime() - rule.leadTimeMinutes * 60 * 1000,
      );

      if (scheduledFor <= new Date()) continue;

      await this.schedulerService.cancelJobsForNpc(
        rule.id,
        payload.timerKey,
      );

      const targets = rule.rulesToTargets
        .map((rt) => rt.target)
        .filter((t) => t?.enabled);

      for (const target of targets) {
        if (!target) continue;

        const idempotencyKey = `rule:${rule.id}:target:${target.id}:npc:${payload.timerKey}:scheduled:${scheduledFor.toISOString()}`;

        await this.schedulerService.scheduleJob({
          ruleId: rule.id,
          targetId: target.id,
          scheduledFor,
          idempotencyKey,
          payload: {
            triggerType: "timer_before_spawn",
            npc: payload.npc,
            timerKey: payload.timerKey,
            guildId: payload.guildId,
            world: payload.world,
            minSpawnTime: payload.minSpawnTime,
            maxSpawnTime: payload.maxSpawnTime,
            leadTimeMinutes: rule.leadTimeMinutes,
          },
        });
      }
    }
  }
}
