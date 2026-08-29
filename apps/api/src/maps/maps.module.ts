import { Module } from "@nestjs/common";
import { RedisModule } from "#src/lib/redis/redis.module";
import { MapsController } from "./maps.controller.js";
import { MapsService } from "./maps.service.js";

@Module({
  imports: [RedisModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
