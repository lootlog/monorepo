import { type z } from "zod";

export const parseSchema = <T extends z.ZodTypeAny>(
  data: Record<string, any>,
  schema: T
) => {
  return schema.parse(data) as z.infer<T>;
};
