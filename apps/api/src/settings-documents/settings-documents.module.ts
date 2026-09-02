import { Module } from "@nestjs/common";
import { DrizzleDatabaseModule } from "#src/database/drizzle/drizzle-database.module";
import { SettingsDocumentsController } from "./settings-documents.controller.js";
import { SettingsDocumentsRepository } from "./settings-documents.repository.js";
import { SettingsDocumentsService } from "./settings-documents.service.js";

@Module({
  imports: [DrizzleDatabaseModule],
  controllers: [SettingsDocumentsController],
  providers: [SettingsDocumentsRepository, SettingsDocumentsService],
  exports: [SettingsDocumentsService],
})
export class SettingsDocumentsModule {}
