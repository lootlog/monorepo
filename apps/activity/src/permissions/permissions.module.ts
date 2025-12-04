import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';

@Module({
  imports: [HttpModule],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
