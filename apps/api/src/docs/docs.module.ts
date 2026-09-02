import { Module } from "@nestjs/common";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { DocsController } from "./docs.controller.js";
import { DocsService } from "./docs.service.js";
import { DocsRepository } from "./docs.repository.js";

@Module({
  imports: [MemberContextModule],
  controllers: [DocsController],
  providers: [DocsRepository, DocsService],
  exports: [DocsService],
})
export class DocsModule {}
