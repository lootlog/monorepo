import { z } from "zod";
import { createZodDto } from "nestjs-zod";

const UpdateUserPreferencesSchema = z.object({
  guildsOrder: z
    .array(z.string())
    .nonempty()
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "guildsOrder must contain unique values",
    })
    .optional(),
  theme: z
    .enum([
      "default",
      "cyberpunk",
      "pastel",
      "fantasy",
      "shonen",
      "onepiece",
      "anime",
      "goth",
      "halloween",
      "realmadrid",
      "realmadrid-3rd",
      "barcelona",
      "waguri",
      "rukia",
      "rias",
      "cat-pink",
      "cat-purple",
      "cat-blue",
      "cat-random",
    ])
    .optional(),
  colorMode: z.enum(["light", "dark"]).optional(),
});

export class UpdateUserPreferencesDto extends createZodDto(
  UpdateUserPreferencesSchema,
) {}
