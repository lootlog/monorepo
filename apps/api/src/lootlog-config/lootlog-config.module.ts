import { Module } from "@nestjs/common";
import { LootlogConfigController } from "./lootlog-config.controller.js";
import { LootlogConfigService } from "./lootlog-config.service.js";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { RedisModule } from "#src/lib/redis/redis.module";

@Module({
  imports: [MemberContextModule, RedisModule],
  controllers: [LootlogConfigController],
  providers: [LootlogConfigService],
  exports: [LootlogConfigService],
})
export class LootlogConfigModule {}
