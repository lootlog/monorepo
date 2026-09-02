import { createZodDto } from "nestjs-zod";
import * as z from "zod";

const MemberReferenceResponseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  color: z.number().nullable(),
  active: z.boolean(),
});

export class MemberReferenceResponseDto extends createZodDto(
  MemberReferenceResponseSchema,
) {}
