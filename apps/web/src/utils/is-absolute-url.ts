export function isAbsoluteUrl(url: string): boolean {
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("//")
  );
}
