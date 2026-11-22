import { getFixedT } from "@/i18n/get-fixed-t";

export function requireLocation(location: string): void {
  if (location.trim()) return;

  const error = new Error(getFixedT("common")("errors.missingLocation"));
  throw Object.assign(error, { status: 400 });
}
