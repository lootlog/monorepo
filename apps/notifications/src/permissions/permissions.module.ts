import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { PermissionsService } from "./permissions.service";

@Module({
  imports: [HttpModule],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
