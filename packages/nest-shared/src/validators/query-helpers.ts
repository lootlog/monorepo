import { z } from "zod";

type IntFromStringOptions = {
  min?: number;
  max?: number;
};

export const nonEmptyString = z.string().trim().min(1);

const emptyStringToUndefined = (value: unknown): unknown => {
  if (value === "") return undefined;
  return value;
};

const parseBooleanFromString = (value: unknown): unknown => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
};

const parseCommaSeparatedArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(",")
      .map((arrayValue) => arrayValue.trim())
      .filter((arrayValue) => arrayValue.length > 0);
  }

  return [value];
};

export const booleanFromString = z.preprocess(
  parseBooleanFromString,
  z.boolean(),
);

export const optionalFromQuery = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyStringToUndefined, schema.optional());

export const intFromString = (opts?: IntFromStringOptions) => {
  let schema = z.coerce.number().int();
  if (opts?.min !== undefined) {
    schema = schema.min(opts.min);
  }
  if (opts?.max !== undefined) {
    schema = schema.max(opts.max);
  }
  return z.preprocess(emptyStringToUndefined, schema);
};

export const commaSeparatedArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess(parseCommaSeparatedArray, z.array(itemSchema));
