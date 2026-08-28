import { lazy, Suspense } from "react";
import { useThemeMeta } from "./use-theme-meta";

const SidebarCatAnimation = lazy(() =>
  import("./cat/sidebar-cat-animation").then((module) => ({
    default: module.SidebarCatAnimation,
  })),
);

const SidebarMagicCircle = lazy(() =>
  import("./rias/sidebar-magic-circle").then((module) => ({
    default: module.SidebarMagicCircle,
  })),
);

export const ThemeSidebarFooterDecoration = () => {
  const { isCatTheme, isRiasTheme, resolvedTheme } = useThemeMeta();

  if (isCatTheme) {
    return (
      <Suspense fallback={null}>
        <SidebarCatAnimation theme={resolvedTheme} />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <SidebarMagicCircle />
      </Suspense>
    );
  }
  return null;
};
