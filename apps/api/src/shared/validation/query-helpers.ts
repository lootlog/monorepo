import * as z from "zod";

type IntFromStringOptions = { min?: number; max?: number };

const emptyStringToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

const parseBooleanFromString = (value: unknown): unknown => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
};

const parseCommaSeparatedArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [value];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const booleanFromString = z.preprocess(
  parseBooleanFromString,
  z.boolean(),
);

export const optionalFromQuery = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyStringToUndefined, schema.optional()).optional();

export const intFromString = (options?: IntFromStringOptions) => {
  let schema = z.coerce.number().int();
  if (options?.min !== undefined) schema = schema.min(options.min);
  if (options?.max !== undefined) schema = schema.max(options.max);
  return z.preprocess(emptyStringToUndefined, schema);
};

export const commaSeparatedArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess(parseCommaSeparatedArray, z.array(itemSchema));
