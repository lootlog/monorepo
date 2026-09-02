import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const CloseRespawnWindowSchema = z
  .object({
    createNewWindow: z.boolean().optional(),
    newMinSpawnTime: z.string().datetime().optional(),
    newMaxSpawnTime: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.createNewWindow) {
        return !!data.newMinSpawnTime && !!data.newMaxSpawnTime;
      }
      return true;
    },
    {
      message:
        "newMinSpawnTime and newMaxSpawnTime are required when createNewWindow is true",
    },
  );

export class CloseRespawnWindowDto extends createSchemaClass(
  CloseRespawnWindowSchema,
) {}
