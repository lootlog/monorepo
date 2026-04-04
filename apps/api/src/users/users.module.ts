import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { MembersModule } from "src/members/members.module";
import { AuthModule } from "src/auth/auth.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

@Module({
  imports: [MembersModule, AuthModule, PrismaModule, RedisModule, HttpModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
