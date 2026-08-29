import { Module } from "@nestjs/common";
import { SoundSettingsController } from "#src/sound-settings/sound-settings.controller";
import { SoundSettingsService } from "#src/sound-settings/sound-settings.service";
import { SettingsDocumentsModule } from "#src/settings-documents/settings-documents.module";

@Module({
  imports: [SettingsDocumentsModule],
  providers: [SoundSettingsService],
  controllers: [SoundSettingsController],
  exports: [SoundSettingsService],
})
export class SoundSettingsModule {}
