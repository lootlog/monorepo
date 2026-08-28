import { lazy, Suspense } from "react";
import { useThemeMeta } from "./use-theme-meta";

const FrostOverlay = lazy(() =>
  import("./rukia/rukia-frost").then((module) => ({
    default: module.FrostOverlay,
  })),
);

const DestructionOverlay = lazy(() =>
  import("./rias/rias-effects").then((module) => ({
    default: module.DestructionOverlay,
  })),
);

export const ThemeSurfaceOverlay = ({
  subtle = false,
  rounded = "rounded-xl",
}: {
  subtle?: boolean;
  rounded?: string;
}) => {
  const { isRukiaTheme, isRiasTheme } = useThemeMeta();

  if (isRukiaTheme) {
    return (
      <Suspense fallback={null}>
        <FrostOverlay subtle={subtle} rounded={rounded} />
      </Suspense>
    );
  }
  if (isRiasTheme) {
    return (
      <Suspense fallback={null}>
        <DestructionOverlay subtle={subtle} rounded={rounded} />
      </Suspense>
    );
  }
  return null;
};
