import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthRedisLifecycleService } from "./auth-redis-lifecycle.service";
import { AuthService } from "./auth.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRedisLifecycleService],
})
export class AuthModule {}
