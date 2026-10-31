import type { BuiltInThemeId } from "@lootlog/schema/custom-theme";

export type WallpaperCategory =
  | "themes"
  | "fantasy"
  | "abstract"
  | "seasons"
  | "anime";

export interface Wallpaper {
  id: string;
  category: WallpaperCategory;
  image: string;
  preview: string;
  /** A built-in theme's wallpaper is named after the theme. */
  themeId?: BuiltInThemeId;
}

const PHOTO_THEME_IDS = [
  "anime",
  "waguri",
  "halloween",
  "realmadrid",
  "realmadrid-3rd",
  "barcelona",
  "rukia",
  "rias",
] as const satisfies readonly BuiltInThemeId[];

const themeWallpapers: Wallpaper[] = PHOTO_THEME_IDS.map((themeId) => ({
  id: themeId,
  category: "themes",
  image: `/themes/${themeId}-bg.webp`,
  preview: `/themes/${themeId}-preview.webp`,
  themeId,
}));

const GENERATED_WALLPAPERS: Array<[string, WallpaperCategory]> = [
  ["fantasy-castle", "fantasy"],
  ["fantasy-dungeon", "fantasy"],
  ["fantasy-forest", "fantasy"],
  ["fantasy-mountains", "fantasy"],
  ["fantasy-tavern", "fantasy"],
  ["fantasy-dragon", "fantasy"],
  ["abstract-aurora", "abstract"],
  ["abstract-mist", "abstract"],
  ["abstract-gradient", "abstract"],
  ["abstract-geometric", "abstract"],
  ["abstract-waves", "abstract"],
  ["abstract-nebula", "abstract"],
  ["season-winter", "seasons"],
  ["season-spring", "seasons"],
  ["season-summer", "seasons"],
  ["season-autumn", "seasons"],
  ["season-christmas", "seasons"],
  ["season-halloween", "seasons"],
  ["anime-night-city", "anime"],
  ["anime-sakura", "anime"],
  ["anime-sky", "anime"],
  ["anime-shrine", "anime"],
  ["anime-train", "anime"],
  ["anime-rooftop", "anime"],
];

const generatedWallpapers: Wallpaper[] = GENERATED_WALLPAPERS.map(
  ([id, category]) => ({
    id,
    category,
    image: `/themes/wallpapers/${id}-bg.webp`,
    preview: `/themes/wallpapers/${id}-preview.webp`,
  }),
);

/** Every wallpaper a custom theme can pick, in the picker's order. */
export const WALLPAPERS: Wallpaper[] = [
  ...themeWallpapers,
  ...generatedWallpapers,
];

export const findWallpaper = (id: string) =>
  WALLPAPERS.find((wallpaper) => wallpaper.id === id);
