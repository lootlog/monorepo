import { Module, forwardRef } from '@nestjs/common';
import { UserLootlogConfigController } from './user-lootlog-config.controller';
import { UserLootlogConfigService } from './user-lootlog-config.service';
import { PrismaModule } from 'src/db/prisma.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { RedisModule } from 'src/lib/redis/redis.module';

@Module({
  controllers: [UserLootlogConfigController],
  providers: [UserLootlogConfigService],
  imports: [PrismaModule, forwardRef(() => GuildsModule), RedisModule],
  exports: [UserLootlogConfigService],
})
export class UserLootlogConfigModule {}
