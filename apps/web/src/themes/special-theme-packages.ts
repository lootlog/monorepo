import type { SpecialThemeId } from "@lootlog/types";

export type SpecialThemePackageFamily = "cat" | "rukia" | "rias";

interface SpecialThemePackageDescriptor {
  availability: "available" | "locked";
  family: SpecialThemePackageFamily;
}

export const SPECIAL_THEME_PACKAGES: Record<
  SpecialThemeId,
  SpecialThemePackageDescriptor
> = {
  "cat-pink": { availability: "available", family: "cat" },
  "cat-purple": { availability: "available", family: "cat" },
  "cat-blue": { availability: "available", family: "cat" },
  "cat-random": { availability: "available", family: "cat" },
  rukia: { availability: "available", family: "rukia" },
  rias: { availability: "available", family: "rias" },
};
