import { Module, forwardRef } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { GuildsModule } from "src/guilds/guilds.module";
import { MembersModule } from "src/members/members.module";
import { AuthModule } from "src/auth/auth.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

@Module({
  imports: [
    GuildsModule,
    forwardRef(() => MembersModule),
    AuthModule,
    PrismaModule,
    RedisModule,
    HttpModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
