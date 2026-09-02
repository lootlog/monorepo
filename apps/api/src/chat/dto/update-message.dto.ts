import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const UpdateMessageSchema = z.object({
  message: z.string().min(1).max(128),
});

export class UpdateMessageDto extends createSchemaClass(UpdateMessageSchema) {}
