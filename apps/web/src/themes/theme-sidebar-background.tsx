import { lazy, Suspense } from "react";
import { useThemeMeta } from "./use-theme-meta";

const FrozenSidebarBackground = lazy(() =>
  import("./rukia/frozen-sidebar-background").then((module) => ({
    default: module.FrozenSidebarBackground,
  })),
);

const RiasSidebarBackground = lazy(() =>
  import("./rias/rias-sidebar-background").then((module) => ({
    default: module.RiasSidebarBackground,
  })),
);

export const ThemeSidebarBackground = () => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={null}>
        <FrozenSidebarBackground />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <RiasSidebarBackground />
      </Suspense>
    );
  }
  return null;
};
