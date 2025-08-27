import { forwardRef, Module } from '@nestjs/common';
import { LootlogConfigController } from './lootlog-config.controller';
import { LootlogConfigService } from './lootlog-config.service';
import { MembersModule } from 'src/members/members.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [MembersModule, forwardRef(() => GuildsModule), PrismaModule],
  controllers: [LootlogConfigController],
  providers: [LootlogConfigService],
  exports: [LootlogConfigService],
})
export class LootlogConfigModule {}
