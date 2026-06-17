export function mapActivityDetails(
  details: unknown,
): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return undefined;
  }

  return details as Record<string, unknown>;
}
