const INHERITED_THEME_CLASS_NAMES = [
  "dark-theme",
  "ll-reduced-motion",
] as const;

export function getLootlogPortalContainer(): HTMLElement | undefined {
  return document.getElementById("lootlog-root") ?? undefined;
}

export function getLootlogHostPortalThemeClassName(): string {
  const lootlogRoot = getLootlogPortalContainer();
  const inheritedClassNames = INHERITED_THEME_CLASS_NAMES.filter((className) =>
    lootlogRoot?.classList.contains(className),
  );

  return ["ll-theme-boundary", ...inheritedClassNames].join(" ");
}
