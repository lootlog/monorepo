import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const CreateWatchedItemSchema = z.object({
  itemId: z.number().int(),
  itemName: z.string().min(1).max(255),
  world: z.string().min(1).max(50),
  guildIds: z.array(z.string().max(50)).min(1).max(20),
});

export class CreateWatchedItemDto extends createSchemaClass(
  CreateWatchedItemSchema,
) {}
