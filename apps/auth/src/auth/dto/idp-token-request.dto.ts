import { z } from "zod";

export const idpTokenRequestSchema = z
  .object({
    userId: z.string().trim().min(1),
    discordId: z.string().trim().min(1),
  })
  .strict();

export type IdpTokenRequestDto = z.infer<typeof idpTokenRequestSchema>;
