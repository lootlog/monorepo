import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const CreateWatchedItemSchema = z.object({
  itemId: z.number().int(),
  itemName: z.string().min(1).max(255),
  world: z.string().min(1).max(50),
  guildIds: z.array(z.string().max(50)).min(1).max(20),
});

export class CreateWatchedItemDto extends createZodDto(
  CreateWatchedItemSchema,
) {}
