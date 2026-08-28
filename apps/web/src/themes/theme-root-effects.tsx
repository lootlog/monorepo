import { lazy, Suspense } from "react";
import { useThemeMeta } from "./use-theme-meta";

const RukiaFrostOverlay = lazy(() =>
  import("./rukia/rukia-frost-overlay").then((module) => ({
    default: module.RukiaFrostOverlay,
  })),
);

const RiasDestructionOverlay = lazy(() =>
  import("./rias/rias-destruction-overlay").then((module) => ({
    default: module.RiasDestructionOverlay,
  })),
);

export const ThemeRootEffects = () => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={null}>
        <RukiaFrostOverlay />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <RiasDestructionOverlay />
      </Suspense>
    );
  }
  return null;
};
