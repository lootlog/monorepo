export function parseOtlpHeaders(
  headersString: string,
): Record<string, string> {
  return Object.fromEntries(
    new URLSearchParams(headersString.replaceAll(",", "&")),
  );
}
