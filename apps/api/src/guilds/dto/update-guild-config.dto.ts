import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateGuildConfigSchema = z.object({
  vanityUrl: z.string().min(1).optional(),
});

export class UpdateGuildConfigDto extends createZodDto(
  UpdateGuildConfigSchema,
) {}
