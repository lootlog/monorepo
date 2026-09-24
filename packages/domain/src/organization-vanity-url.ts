// This public Web route cannot also address an Organization.
const RESTRICTED_VANITY_URLS = new Set(["battles"]);

// Organization ids are Discord snowflakes. Keep every all-digit slug in the
// id namespace, regardless of length, to prevent ambiguous lookups.
export const isOrganizationIdLike = (value: string) => /^\d+$/.test(value);

export const normalizeVanityUrl = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const parseVanityUrl = (
  input: string,
):
  | { readonly success: true; readonly slug: string }
  | { readonly success: false; readonly reason: "invalid" | "restricted" } => {
  const slug = normalizeVanityUrl(input);

  if (!slug || isOrganizationIdLike(slug)) {
    return { success: false, reason: "invalid" };
  }

  if (RESTRICTED_VANITY_URLS.has(slug)) {
    return { success: false, reason: "restricted" };
  }

  return { success: true, slug };
};
