import {
  MessageHandlerErrorBehavior,
  RabbitPayload,
  RabbitRequest,
  RabbitSubscribe,
} from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { Queue } from "#src/enum/queue.enum";
import {
  DEAD_LETTER_EXCHANGE_NAME,
  DEFAULT_EXCHANGE_NAME,
  RETRY_EXCHANGE_NAME,
} from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { RetryService } from "#src/shared/rabbitmq/retry.service";
import {
  CreateActivityDto,
  CreateActivitySchema,
} from "#src/activities/dto/create-activity.dto";
import { ActivitiesService } from "#src/activities/activities.service";
import { z } from "zod";
import { env } from "#src/config/env";
import {
  ACTIVITY_EVENT_SIGNATURE_HEADER,
  verifyActivityEventSignature,
} from "#src/activities/utils/activity-event-signature";

const GuildMemberRemovedSchema = z.object({
  discordId: z.string().min(1),
  guildId: z.string().min(1),
  userId: z.string().optional(),
  id: z.string().optional(),
});

interface AmqpMessage {
  properties: {
    headers?: Record<string, unknown>;
  };
}

@Injectable()
export class ActivitiesEventsService {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly retryService: RetryService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.ACTIVITY_LOG_CREATE,
    queue: Queue.ACTIVITY_LOG_CREATE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.ACTIVITY_LOG_CREATE_RETRY,
    },
  })
  async handleActivityCreate(
    @RabbitPayload() data: unknown,
    @RabbitRequest()
    amqpMsg: AmqpMessage,
  ) {
    const headers = amqpMsg?.properties.headers ?? {};
    const signature = this.getHeaderValue(
      headers[ACTIVITY_EVENT_SIGNATURE_HEADER],
    );

    if (
      !verifyActivityEventSignature({
        payload: data,
        secret: env.ACTIVITY_EVENT_SIGNATURE_SECRET,
        signature,
      })
    ) {
      this.logger.error({
        message:
          "Invalid activity payload signature - permanent error, sending to DLQ",
        rawPayload: data,
      });

      await this.retryService.sendToDlq(
        data,
        RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
        {
          "x-error-type": "permanent",
          "x-signature-error": "Invalid activity event signature",
        },
      );

      return;
    }

    const result = CreateActivitySchema.safeParse(data);

    if (!result.success) {
      this.logger.error({
        message:
          "Invalid activity payload - validation failed (permanent error, sending to DLQ)",
        rawPayload: data,
        validationErrors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });

      await this.retryService.sendToDlq(
        data,
        RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
        {
          "x-validation-error": "Validation failed",
          "x-error-type": "permanent",
        },
      );

      return;
    }

    const dto = result.data as CreateActivityDto;

    const shouldContinue = await this.retryService.handleRetryLogic(
      dto,
      headers,
      RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
      `activity create. discordId: ${dto.discordId}, userId: ${dto.userId}`,
    );

    if (!shouldContinue) {
      return;
    }

    try {
      await this.activitiesService.create(dto);
    } catch (error) {
      this.logger.error({
        message: "Failed to create activity",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId: dto?.userId,
        guildId: dto?.guildId,
        payload: data,
      });

      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE,
    queue: Queue.GUILDS_MEMBERS_REMOVE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: {
      durable: true,
      deadLetterExchange: RETRY_EXCHANGE_NAME,
      deadLetterRoutingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_RETRY,
    },
  })
  async handleGuildMemberRemoved(
    @RabbitPayload() data: unknown,
    @RabbitRequest()
    amqpMsg: AmqpMessage,
  ) {
    const result = GuildMemberRemovedSchema.safeParse(data);

    if (!result.success) {
      this.logger.error({
        message:
          "Invalid guild member removal payload - validation failed (permanent error, sending to DLQ)",
        rawPayload: data,
        validationErrors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });

      await this.retryService.sendToDlq(
        data,
        RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
        {
          "x-validation-error": "Validation failed",
          "x-error-type": "permanent",
        },
      );

      return;
    }

    const dto = result.data;
    const headers = amqpMsg?.properties.headers ?? {};
    const shouldContinue = await this.retryService.handleRetryLogic(
      dto,
      headers,
      RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
      `guild member removal. discordId: ${dto.discordId}, userId: ${dto.userId}`,
    );

    if (!shouldContinue) {
      return;
    }

    try {
      await this.activitiesService.clearActiveSessionsForMember({
        guildId: dto.guildId,
        discordId: dto.discordId,
      });
    } catch (error) {
      this.logger.error({
        message:
          "Failed to clear member activity sessions after member removal",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        guildId: dto.guildId,
        discordId: dto.discordId,
        payload: data,
      });

      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.ACTIVITY_LOG_CREATE_DLQ,
    queue: Queue.ACTIVITY_LOG_CREATE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleActivityCreateDlq(@RabbitPayload() message: unknown) {
    this.logger.warn({
      message: "Activity CREATE DLQ message - manual intervention needed",
      rawPayload: message,
    });
  }

  @RabbitSubscribe({
    exchange: DEAD_LETTER_EXCHANGE_NAME,
    routingKey: RoutingKey.GUILDS_MEMBERS_REMOVE_DLQ,
    queue: Queue.GUILDS_MEMBERS_REMOVE_DLQ,
    queueOptions: {
      durable: true,
    },
  })
  handleGuildMemberRemovedDlq(@RabbitPayload() message: unknown) {
    this.logger.warn({
      message: "Guild member removal DLQ message - manual intervention needed",
      rawPayload: message,
    });
  }

  private getHeaderValue(value: unknown): string | undefined {
    if (Array.isArray(value)) {
      const [first] = value;
      return typeof first === "string" ? first : undefined;
    }

    return typeof value === "string" ? value : undefined;
  }
}
