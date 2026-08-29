import { Module } from "@nestjs/common";
import { TimerSettingsService } from "./timer-settings.service.js";
import { TimerSettingsController } from "./timer-settings.controller.js";
import { SettingsDocumentsModule } from "#src/settings-documents/settings-documents.module";

@Module({
  imports: [SettingsDocumentsModule],
  providers: [TimerSettingsService],
  controllers: [TimerSettingsController],
  exports: [TimerSettingsService],
})
export class TimerSettingsModule {}
