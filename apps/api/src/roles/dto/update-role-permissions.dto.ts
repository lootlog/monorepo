import { Permission } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsEnum(Permission, { each: true })
  permissions: Permission[];
}
