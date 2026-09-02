import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const CreateWatchedItemQuickAddSchema = z.object({
  itemId: z.number().int(),
  itemName: z.string().min(1).max(255),
  world: z.string().min(1).max(50),
  guildId: z.string().min(1).max(50),
});

export class CreateWatchedItemQuickAddDto extends createZodDto(
  CreateWatchedItemQuickAddSchema,
) {}
