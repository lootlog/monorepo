import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const OpenRespawnWindowSchema = z
  .object({
    minSpawnTime: z.string().min(1).datetime(),
    maxSpawnTime: z.string().min(1).datetime(),
  })
  .refine(
    (data) => Date.parse(data.maxSpawnTime) >= Date.parse(data.minSpawnTime),
    {
      message: "maxSpawnTime must not be before minSpawnTime",
      path: ["maxSpawnTime"],
    },
  );

export class OpenRespawnWindowDto extends createSchemaClass(
  OpenRespawnWindowSchema,
) {}
