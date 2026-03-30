import { Injectable, Logger } from "@nestjs/common";
import {
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from "@golevelup/nestjs-rabbitmq";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enums/routing-key.enum";
import { Queue } from "src/enums/queue.enum";
import { SchedulerService } from "src/scheduler/scheduler.service";

interface DeliveryResultPayload {
  jobId?: string;
  idempotencyKey: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class DeliveryResultConsumer {
  private readonly logger = new Logger(DeliveryResultConsumer.name);

  constructor(private readonly schedulerService: SchedulerService) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
    queue: Queue.NOTIFICATIONS_DELIVERY_RESULT,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: { durable: true },
  })
  async handleDeliveryResult(payload: DeliveryResultPayload) {
    if (!payload.jobId) {
      this.logger.debug(
        `Delivery result without jobId (instant notification): ${payload.idempotencyKey}`,
      );
      return;
    }

    if (payload.success) {
      await this.schedulerService.markJobCompleted(payload.jobId);
      this.logger.debug(`Job ${payload.jobId} completed successfully`);
    } else {
      await this.schedulerService.incrementAttemptAndFail(
        payload.jobId,
        payload.error ?? "Unknown delivery error",
      );
      this.logger.warn(
        `Job ${payload.jobId} delivery failed: ${payload.error}`,
      );
    }
  }
}
