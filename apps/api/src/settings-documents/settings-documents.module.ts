import { Module } from "@nestjs/common";
import { PrismaModule } from "src/db/prisma.module";
import { SettingsDocumentsController } from "./settings-documents.controller";
import { SettingsDocumentsService } from "./settings-documents.service";

@Module({
  imports: [PrismaModule],
  controllers: [SettingsDocumentsController],
  providers: [SettingsDocumentsService],
  exports: [SettingsDocumentsService],
})
export class SettingsDocumentsModule {}
