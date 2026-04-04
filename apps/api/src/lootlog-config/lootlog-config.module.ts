import { Module } from "@nestjs/common";
import { LootlogConfigController } from "./lootlog-config.controller";
import { LootlogConfigService } from "./lootlog-config.service";
import { MemberContextModule } from "src/shared/permissions/member-context.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

@Module({
  imports: [MemberContextModule, PrismaModule, RedisModule],
  controllers: [LootlogConfigController],
  providers: [LootlogConfigService],
  exports: [LootlogConfigService],
})
export class LootlogConfigModule {}
