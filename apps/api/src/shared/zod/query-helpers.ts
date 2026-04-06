import { z } from "zod";

export const nonEmptyString = z.string().trim().min(1);

export const booleanFromString = z.preprocess((val) => {
  if (val === "true" || val === true) return true;
  if (val === "false" || val === false) return false;
  return val;
}, z.boolean());

export const intFromString = (opts?: { min?: number; max?: number }) => {
  let schema = z.coerce.number().int();
  if (opts?.min !== undefined) schema = schema.min(opts.min);
  if (opts?.max !== undefined) schema = schema.max(opts.max);
  return schema;
};

export const commaSeparatedArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string")
      return val
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    return [val];
  }, z.array(itemSchema));
