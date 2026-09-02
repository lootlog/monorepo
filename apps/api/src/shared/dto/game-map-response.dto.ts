import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const GameMapResponseSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .meta({ id: "GameMapResponseDto" });

export class GameMapResponseDto extends createSchemaClass(
  GameMapResponseSchema,
) {}
