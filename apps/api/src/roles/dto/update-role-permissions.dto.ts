import { Permission } from "prisma/generated/client";
import { IsEnum, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateRolePermissionsDto {
  @ApiProperty({
    description: "Array of permissions to assign to the role",
    example: ["LOOTLOG_READ", "LOOTLOG_WRITE"],
    enum: Permission,
    isArray: true,
  })
  @IsEnum(Permission, { each: true })
  permissions: Permission[];

  @ApiProperty({
    description: "Minimum level requirement for role members",
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  lvlRangeFrom: number;

  @ApiProperty({
    description: "Maximum level requirement for role members",
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  lvlRangeTo: number;
}
