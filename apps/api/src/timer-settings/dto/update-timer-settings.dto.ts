import {
  IsOptional,
  IsBoolean,
  IsNumber,
  IsString,
  IsIn,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class TimersGeneralConfigDto {
  @ApiProperty({
    description: "Time in milliseconds to auto-remove expired timers",
    example: 30000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  removeTimerAfterMs?: number;

  @ApiProperty({
    description: "Enable/disable compact view for timers",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  compactView?: boolean;

  @ApiProperty({
    description: "Enable/disable grouping timers",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  timersGrouping?: boolean;

  @ApiProperty({
    description: "Display timers under bag UI",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  timersUnderBag?: boolean;

  @ApiProperty({
    description: "Show min or max spawn time countdown",
    example: "max",
    required: false,
    enum: ["min", "max"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["min", "max"])
  countdownMode?: "min" | "max";
}

export class TimersDisplayConfigDto {
  @ApiProperty({
    description: "Show NPC type badge",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showType?: boolean;

  @ApiProperty({
    description: "Show NPC level",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  showLevel?: boolean;

  @ApiProperty({
    description: "Font size in pixels",
    example: 11,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(8)
  @Max(24)
  fontSize?: number;

  @ApiProperty({
    description: "Minimum column width",
    example: 120,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(500)
  minColumnWidth?: number;

  @ApiProperty({
    description: "Layout mode for single timer",
    example: "row",
    required: false,
    enum: ["column", "row"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["column", "row"])
  singleTimerDisplayMode?: "column" | "row";
}

export class UpdateTimerSettingsDto {
  @ApiProperty({
    description: "General timer behavior configuration",
    required: false,
    type: TimersGeneralConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimersGeneralConfigDto)
  generalConfig?: TimersGeneralConfigDto;

  @ApiProperty({
    description: "Timer display configuration",
    required: false,
    type: TimersDisplayConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimersDisplayConfigDto)
  displayConfig?: TimersDisplayConfigDto;

  @ApiProperty({
    description: "Custom color definitions",
    example: {
      "color-1": {
        id: "color-1",
        name: "Red",
        borderColor: "#ff0000",
        backgroundColor: "#ffcccc",
      },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customColors?: Record<
    string,
    {
      id: string;
      name: string;
      borderColor: string;
      backgroundColor: string;
    }
  >;

  @ApiProperty({
    description: "NPC name to color ID mapping",
    example: { "Npc Name": "color-1" },
    required: false,
  })
  @IsOptional()
  @IsObject()
  timersColors?: Record<string, string | undefined>;

  @ApiProperty({
    description: "Custom names for default colors",
    example: { "default-red": "My Red" },
    required: false,
  })
  @IsOptional()
  @IsObject()
  defaultColorNames?: Record<string, string>;

  @ApiProperty({
    description: "Overridden default colors",
    example: {
      "default-red": { borderColor: "#ff0000", backgroundColor: "#ffcccc" },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  overriddenDefaultColors?: Record<
    string,
    { borderColor: string; backgroundColor: string }
  >;

  @ApiProperty({
    description: "Array of hidden default color IDs",
    example: ["default-red", "default-blue"],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiddenDefaultColors?: string[];

  @ApiProperty({
    description: "Global filter toggle",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  timerFiltersEnabled?: boolean;

  @ApiProperty({
    description: "Color filter toggle",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  colorFiltersEnabled?: boolean;

  @ApiProperty({
    description: "Global sort order",
    example: "desc",
    required: false,
    enum: ["asc", "desc"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"])
  timersSortOrder?: "asc" | "desc";

  @ApiProperty({
    description: "Enable/disable settings synchronization",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;
}
