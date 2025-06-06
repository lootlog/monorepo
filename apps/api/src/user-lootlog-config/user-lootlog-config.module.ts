import { Module } from '@nestjs/common';
import { UserLootlogConfigController } from './user-lootlog-config.controller';
import { UserLootlogConfigService } from './user-lootlog-config.service';
import { PrismaService } from 'src/db/prisma.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  controllers: [UserLootlogConfigController],
  providers: [UserLootlogConfigService, PrismaService],
  imports: [UsersModule],
  exports: [UserLootlogConfigService],
})
export class UserLootlogConfigModule {}
