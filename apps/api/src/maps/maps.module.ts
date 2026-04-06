import { Module } from "@nestjs/common";
import { RedisModule } from "src/lib/redis/redis.module";
import { MapsController } from "./maps.controller";
import { MapsService } from "./maps.service";

@Module({
  imports: [RedisModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
