import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { EVENT_HERO_KILL_QUEUE } from "./constants/event-hero-kill-queue.constant.js";
import { PrismaModule } from "#src/db/prisma.module";
import { EventTimerHooksService } from "./services/event-timer-hooks.service.js";

@Module({
  imports: [
    BullModule.registerQueue({ name: EVENT_HERO_KILL_QUEUE }),
    PrismaModule,
  ],
  providers: [EventTimerHooksService],
  exports: [EventTimerHooksService],
})
export class EventTimerHooksModule {}
