import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const AssignMemberSchema = z.object({
  memberId: z.number().int(),
});

export class AssignMemberDto extends createZodDto(AssignMemberSchema) {}
