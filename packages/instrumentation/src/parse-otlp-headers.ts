export function parseOtlpHeaders(
  headersString: string,
): Record<string, string> {
  const params = new URLSearchParams(headersString.replaceAll(",", "&"));
  return Object.fromEntries(params);
}
