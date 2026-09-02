import { Module } from "@nestjs/common";
import { KillsService } from "./kills.service.js";
import { KillsController } from "./kills.controller.js";
import { RedisModule } from "#src/lib/redis/redis.module";
import { MembersModule } from "#src/members/members.module";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { UserLootlogConfigModule } from "#src/user-lootlog-config/user-lootlog-config.module";
import { GuildsModule } from "#src/guilds/guilds.module";
import { KillsRepository } from "./kills.repository.js";

@Module({
  imports: [
    RedisModule,
    MembersModule,
    MemberContextModule,
    UserLootlogConfigModule,
    GuildsModule,
  ],
  providers: [KillsService, KillsRepository],
  controllers: [KillsController],
  exports: [KillsService],
})
export class KillsModule {}
