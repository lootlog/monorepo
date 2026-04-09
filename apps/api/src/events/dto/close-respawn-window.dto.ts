import { z } from "zod";
import { createZodDto } from "nestjs-zod";

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

export class CloseRespawnWindowDto extends createZodDto(
  CloseRespawnWindowSchema,
) {}
