import { Module } from "@nestjs/common";
import { SchedulerModule } from "src/scheduler/scheduler.module";
import { DeliveryResultConsumer } from "./delivery-result.consumer";

@Module({
  imports: [SchedulerModule],
  providers: [DeliveryResultConsumer],
})
export class DeliveryModule {}
