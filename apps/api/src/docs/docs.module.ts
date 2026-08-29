import { Module } from "@nestjs/common";
import { PrismaModule } from "#src/db/prisma.module";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { DocsController } from "./docs.controller.js";
import { DocsService } from "./docs.service.js";

@Module({
  imports: [PrismaModule, MemberContextModule],
  controllers: [DocsController],
  providers: [DocsService],
  exports: [DocsService],
})
export class DocsModule {}
