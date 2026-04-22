import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const CountResponseSchema = z.object({
  count: z.number(),
});

export class CountResponseDto extends createZodDto(CountResponseSchema) {}

const StatusOkResponseSchema = z.object({
  status: z.literal("OK"),
});

export class StatusOkResponseDto extends createZodDto(StatusOkResponseSchema) {}

const SuccessResponseSchema = z.object({
  success: z.boolean(),
});

export class SuccessResponseDto extends createZodDto(SuccessResponseSchema) {}
