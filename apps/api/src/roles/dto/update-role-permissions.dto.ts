import { Permission } from "src/generated/prisma/client";
import { IsEnum, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { swaggerStringEnumArray } from "src/shared/swagger/prisma-enum";

export class UpdateRolePermissionsDto {
  @ApiProperty({
    ...swaggerStringEnumArray("Permission", Permission),
    description: "Array of permissions to assign to the role",
    example: ["LOOTLOG_READ", "LOOTLOG_WRITE"],
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
