import { z } from "zod";
import {
  temporalToDate,
  type DatabaseTimestamp,
} from "#src/shared/db/temporal";

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

export const unknownRecordSchema = z.record(z.string(), z.unknown());
