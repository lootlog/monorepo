import { forwardRef, Module } from "@nestjs/common";
import { LootlogConfigController } from "./lootlog-config.controller";
import { LootlogConfigService } from "./lootlog-config.service";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

@Module({
  imports: [
    MembersModule,
    forwardRef(() => GuildsModule),
    PrismaModule,
    RedisModule,
  ],
  controllers: [LootlogConfigController],
  providers: [LootlogConfigService],
  exports: [LootlogConfigService],
})
export class LootlogConfigModule {}
