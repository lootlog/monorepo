import { Global, Module } from "@nestjs/common";
import { DrizzleService } from "./drizzle.service.js";

@Global()
@Module({
  providers: [DrizzleService],
  exports: [DrizzleService],
})
export class DrizzleModule {}
