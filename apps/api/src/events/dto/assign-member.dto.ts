import * as z from "zod";
import { createSchemaClass } from "#src/shared/validation/schema-class";

const AssignMemberSchema = z.object({
  memberId: z.number().int(),
});

export class AssignMemberDto extends createSchemaClass(AssignMemberSchema) {}
