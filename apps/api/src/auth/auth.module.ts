import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AuthService } from "./auth.service.js";
import { RedisModule } from "#src/lib/redis/redis.module";

@Module({
  imports: [HttpModule, RedisModule],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
