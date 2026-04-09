import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateMemberSchema = z.object({
  id: z.string(),
});

export class UpdateMemberDto extends createZodDto(UpdateMemberSchema) {}
