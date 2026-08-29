import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { GuildsService } from "#src/guilds/guilds.service";
import { RedisModule } from "#src/lib/redis/redis.module";

@Module({
  imports: [HttpModule, RedisModule],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}
