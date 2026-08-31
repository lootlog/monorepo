import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { HealthzController } from "./healthz.controller.js";
import { prismaProvider } from "#src/shared/db/prisma.provider";

@Module({
  imports: [TerminusModule, HttpModule],
  providers: [prismaProvider],
  controllers: [HealthzController],
})
export class HealthzModule {}
