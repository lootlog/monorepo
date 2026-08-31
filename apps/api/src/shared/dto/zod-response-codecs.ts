import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import { z } from "zod";
import { temporalToDate, type DatabaseTimestamp } from "#src/db/temporal";

type JsonValue = DatabaseJsonValue;

const databaseDatetimeSchema = z.custom<Date | DatabaseTimestamp>((value) => {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  try {
    temporalToDate(value as DatabaseTimestamp);
    return true;
  } catch {
    return false;
  }
});

export const isoDatetimeCodec = z.codec(
  z.iso.datetime(),
  databaseDatetimeSchema,
  {
    decode: (value) => new Date(value),
    encode: (value) => temporalToDate(value).toISOString(),
  },
);

export const nullableIsoDatetimeCodec = isoDatetimeCodec.nullable();

export const flexibleIsoDatetimeCodec = z.codec(
  z.iso.datetime(),
  z.union([databaseDatetimeSchema, z.iso.datetime()]),
  {
    decode: (value) => new Date(value),
    encode: (value) =>
      typeof value === "string" ? value : temporalToDate(value).toISOString(),
  },
);

export const nullableFlexibleIsoDatetimeCodec =
  flexibleIsoDatetimeCodec.nullable();

export const unknownRecordSchema = z.record(z.string(), z.unknown());

const rawJsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(rawJsonValueSchema),
    z.record(z.string(), rawJsonValueSchema),
  ]),
);

export const jsonValueSchema = rawJsonValueSchema;
