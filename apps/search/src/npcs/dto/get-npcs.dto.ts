import { z } from "zod";

export type GetNpcsDto = {
  limit: number;
  search?: string | string[];
};

export const getNpcsQuerySchema = z.object({
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
