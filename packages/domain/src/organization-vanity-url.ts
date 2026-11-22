import { slug } from "./text-fold.js";

const RESTRICTED_VANITY_URLS = new Set(["battles"]);

export const isOrganizationIdLike = (value: string) => /^\d+$/.test(value);

export const normalizeVanityUrl = (input: string) => slug(input);

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
