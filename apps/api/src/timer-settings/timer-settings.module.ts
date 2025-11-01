import { Module } from '@nestjs/common';
import { TimerSettingsService } from './timer-settings.service';
import { TimerSettingsController } from './timer-settings.controller';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TimerSettingsService],
  controllers: [TimerSettingsController],
  exports: [TimerSettingsService],
})
export class TimerSettingsModule {}
