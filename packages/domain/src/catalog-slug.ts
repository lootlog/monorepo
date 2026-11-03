// Letters NFD does not split into a base letter and a mark.
const UNDECOMPOSED_LETTERS = new Map(
  Object.entries({ ł: "l", ß: "ss", æ: "ae", ø: "o", œ: "oe" }),
);

/** A name as a URL slug: `Łowczyni Wspomnień` → `lowczyni-wspomnien`. */
export const catalogSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .replace(/[łßæøœ]/g, (letter) => UNDECOMPOSED_LETTERS.get(letter) ?? letter)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** A catalog page's URL segment: the id, then the name, `257037-barbatos`. */
export const catalogPageSegment = (entry: { id: number; name: string }) =>
  [entry.id, catalogSlug(entry.name)].filter(Boolean).join("-");
