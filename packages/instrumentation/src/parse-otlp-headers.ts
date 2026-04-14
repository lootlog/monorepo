export function parseOtlpHeaders(
  headersString: string,
): Record<string, string> {
  const paramsString = headersString.replaceAll(",", "&");
  return Object.fromEntries(new URLSearchParams(paramsString));
}
