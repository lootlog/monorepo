import { z } from "zod";

export type GetPlayersDto = {
  limit: number;
  search?: string;
};

export const getPlayersQuerySchema = z.object({
  limit: z.string().optional().default("10").transform(Number),
  search: z.string().optional(),
});
