import { Module } from "@nestjs/common";
import { HealthzController } from "./healthz.controller";
import { HealthzService } from "./healthz.service";

@Module({
  controllers: [HealthzController],
  providers: [HealthzService],
})
export class HealthzModule {}
