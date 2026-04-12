export const isAbsoluteIconUrl = (url: string): boolean =>
  url.startsWith("http://") ||
  url.startsWith("https://") ||
  url.startsWith("//");
