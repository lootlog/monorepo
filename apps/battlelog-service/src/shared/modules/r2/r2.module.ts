import { Module } from "@nestjs/common";
import { R2Service } from "./r2.service";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [RedisModule],
  providers: [R2Service],
  exports: [R2Service],
})
export class R2Module {}
