import { foldText } from "@lootlog/domain/text-fold";

export const normalizeSearchText = (value: string): string =>
  foldText(value).toLowerCase().replace(/\s+/g, " ").trim();
