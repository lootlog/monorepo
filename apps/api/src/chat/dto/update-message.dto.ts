import * as z from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateMessageSchema = z.object({
  message: z.string().min(1).max(128),
});

export class UpdateMessageDto extends createZodDto(UpdateMessageSchema) {}
