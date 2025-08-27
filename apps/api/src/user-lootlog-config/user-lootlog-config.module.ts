import { Module } from '@nestjs/common';
import { UserLootlogConfigController } from './user-lootlog-config.controller';
import { UserLootlogConfigService } from './user-lootlog-config.service';
import { UsersModule } from 'src/users/users.module';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  controllers: [UserLootlogConfigController],
  providers: [UserLootlogConfigService],
  imports: [UsersModule, PrismaModule],
  exports: [UserLootlogConfigService],
})
export class UserLootlogConfigModule {}
