import { Module } from '@nestjs/common';
import { KillsService } from './kills.service';
import { KillsController } from './kills.controller';
import { PrismaModule } from 'src/db/prisma.module';
import { RedisModule } from 'src/lib/redis/redis.module';
import { MembersModule } from 'src/members/members.module';
import { GuildsModule } from 'src/guilds/guilds.module';

@Module({
  imports: [PrismaModule, RedisModule, MembersModule, GuildsModule],
  providers: [KillsService],
  controllers: [KillsController],
  exports: [KillsService],
})
export class KillsModule {}
