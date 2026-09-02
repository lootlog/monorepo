import { Module } from "@nestjs/common";
import { UsersService } from "./users.service.js";
import { UsersRepository } from "./users.repository.js";
import { UsersController } from "./users.controller.js";
import { MembersModule } from "#src/members/members.module";
import { AuthModule } from "#src/auth/auth.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { GuildsModule } from "#src/guilds/guilds.module";

@Module({
  imports: [MembersModule, AuthModule, RedisModule, GuildsModule],
  providers: [UsersRepository, UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
