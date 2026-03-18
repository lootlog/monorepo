import { Module } from "@nestjs/common";
import { SoundSettingsController } from "src/sound-settings/sound-settings.controller";
import { PrismaModule } from "src/db/prisma.module";
import { SoundSettingsService } from "src/sound-settings/sound-settings.service";

@Module({
  imports: [PrismaModule],
  providers: [SoundSettingsService],
  controllers: [SoundSettingsController],
  exports: [SoundSettingsService],
})
export class SoundSettingsModule {}
