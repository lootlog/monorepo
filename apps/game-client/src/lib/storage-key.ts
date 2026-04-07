import { IS_DEV } from "@/config/app";

const PREFIX = IS_DEV ? "local:" : "";

export function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}
