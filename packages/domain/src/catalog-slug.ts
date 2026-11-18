import { foldText, slug } from "./text-fold.js";

/** A name as a URL slug: `Łowczyni Wspomnień` → `lowczyni-wspomnien`. */
export const catalogSlug = (name: string) => slug(foldText(name));

/** A catalog page's URL segment: the id, then the name, `257037-barbatos`. */
export const catalogPageSegment = (entry: { id: number; name: string }) =>
  [entry.id, catalogSlug(entry.name)].filter(Boolean).join("-");
