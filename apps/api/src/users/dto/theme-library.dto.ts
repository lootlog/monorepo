import { ThemeLibrarySchema, ThemePatchRequestSchema } from "@lootlog/types";
import { createZodDto } from "nestjs-zod";

export class ThemeLibraryResponseDto extends createZodDto(ThemeLibrarySchema) {}

export class PatchThemeLibraryDto extends createZodDto(
  ThemePatchRequestSchema,
) {}
