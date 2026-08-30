export function parseOtlpHeaders(
  headersString?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!headersString) return headers;

  const paramsString = headersString.replaceAll(",", "&");
  const params = new URLSearchParams(paramsString);

  params.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}
