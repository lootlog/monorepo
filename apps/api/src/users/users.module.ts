import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { UsersService } from "./users.service.js";
import { UsersController } from "./users.controller.js";
import { MembersModule } from "#src/members/members.module";
import { AuthModule } from "#src/auth/auth.module";
import { PrismaModule } from "#src/db/prisma.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { GuildsModule } from "#src/guilds/guilds.module";

@Module({
  imports: [
    MembersModule,
    AuthModule,
    PrismaModule,
    RedisModule,
    HttpModule,
    GuildsModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
