import { generateSlug } from "#src/shared/generate-slug";
import { ErrorKey } from "./error-key.js";

const RESTRICTED_VANITY_URLS = ["me", "battles"];

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
