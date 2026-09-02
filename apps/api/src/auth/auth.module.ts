import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { RedisModule } from "#src/lib/redis/redis.module";

@Module({
  imports: [RedisModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
