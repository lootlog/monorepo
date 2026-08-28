import { lazy, Suspense } from "react";
import type { SurfaceDecorationSlot } from "@lootlog/ui/components/surface-decoration-context";
import { useThemeMeta } from "./use-theme-meta";

const CatPawOverlay = lazy(() =>
  import("@lootlog/ui/components/cat-paw-overlay").then((module) => ({
    default: module.CatPawOverlay,
  })),
);

const RukiaFrostCardOverlay = lazy(() =>
  import("@lootlog/ui/components/rukia-frost-card-overlay").then((module) => ({
    default: module.RukiaFrostCardOverlay,
  })),
);

const RiasMagicCardOverlay = lazy(() =>
  import("@lootlog/ui/components/rias-magic-card-overlay").then((module) => ({
    default: module.RiasMagicCardOverlay,
  })),
);

export const ThemeSurfaceDecoration = ({
  slot: _slot,
}: {
  slot: SurfaceDecorationSlot;
}) => {
  const { isCatTheme, isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isCatTheme) {
    return (
      <Suspense fallback={null}>
        <CatPawOverlay />
      </Suspense>
    );
  }
  if (isRukiaTheme) {
    return (
      <Suspense fallback={null}>
        <RukiaFrostCardOverlay />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <RiasMagicCardOverlay />
      </Suspense>
    );
  }
  return null;
};
