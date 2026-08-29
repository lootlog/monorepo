import { Module } from "@nestjs/common";
import { HealthzService } from "./healthz.service.js";
import { HealthzController } from "./healthz.controller.js";

@Module({
  providers: [HealthzService],
  controllers: [HealthzController],
})
export class HealthzModule {}
