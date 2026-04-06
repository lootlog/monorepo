/**
 * Parses a comma-separated string into an array of trimmed, non-empty strings.
 * Passes through arrays unchanged and returns undefined for falsy values.
 * Intended for use with class-transformer @Transform decorator.
 */
export const parseCommaSeparated = ({
  value,
}: {
  value: unknown;
}): string[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
};
