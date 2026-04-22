import type { Prisma } from "src/generated/prisma/client";
import { z } from "zod";

export const isoDatetimeCodec = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (value) => value.toISOString(),
});

export const nullableIsoDatetimeCodec = isoDatetimeCodec.nullable();

export const unknownRecordSchema = z.record(z.string(), z.unknown());

const rawJsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
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
