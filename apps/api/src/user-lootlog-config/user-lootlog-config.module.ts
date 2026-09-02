import { Module } from "@nestjs/common";
import { UserLootlogConfigController } from "./user-lootlog-config.controller.js";
import { UserLootlogConfigService } from "./user-lootlog-config.service.js";
import { UserLootlogConfigRepository } from "./user-lootlog-config.repository.js";
import { GuildsModule } from "#src/guilds/guilds.module";
import { RedisModule } from "#src/lib/redis/redis.module";

@Module({
  controllers: [UserLootlogConfigController],
  providers: [UserLootlogConfigRepository, UserLootlogConfigService],
  imports: [GuildsModule, RedisModule],
  exports: [UserLootlogConfigService],
})
export class UserLootlogConfigModule {}
