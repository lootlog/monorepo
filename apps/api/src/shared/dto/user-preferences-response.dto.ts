import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const UserPreferencesResponseSchema = z.object({
  userId: z.string(),
  guildsOrder: z.array(z.string()),
  theme: z.string(),
  colorMode: z.string(),
});

export class UserPreferencesResponseDto extends createZodDto(
  UserPreferencesResponseSchema,
) {}
