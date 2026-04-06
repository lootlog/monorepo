import { z } from "zod";

export const booleanFromString = z.preprocess(
  (val) => val === "true" || val === true,
  z.boolean(),
);

export const intFromString = (opts?: { min?: number; max?: number }) => {
  let schema = z.coerce.number().int();
  if (opts?.min !== undefined) schema = schema.min(opts.min);
  if (opts?.max !== undefined) schema = schema.max(opts.max);
  return schema;
};

export const commaSeparatedArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") return val.split(",").map((v) => v.trim());
    return [val];
  }, z.array(itemSchema));
