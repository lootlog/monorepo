import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const CreateCommentSchema = z.object({
  content: z.string().min(1),
});

export class CreateCommentDto extends createSchemaClass(CreateCommentSchema) {}
