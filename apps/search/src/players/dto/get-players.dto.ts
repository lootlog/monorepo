import { z } from "zod";

export type GetPlayersDto = {
  limit: number;
  search?: string | string[];
};

export const getPlayersQuerySchema = z.object({
  limit: z.string().optional().default("10").transform(Number),
  search: z
    .string()
    .optional()
    .transform((val) => {
      if (val?.includes(",")) {
        return val.split(",").map((s) => s.trim());
      }

      return val;
    }),
});
