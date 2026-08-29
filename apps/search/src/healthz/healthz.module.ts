import { Module } from "@nestjs/common";
import { HealthzController } from "./healthz.controller.js";
import { HealthzService } from "./healthz.service.js";

@Module({
  controllers: [HealthzController],
  providers: [HealthzService],
})
export class HealthzModule {}
