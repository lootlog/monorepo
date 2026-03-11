import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class KillNpcDto {
  @ApiProperty({ example: 12345, description: "NPC ID (negative for NPCs)" })
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @ApiProperty({ example: "Boss Name", description: "NPC name" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 100, description: "NPC level" })
  @IsNotEmpty()
  @IsNumber()
  lvl: number;

  @ApiProperty({ example: "w", description: "NPC profession shortname" })
  @IsOptional()
  @IsString()
  prof?: string;

  @ApiProperty({
    example: 85,
    description: "NPC weight (wt) - used to determine NPC type",
  })
  @IsNotEmpty()
  @IsNumber()
  wt: number;

  @ApiProperty({ example: "npc_icon.gif", description: "NPC icon" })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class CreateKillDto {
  @ApiProperty({ example: "pandora", description: "World name" })
  @IsNotEmpty()
  @IsString()
  world: string;

  @ApiProperty({ type: KillNpcDto, description: "NPC data" })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => KillNpcDto)
  npc: KillNpcDto;

  @ApiProperty({
    example: "12345",
    description: "Character ID (for config lookup)",
  })
  @IsNotEmpty()
  @IsString()
  characterId: string;

  @ApiProperty({
    example: "67890",
    description: "Account ID (for config lookup)",
  })
  @IsNotEmpty()
  @IsString()
  accountId: string;
}
