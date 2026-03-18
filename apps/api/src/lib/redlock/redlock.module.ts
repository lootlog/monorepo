import { Module } from "@nestjs/common";
import { RedlockService } from "./redlock.service";

@Module({
  providers: [RedlockService],
  exports: [RedlockService],
})
export class RedlockModule {}
