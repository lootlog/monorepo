import { Module } from "@nestjs/common";
import { MapTemplatesController } from "./map-templates.controller.js";
import { MapTemplatesService } from "./map-templates.service.js";
import { MapTemplatesRepository } from "./map-templates.repository.js";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";

@Module({
  imports: [MemberContextModule],
  providers: [MapTemplatesService, MapTemplatesRepository],
  controllers: [MapTemplatesController],
  exports: [MapTemplatesService],
})
export class MapTemplatesModule {}
