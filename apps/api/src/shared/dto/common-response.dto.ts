import { createSchemaClass } from "#src/shared/validation/schema-class";
import * as z from "zod";

const CountResponseSchema = z.object({
  count: z.number(),
});

export class CountResponseDto extends createSchemaClass(CountResponseSchema) {}

const StatusOkResponseSchema = z.object({
  status: z.literal("OK"),
});

export class StatusOkResponseDto extends createSchemaClass(
  StatusOkResponseSchema,
) {}

const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

export class SuccessResponseDto extends createSchemaClass(
  SuccessResponseSchema,
) {}
