export const MONACO_ADDON_THEMES = [
  { id: "lootlog-addon-dark", label: "Lootlog Dark" },
  { id: "lootlog-dracula", label: "Dracula" },
  { id: "lootlog-github-dark", label: "GitHub Dark" },
] as const;

export type MonacoAddonThemeId = (typeof MONACO_ADDON_THEMES)[number]["id"];

export const DEFAULT_MONACO_ADDON_THEME: MonacoAddonThemeId =
  "lootlog-addon-dark";

export const isMonacoAddonThemeId = (
  value: string,
): value is MonacoAddonThemeId =>
  MONACO_ADDON_THEMES.some((theme) => theme.id === value);
