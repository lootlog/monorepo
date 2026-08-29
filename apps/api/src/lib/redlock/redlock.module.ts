import { Module } from "@nestjs/common";
import { RedlockService } from "./redlock.service.js";

@Module({
  providers: [RedlockService],
  exports: [RedlockService],
})
export class RedlockModule {}
