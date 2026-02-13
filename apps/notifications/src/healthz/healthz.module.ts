import { Module } from "@nestjs/common";
import { HealthzController } from "./healthz.controller";

@Module({
  controllers: [HealthzController],
})
export class HealthzModule {}
