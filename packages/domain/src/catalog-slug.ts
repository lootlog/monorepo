import { foldText, slug } from "./text-fold.js";

export const catalogSlug = (name: string) => slug(foldText(name));

export const catalogPageSegment = (entry: { id: number; name: string }) =>
  [entry.id, catalogSlug(entry.name)].filter(Boolean).join("-");
