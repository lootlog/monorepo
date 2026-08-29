import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthRedisLifecycleService } from "./auth-redis-lifecycle.service.js";
import { AuthService } from "./auth.service.js";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRedisLifecycleService],
})
export class AuthModule {}
