import { z } from "zod";

export const isoDatetimeCodec = z.codec(z.iso.datetime(), z.date(), {
  decode: (value) => new Date(value),
  encode: (value) => value.toISOString(),
});

export const unknownRecordSchema = z.record(z.string(), z.unknown());
