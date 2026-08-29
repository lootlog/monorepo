import { Module } from "@nestjs/common";
import { MapTemplatesController } from "./map-templates.controller.js";
import { PrismaModule } from "#src/db/prisma.module";
import { MapTemplatesService } from "./map-templates.service.js";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";

@Module({
  imports: [PrismaModule, MemberContextModule],
  providers: [MapTemplatesService],
  controllers: [MapTemplatesController],
  exports: [MapTemplatesService],
})
export class MapTemplatesModule {}
