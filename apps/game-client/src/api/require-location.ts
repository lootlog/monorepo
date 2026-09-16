import { z } from "zod";
import { getFixedT } from "@/i18n/get-fixed-t";

const locationSchema = z.string().trim().min(1);

export function requireLocation(location: string): void {
  if (locationSchema.safeParse(location).success) return;

  const error = new Error(getFixedT("common")("errors.missingLocation"));
  // Local payload validation is permanent for this captured event, so do not retry.
  throw Object.assign(error, { status: 400 });
}
