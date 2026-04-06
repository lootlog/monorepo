import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const CreateCommentSchema = z.object({
  content: z.string().min(1),
});

export class CreateCommentDto extends createZodDto(CreateCommentSchema) {}
