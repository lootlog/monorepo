import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const MemberSummaryResponseSchema = z.object({
  id: z.number(),
  userId: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
  color: z.number().nullable().optional(),
});

export class MemberSummaryResponseDto extends createSchemaClass(
  MemberSummaryResponseSchema,
) {}
