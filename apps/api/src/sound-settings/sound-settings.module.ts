import { Module } from '@nestjs/common';
import { SoundSettingsService } from './sound-settings.service';
import { SoundSettingsController } from './sound-settings.controller';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SoundSettingsService],
  controllers: [SoundSettingsController],
  exports: [SoundSettingsService],
})
export class SoundSettingsModule {}
