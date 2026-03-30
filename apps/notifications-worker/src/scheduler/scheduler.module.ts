import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NOTIFICATION_EXECUTE_QUEUE } from "src/enums/queue.enum";
import { SchedulerService } from "./scheduler.service";
import { NotificationJobProcessor } from "./notification-job.processor";

@Module({
  imports: [
    BullModule.registerQueue({
      name: NOTIFICATION_EXECUTE_QUEUE,
    }),
  ],
  providers: [SchedulerService, NotificationJobProcessor],
  exports: [SchedulerService],
})
export class SchedulerModule {}
