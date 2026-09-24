import { parseVanityUrl as parseOrganizationVanityUrl } from "@lootlog/domain/organization-vanity-url";
import { ErrorKey } from "./error-key.js";

/** Slugs the requested vanity URL and validates the form that gets stored. */
export const parseVanityUrl = (
  input: string,
):
  | { readonly slug: string; readonly error?: undefined }
  | { readonly slug?: undefined; readonly error: ErrorKey } => {
  const result = parseOrganizationVanityUrl(input);

  if (result.success === false) {
    return {
      error:
        result.reason === "invalid"
          ? ErrorKey.GUILDS_VANITY_URL_INVALID
          : ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
    };
  }

  return { slug: result.slug };
};
