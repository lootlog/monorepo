export function parseOtlpHeaders(
  headersString: string,
): Record<string, string> {
  const paramsString = headersString.replaceAll(",", "&");
  const params = new URLSearchParams(paramsString);
  return Object.fromEntries(params);
}
