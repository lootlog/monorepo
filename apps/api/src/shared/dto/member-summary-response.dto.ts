import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const MemberSummaryResponseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  color: z.number().nullable().optional(),
});

export class MemberSummaryResponseDto extends createZodDto(
  MemberSummaryResponseSchema,
) {}
