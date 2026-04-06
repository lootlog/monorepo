import { z } from "zod";

export const levelFilterSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(500)
  .optional();
