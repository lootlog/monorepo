import { Permission } from 'generated/client';
import { IsEnum, IsNumber } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @IsNumber()
  lvlRangeFrom: number;

  @IsNumber()
  lvlRangeTo: number;
}
