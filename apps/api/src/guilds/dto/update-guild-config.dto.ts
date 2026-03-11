import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateGuildConfigDto {
  @ApiProperty({
    description: "Custom vanity URL for the guild",
    example: "my-awesome-guild",
    required: false,
  })
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  vanityUrl?: string;
}
