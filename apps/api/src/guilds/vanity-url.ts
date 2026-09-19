import { generateSlug } from "#src/shared/generate-slug";
import { ErrorKey } from "./error-key.js";

// Stored vanity URLs are slugs, so the list holds slugs. `battles` is the Web
// app's public battle route and would never reach the Organization.
const RESTRICTED_VANITY_URLS = new Set(["battles"]);

const ALL_DIGITS = /^\d+$/;

/**
 * Organization ids are Discord snowflakes: decimal digits only. Treating every
 * all-digit value as an id, whatever its length, keeps ids and vanity URLs in
 * disjoint sets without depending on how long a snowflake currently is.
 */
export const isOrganizationIdLike = (value: string) => ALL_DIGITS.test(value);

/** Slugs the requested vanity URL and validates the form that gets stored. */
export const parseVanityUrl = (
  input: string,
):
  | { readonly slug: string; readonly error?: undefined }
  | { readonly slug?: undefined; readonly error: ErrorKey } => {
  const slug = generateSlug(input);

  if (!slug || isOrganizationIdLike(slug)) {
    return { error: ErrorKey.GUILDS_VANITY_URL_INVALID };
  }

  if (RESTRICTED_VANITY_URLS.has(slug)) {
    return { error: ErrorKey.GUILDS_VANITY_URL_RESTRICTED };
  }

  return { slug };
};
