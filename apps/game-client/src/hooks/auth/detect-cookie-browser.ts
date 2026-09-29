export type CookieBrowser = "brave" | "chrome" | "firefox" | "safari";

/** Picks the cookie settings guidance that matches the player's browser. */
export const detectCookieBrowser = (
  browser: Pick<Navigator, "userAgent"> = navigator,
): CookieBrowser => {
  if ("brave" in browser) return "brave";

  const { userAgent } = browser;

  if (/Firefox\//u.test(userAgent)) return "firefox";

  if (/Safari\//u.test(userAgent) && !/Chrom(e|ium)\//u.test(userAgent))
    return "safari";

  return "chrome";
};
