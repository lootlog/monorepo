import { generateSlug } from "#src/shared/generate-slug";
import { ErrorKey } from "./error-key.js";

// First path segments on lootlog.pl that a vanity URL would be unreachable
// under: routes the traffic splitter sends to the landing page or the docs
// (apps/traffic-splitter/src/index.ts), and the Web app's own static routes
// and public directories. `me` is the slug of `@me`.
const RESTRICTED_VANITY_URLS = [
  "me",
  "battles",
  "signin",
  "init",
  "assets",
  "brand",
  "lottie",
  "themes",
  "docs",
  "docs-assets",
  "landing-assets",
  "screenshots",
  "privacy-policy",
  "terms-of-service",
];

const ALL_DIGITS = /^\d+$/;

/**
 * Slugs the requested vanity URL and validates the stored form. Organization
 * ids are Discord snowflakes, so an all-digit slug could impersonate one.
 */
export const parseVanityUrl = (
  input: string,
):
  | { readonly slug: string; readonly error?: undefined }
  | { readonly slug?: undefined; readonly error: ErrorKey } => {
  const slug = generateSlug(input);

  if (!slug || ALL_DIGITS.test(slug)) {
    return { error: ErrorKey.GUILDS_VANITY_URL_INVALID };
  }

  if (RESTRICTED_VANITY_URLS.includes(slug)) {
    return { error: ErrorKey.GUILDS_VANITY_URL_RESTRICTED };
  }

  return { slug };
};
